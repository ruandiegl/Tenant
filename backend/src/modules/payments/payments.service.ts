import { PaymentStatus } from "@prisma/client";
import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { asaasClient } from "./asaas.client.js";

type PaymentMetadata = {
  paymentType?: string;
  asaasCustomerId?: string;
  asaasStatus?: string;
  invoiceUrl?: string | null;
  pixQrCode?: string | null;
  pixCopyPaste?: string | null;
  expiresAt?: string | null;
  externalReference?: string | null;
};

type PaymentWithMethod = {
  id: string;
  status: PaymentStatus;
  provider: string | null;
  providerPaymentId: string | null;
  metadata: unknown;
  method?: {
    type: string;
  } | null;
};

type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
    object?: string;
  };
};

function toPaymentMetadata(value: unknown): PaymentMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as PaymentMetadata;
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function mapWebhookEventToStatus(event: string): PaymentStatus | null {
  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
      return "PAID";
    case "PAYMENT_DELETED":
      return "CANCELLED";
    case "PAYMENT_REFUNDED":
      return "REFUNDED";
    case "PAYMENT_PARTIALLY_REFUNDED":
      return "PARTIALLY_REFUNDED";
    case "PAYMENT_OVERDUE":
      return "FAILED";
    case "PAYMENT_RESTORED":
    case "PAYMENT_CREATED":
      return "PENDING";
    default:
      return null;
  }
}

function shouldTransitionPaymentStatus(currentStatus: PaymentStatus, nextStatus: PaymentStatus) {
  if (currentStatus === nextStatus) return false;
  if (currentStatus === "PAID" && nextStatus === "PENDING") return false;
  if (currentStatus === "REFUNDED" && nextStatus !== "PARTIALLY_REFUNDED") return false;
  if (currentStatus === "CANCELLED" && nextStatus === "PENDING") return false;
  return true;
}

function safeCompare(secret: string, candidate: string) {
  const left = Buffer.from(secret);
  const right = Buffer.from(candidate);

  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function buildPublicPaymentSummary(payment: PaymentWithMethod | null | undefined) {
  if (!payment) return null;

  const metadata = toPaymentMetadata(payment.metadata);

  return {
    status: payment.status,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    paymentType: metadata.paymentType ?? payment.method?.type ?? null,
    invoiceUrl: metadata.invoiceUrl ?? null,
    pixQrCode: metadata.pixQrCode ?? null,
    pixCopyPaste: metadata.pixCopyPaste ?? null,
    expiresAt: metadata.expiresAt ?? null
  };
}

export async function createPixPaymentForOrder(params: {
  tenantId: string;
  orderId: string;
  publicCode: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  total: number;
}) {
  if (!env.ASAAS_API_KEY) {
    throw new AppError("Pagamento PIX indisponivel no momento.", 503);
  }

  const payment = await prisma.payment.create({
    data: {
      tenantId: params.tenantId,
      orderId: params.orderId,
      provider: "ASAAS",
      amount: params.total,
      status: "PENDING",
      metadata: {
        paymentType: "PIX"
      }
    }
  });

  const customerPayload = {
    name: params.customerName,
    mobilePhone: params.customerPhone || undefined,
    email: params.customerEmail || undefined,
    externalReference: `tenant:${params.tenantId}:order:${params.orderId}`,
    notificationDisabled: true
  };

  const dueDate = formatDateOnly(addDays(new Date(), env.ASAAS_PIX_DUE_DAYS));
  const paymentPayload = {
    customer: "",
    billingType: "PIX" as const,
    value: params.total,
    dueDate,
    description: `Pedido ${params.publicCode}`,
    externalReference: `order:${params.orderId}`
  };

  try {
    const customer = await asaasClient.createCustomer(customerPayload);
    paymentPayload.customer = customer.id;

    const createdPayment = await asaasClient.createPixPayment(paymentPayload);
    const pixQrCode = await asaasClient.getPixQrCode(createdPayment.id);

    const metadata: PaymentMetadata = {
      paymentType: "PIX",
      asaasCustomerId: customer.id,
      asaasStatus: createdPayment.status,
      invoiceUrl: createdPayment.invoiceUrl ?? null,
      pixQrCode: pixQrCode.encodedImage ?? null,
      pixCopyPaste: pixQrCode.payload ?? null,
      expiresAt: pixQrCode.expirationDate ?? null,
      externalReference: paymentPayload.externalReference
    };

    const updated = await prisma.$transaction(async (tx) => {
      const nextPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId: createdPayment.id,
          metadata
        }
      });

      await tx.paymentAttempt.create({
        data: {
          tenantId: params.tenantId,
          paymentId: payment.id,
          status: nextPayment.status,
          requestPayload: {
            customer: customerPayload,
            payment: paymentPayload
          },
          responsePayload: {
            customer,
            payment: createdPayment,
            pixQrCode
          }
        }
      });

      return nextPayment;
    });

    return buildPublicPaymentSummary(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar cobranca PIX.";

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          metadata: {
            paymentType: "PIX"
          }
        }
      });

      await tx.paymentAttempt.create({
        data: {
          tenantId: params.tenantId,
          paymentId: payment.id,
          status: "FAILED",
          requestPayload: {
            customer: customerPayload,
            payment: paymentPayload
          },
          errorMessage: message
        }
      });

      await tx.order.update({
        where: { id: params.orderId },
        data: {
          paymentStatus: "FAILED"
        }
      });
    });

    throw error;
  }
}

export async function handleAsaasWebhook(body: unknown, headers: Record<string, string | string[] | undefined>) {
  if (!env.ASAAS_WEBHOOK_TOKEN) {
    throw new AppError("Webhook Asaas nao configurado.", 503);
  }

  const receivedToken = headers["asaas-access-token"];
  const candidate = Array.isArray(receivedToken) ? receivedToken[0] : receivedToken;

  if (!candidate || !safeCompare(env.ASAAS_WEBHOOK_TOKEN, candidate)) {
    throw new AppError("Webhook Asaas nao autorizado.", 401);
  }

  const payload = body as AsaasWebhookPayload;

  if (!payload?.id || !payload?.event || !payload?.payment?.id) {
    throw new AppError("Payload de webhook Asaas invalido.", 400);
  }

  const duplicate = await prisma.webhookEvent.findFirst({
    where: {
      provider: "ASAAS",
      externalId: payload.id
    }
  });

  if (duplicate?.processedAt) {
    return { received: true, duplicate: true };
  }

  const localPayment = await prisma.payment.findFirst({
    where: {
      provider: "ASAAS",
      providerPaymentId: payload.payment.id
    }
  });

  const webhookEvent =
    duplicate ??
    (await prisma.webhookEvent.create({
      data: {
        tenantId: localPayment?.tenantId,
        provider: "ASAAS",
        eventType: payload.event,
        externalId: payload.id,
        payload
      }
    }));

  if (!localPayment) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processedAt: new Date(),
        error: "Pagamento local nao encontrado."
      }
    });

    return { received: true, ignored: true };
  }

  const nextStatus = mapWebhookEventToStatus(payload.event);

  if (!nextStatus) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        tenantId: localPayment.tenantId,
        processedAt: new Date(),
        error: null
      }
    });

    return { received: true, ignored: true };
  }

  await prisma.$transaction(async (tx) => {
    const currentPayment = await tx.payment.findUniqueOrThrow({ where: { id: localPayment.id } });
    const metadata = toPaymentMetadata(currentPayment.metadata);

    if (shouldTransitionPaymentStatus(currentPayment.status, nextStatus)) {
      await tx.payment.update({
        where: { id: currentPayment.id },
        data: {
          status: nextStatus,
          paidAt: nextStatus === "PAID" ? new Date() : currentPayment.paidAt,
          failedAt: nextStatus === "FAILED" ? new Date() : currentPayment.failedAt,
          refundedAt: nextStatus === "REFUNDED" || nextStatus === "PARTIALLY_REFUNDED" ? new Date() : currentPayment.refundedAt,
          metadata: {
            ...metadata,
            asaasStatus: payload.event
          }
        }
      });

      await tx.order.update({
        where: { id: currentPayment.orderId },
        data: {
          paymentStatus: nextStatus
        }
      });
    }

    await tx.paymentAttempt.create({
      data: {
        tenantId: currentPayment.tenantId,
        paymentId: currentPayment.id,
        status: nextStatus,
        responsePayload: payload
      }
    });

    await tx.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        tenantId: currentPayment.tenantId,
        processedAt: new Date(),
        error: null
      }
    });
  });

  return { received: true };
}
