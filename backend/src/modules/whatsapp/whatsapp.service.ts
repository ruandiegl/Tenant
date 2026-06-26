import { OrderStatus, Prisma, WhatsappSessionStatus } from "@prisma/client";
import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { wahaQrRequest, wahaRequest } from "./waha.client.js";

type WahaWebhookBody = {
  event?: string;
  type?: string;
  session?: string;
  payload?: Record<string, unknown>;
  me?: Record<string, unknown>;
  [key: string]: unknown;
};

type SessionSettingsInput = {
  autoReplyEnabled?: boolean;
  notifyOrderStatus?: boolean;
  welcomeMessage?: string | null;
};

type SessionWithTenant = Prisma.WhatsappSessionGetPayload<{
  include: { tenant: { include: { settings: true } } };
}>;

const SESSION_PREFIX = "podepedir";

const sessionNameForTenant = (slug: string) =>
  `${SESSION_PREFIX}-${slug}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toChatId = (phone: string) => {
  if (phone.includes("@")) {
    return phone;
  }

  const digits = phone.replace(/\D/g, "");
  return `${digits}@c.us`;
};

const phoneFromChatId = (chatId: string) => chatId.replace(/@.*/, "").replace(/\D/g, "");

const asString = (value: unknown) => (typeof value === "string" ? value : undefined);

const normalizeWahaStatus = (status?: string): WhatsappSessionStatus => {
  const upper = status?.toUpperCase();

  if (!upper) return "DISCONNECTED";
  if (["WORKING", "CONNECTED", "AUTHENTICATED"].includes(upper)) return "CONNECTED";
  if (["SCAN_QR_CODE", "SCAN_QR", "STARTING"].includes(upper)) return "PENDING_QR";
  if (["FAILED", "ERROR"].includes(upper)) return "ERROR";

  return "DISCONNECTED";
};

const publicMenuUrl = (tenantSlug: string) => `${env.FRONTEND_URL.replace(/\/$/, "")}/${tenantSlug}/menu`;

const defaultWelcomeMessage = (tenant: { name: string; slug: string; settings: { brandName: string | null; welcomeMessage: string | null } | null }) =>
  tenant.settings?.welcomeMessage ||
  `Ola! Voce esta falando com ${tenant.settings?.brandName ?? tenant.name}. Para fazer seu pedido, acesse ${publicMenuUrl(tenant.slug)}.`;

const orderStatusMessage = (order: {
  publicCode: string;
  status: OrderStatus;
  tenant: { name: string; slug: string; settings: { brandName: string | null } | null };
}) => {
  const restaurantName = order.tenant.settings?.brandName ?? order.tenant.name;
  const trackingUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/${order.tenant.slug}/pedido/${order.publicCode}`;
  const messages: Partial<Record<OrderStatus, string>> = {
    PLACED: `${restaurantName}: recebemos seu pedido #${order.publicCode}. Acompanhe em ${trackingUrl}`,
    ACCEPTED: `${restaurantName}: seu pedido #${order.publicCode} foi aceito.`,
    PREPARING: `${restaurantName}: seu pedido #${order.publicCode} esta em preparo.`,
    READY: `${restaurantName}: seu pedido #${order.publicCode} esta pronto.`,
    DISPATCHED: `${restaurantName}: seu pedido #${order.publicCode} saiu para entrega.`,
    DELIVERED: `${restaurantName}: seu pedido #${order.publicCode} foi entregue. Obrigado!`,
    COMPLETED: `${restaurantName}: seu pedido #${order.publicCode} foi concluido. Obrigado!`,
    CANCELLED: `${restaurantName}: seu pedido #${order.publicCode} foi cancelado.`,
    REJECTED: `${restaurantName}: nao conseguimos aceitar o pedido #${order.publicCode}.`
  };

  return messages[order.status];
};

const getExternalId = (payload: Record<string, unknown>) => {
  const id = payload.id;

  if (typeof id === "string") return id;
  if (id && typeof id === "object" && "_serialized" in id) return asString((id as Record<string, unknown>)._serialized);

  return undefined;
};

const timingSafeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyWebhookSecret = (rawBody: Buffer | undefined, headers: Record<string, string | string[] | undefined>, querySecret?: string) => {
  if (!env.WAHA_WEBHOOK_SECRET) return;

  if (querySecret && timingSafeEqual(querySecret, env.WAHA_WEBHOOK_SECRET)) return;

  const signatureHeader =
    headers["x-waha-signature"] ??
    headers["x-webhook-hmac-sha256"] ??
    headers["x-hub-signature-256"] ??
    headers["x-signature"];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

  if (!signature || !rawBody) {
    throw new AppError("Invalid WAHA webhook signature", 401);
  }

  const received = signature.replace(/^sha256=/, "");
  const expected = crypto.createHmac("sha256", env.WAHA_WEBHOOK_SECRET).update(rawBody).digest("hex");

  if (!timingSafeEqual(received, expected)) {
    throw new AppError("Invalid WAHA webhook signature", 401);
  }
};

const getWahaStatus = (error: unknown) =>
  error instanceof AppError && error.details && typeof error.details === "object" && "wahaStatus" in error.details
    ? Number((error.details as { wahaStatus?: unknown }).wahaStatus)
    : undefined;

const syncSessionStatusFromWaha = async (session: NonNullable<Awaited<ReturnType<typeof prisma.whatsappSession.findUnique>>>) => {
  const wahaSession = await wahaRequest<Record<string, unknown>>(`/api/sessions/${encodeURIComponent(session.sessionName)}`);
  const nextStatus = normalizeWahaStatus(asString(wahaSession.status));
  const me = wahaSession.me && typeof wahaSession.me === "object" ? (wahaSession.me as Record<string, unknown>) : null;
  const now = new Date();

  return prisma.whatsappSession.update({
    where: { id: session.id },
    data: {
      status: nextStatus,
      qrCode: nextStatus === "CONNECTED" ? null : session.qrCode,
      phoneNumber: asString(me?.id)?.replace(/@.*/, "") ?? session.phoneNumber,
      displayName: asString(me?.pushName) ?? session.displayName,
      connectedAt: nextStatus === "CONNECTED" ? session.connectedAt ?? now : session.connectedAt,
      disconnectedAt: nextStatus === "DISCONNECTED" ? now : session.disconnectedAt,
      lastStatusAt: now,
      lastError: nextStatus === "CONNECTED" ? null : session.lastError
    }
  });
};

export const mapSession = (session: Awaited<ReturnType<typeof prisma.whatsappSession.findUnique>>) =>
  session
    ? {
        id: session.id,
        tenantId: session.tenantId,
        sessionName: session.sessionName,
        phoneNumber: session.phoneNumber,
        displayName: session.displayName,
        status: session.status,
        qrCode: session.qrCode,
        autoReplyEnabled: session.autoReplyEnabled,
        notifyOrderStatus: session.notifyOrderStatus,
        welcomeMessage: session.welcomeMessage,
        lastStatusAt: session.lastStatusAt,
        connectedAt: session.connectedAt,
        disconnectedAt: session.disconnectedAt,
        lastError: session.lastError,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    : null;

export const getSession = async (tenantId: string) => {
  const session = await prisma.whatsappSession.findUnique({ where: { tenantId } });

  if (!session) {
    return null;
  }

  const synced = await syncSessionStatusFromWaha(session).catch(async (error) => {
    if (getWahaStatus(error) === 404) {
      return prisma.whatsappSession.update({
        where: { id: session.id },
        data: {
          status: "DISCONNECTED",
          qrCode: null,
          phoneNumber: null,
          displayName: null,
          lastStatusAt: new Date()
        }
      });
    }

    return session;
  });
  return mapSession(synced);
};

export const createOrStartSession = async (tenantId: string): Promise<ReturnType<typeof mapSession>> => {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null }, include: { settings: true } });

  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  const sessionName = sessionNameForTenant(tenant.slug);
  const webhookUrl = `${env.PUBLIC_BACKEND_URL.replace(/\/$/, "")}/public/webhooks/waha${
    env.WAHA_WEBHOOK_SECRET ? `?secret=${encodeURIComponent(env.WAHA_WEBHOOK_SECRET)}` : ""
  }`;

  const session = await prisma.whatsappSession.upsert({
    where: { tenantId },
    create: {
      tenantId,
      sessionName,
      status: "PENDING_QR",
      welcomeMessage: defaultWelcomeMessage(tenant)
    },
    update: {
      sessionName,
      status: "PENDING_QR",
      lastError: null,
      lastStatusAt: new Date()
    }
  });

  const webhooks = [
    {
      url: webhookUrl,
      events: ["message", "session.status"]
    }
  ];

  try {
    await wahaRequest("/api/sessions", {
      method: "POST",
      body: {
        name: sessionName,
        start: true,
        config: {
          webhooks
        }
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create WAHA session";

    if (getWahaStatus(error) === 404) {
      const nextMessage = `WAHA API nao encontrada em ${env.WAHA_BASE_URL}. Confirme se o WAHA esta rodando nessa URL e nao outro servico.`;
      await prisma.whatsappSession.update({ where: { id: session.id }, data: { status: "ERROR", lastError: nextMessage } });
      throw new AppError(nextMessage, 502);
    }

    if (getWahaStatus(error) !== 422 && !message.includes("409") && !message.toLowerCase().includes("already")) {
      await prisma.whatsappSession.update({ where: { id: session.id }, data: { status: "ERROR", lastError: message } });
      throw error;
    }

    await wahaRequest(`/api/sessions/${encodeURIComponent(sessionName)}`, {
      method: "PUT",
      body: {
        config: {
          webhooks
        }
      }
    });
    await wahaRequest(`/api/sessions/${encodeURIComponent(sessionName)}/start`, { method: "POST" });
  }

  try {
    return await refreshSessionQr(tenantId);
  } catch (error) {
    const updated = await prisma.whatsappSession.update({
      where: { id: session.id },
      data: {
        status: "PENDING_QR",
        lastStatusAt: new Date(),
        lastError: error instanceof Error ? error.message : "QR Code ainda nao disponivel no WAHA"
      }
    });

    return mapSession(updated);
  }
};

export const refreshSessionQr = async (tenantId: string): Promise<ReturnType<typeof mapSession>> => {
  const session = await prisma.whatsappSession.findUnique({ where: { tenantId } });

  if (!session) {
    throw new AppError("WhatsApp session not found", 404);
  }

  const syncedSession = await syncSessionStatusFromWaha(session).catch(async (error) => {
    if (getWahaStatus(error) === 404) {
      return null;
    }

    return session;
  });

  if (!syncedSession) {
    return createOrStartSession(tenantId);
  }

  if (syncedSession.status === "CONNECTED") {
    return mapSession(syncedSession);
  }

  const qrPath = `/api/${encodeURIComponent(session.sessionName)}/auth/qr?format=image`;
  let response: unknown;

  try {
    response = await wahaQrRequest(qrPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("Session status is not as expected") || message.includes('"status":"WORKING"')) {
      const connected = await prisma.whatsappSession.update({
        where: { id: session.id },
        data: {
          status: "CONNECTED",
          qrCode: null,
          connectedAt: session.connectedAt ?? new Date(),
          lastStatusAt: new Date(),
          lastError: null
        }
      });

      return mapSession(connected);
    }

    if (getWahaStatus(error) !== 404) {
      throw error;
    }

    response = await wahaQrRequest(qrPath, "POST");
  }
  const qrCode =
    typeof response === "string"
      ? response
      : asString((response as Record<string, unknown>).qr) ??
        asString((response as Record<string, unknown>).qrCode) ??
        asString((response as Record<string, unknown>).image);

  const updated = await prisma.whatsappSession.update({
    where: { id: session.id },
    data: {
      qrCode,
      status: qrCode ? "PENDING_QR" : session.status,
      lastStatusAt: new Date(),
      lastError: null
    }
  });

  return mapSession(updated);
};

export const stopSession = async (tenantId: string) => {
  const session = await prisma.whatsappSession.findUnique({ where: { tenantId } });

  if (!session) {
    throw new AppError("WhatsApp session not found", 404);
  }

  await wahaRequest(`/api/sessions/${encodeURIComponent(session.sessionName)}`, { method: "DELETE" }).catch(async (error) => {
    if (getWahaStatus(error) !== 404) {
      throw error;
    }
  });

  const updated = await prisma.whatsappSession.update({
    where: { id: session.id },
    data: {
      status: "DISCONNECTED",
      qrCode: null,
      phoneNumber: null,
      displayName: null,
      disconnectedAt: new Date(),
      lastStatusAt: new Date(),
      lastError: null
    }
  });

  return mapSession(updated);
};

export const updateSettings = async (tenantId: string, data: SessionSettingsInput) => {
  const session = await prisma.whatsappSession.findUnique({ where: { tenantId } });

  if (!session) {
    throw new AppError("WhatsApp session not found", 404);
  }

  const updated = await prisma.whatsappSession.update({
    where: { id: session.id },
    data: {
      autoReplyEnabled: data.autoReplyEnabled,
      notifyOrderStatus: data.notifyOrderStatus,
      welcomeMessage: data.welcomeMessage
    }
  });

  return mapSession(updated);
};

export const sendTextMessage = async (tenantId: string, phone: string, text: string) => {
  const session = await prisma.whatsappSession.findUnique({ where: { tenantId } });

  if (!session) {
    throw new AppError("WhatsApp session not found", 404);
  }

  if (session.status !== "CONNECTED") {
    throw new AppError("WhatsApp session is not connected", 409);
  }

  const chatId = toChatId(phone);
  const response = await wahaRequest<Record<string, unknown>>("/api/sendText", {
    method: "POST",
    body: {
      session: session.sessionName,
      chatId,
      text
    }
  });

  await prisma.whatsappMessage.create({
    data: {
      tenantId,
      sessionId: session.id,
      direction: "OUTBOUND",
      chatId,
      to: chatId,
      body: text,
      rawPayload: response as Prisma.InputJsonObject,
      sentAt: new Date()
    }
  });

  return { sent: true };
};

export const handleWebhook = async (
  body: WahaWebhookBody,
  rawBody: Buffer | undefined,
  headers: Record<string, string | string[] | undefined>,
  querySecret?: string
) => {
  verifyWebhookSecret(rawBody, headers, querySecret);

  const eventType = body.event ?? body.type ?? "message";
  const payload = (body.payload ?? body) as Record<string, unknown>;
  const sessionName = body.session ?? asString(payload.session) ?? asString(payload.sessionName);
  const session = sessionName ? await prisma.whatsappSession.findUnique({ where: { sessionName }, include: { tenant: { include: { settings: true } } } }) : null;

  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      tenantId: session?.tenantId,
      provider: "waha",
      eventType,
      externalId: getExternalId(payload),
      payload: body as Prisma.InputJsonObject
    }
  });

  if (!session) {
    await prisma.webhookEvent.update({ where: { id: webhookEvent.id }, data: { processedAt: new Date(), error: "Session not found" } });
    return { received: true };
  }

  if (eventType.includes("session")) {
    const nextStatus = normalizeWahaStatus(asString(payload.status));
    await prisma.whatsappSession.update({
      where: { id: session.id },
      data: {
        status: nextStatus,
        qrCode: nextStatus === "CONNECTED" ? null : session.qrCode,
        phoneNumber: asString(payload.me) ?? session.phoneNumber,
        connectedAt: nextStatus === "CONNECTED" ? new Date() : session.connectedAt,
        disconnectedAt: nextStatus === "DISCONNECTED" ? new Date() : session.disconnectedAt,
        lastStatusAt: new Date()
      }
    });
  }

  if (eventType.includes("message")) {
    await handleIncomingMessage(session, payload);
  }

  await prisma.webhookEvent.update({ where: { id: webhookEvent.id }, data: { processedAt: new Date() } });
  return { received: true };
};

const handleIncomingMessage = async (
  session: SessionWithTenant,
  payload: Record<string, unknown>
) => {
  const chatId = asString(payload.chatId) ?? asString(payload.from) ?? asString(payload.to);

  if (!chatId || chatId.endsWith("@g.us")) return;

  const fromMe = Boolean(payload.fromMe);
  const body = asString(payload.body) ?? asString(payload.text);
  const contactPhone = phoneFromChatId(chatId);
  const contactName = asString(payload.pushName) ?? asString(payload.notifyName);
  const receivedAt = typeof payload.timestamp === "number" ? new Date(payload.timestamp * 1000) : new Date();
  const customer = contactPhone
    ? await prisma.customer.findFirst({ where: { tenantId: session.tenantId, phone: contactPhone } })
    : null;
  const nextCustomer =
    customer ??
    (contactPhone
      ? await prisma.customer.create({
          data: {
            tenantId: session.tenantId,
            name: contactName ?? contactPhone,
            phone: contactPhone
          }
        })
      : null);

  const conversation = await prisma.whatsappConversation.upsert({
    where: { sessionId_chatId: { sessionId: session.id, chatId } },
    create: {
      tenantId: session.tenantId,
      sessionId: session.id,
      customerId: nextCustomer?.id,
      contactPhone,
      contactName,
      chatId,
      lastMessageAt: receivedAt
    },
    update: {
      customerId: nextCustomer?.id,
      contactName,
      lastMessageAt: receivedAt
    }
  });

  const externalId = getExternalId(payload);

  await prisma.whatsappMessage
    .create({
      data: {
        tenantId: session.tenantId,
        sessionId: session.id,
        conversationId: conversation.id,
        externalId,
        direction: fromMe ? "OUTBOUND" : "INBOUND",
        chatId,
        from: asString(payload.from),
        to: asString(payload.to),
        body,
        messageType: asString(payload.type),
        rawPayload: payload as Prisma.InputJsonObject,
        receivedAt: fromMe ? undefined : receivedAt,
        sentAt: fromMe ? receivedAt : undefined
      }
    })
    .catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
      throw error;
    });

  if (!fromMe && session.autoReplyEnabled && body) {
    await sendTextMessage(session.tenantId, chatId, session.welcomeMessage || defaultWelcomeMessage(session.tenant)).catch(async (error) => {
      await prisma.whatsappSession.update({
        where: { id: session.id },
        data: { lastError: error instanceof Error ? error.message : "Could not send WhatsApp auto reply" }
      });
    });
  }
};

export const notifyOrderStatusChanged = async (tenantId: string, orderId: string) => {
  const session = await prisma.whatsappSession.findUnique({ where: { tenantId } });

  if (!session || !session.notifyOrderStatus || session.status !== "CONNECTED") return;

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId }
  });
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { settings: true } });

  if (!order?.customerPhone || !tenant) return;

  const message = orderStatusMessage({ publicCode: order.publicCode, status: order.status, tenant });
  if (!message) return;

  await sendTextMessage(tenantId, order.customerPhone, message).catch(async (error) => {
    await prisma.whatsappSession.update({
      where: { id: session.id },
      data: { lastError: error instanceof Error ? error.message : "Could not send order notification" }
    });
  });
};
