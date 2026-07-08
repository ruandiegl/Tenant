import { OrderStatus, Prisma, WhatsappSessionStatus, WhatsappTemplateTrigger } from "@prisma/client";
import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { getSocketServer } from "../../config/socket.js";
import { AppError } from "../../shared/errors/app-error.js";
import { wahaBaseUrl, wahaQrRequest, wahaRequest, wahaRequestWithMeta } from "./waha.client.js";

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

type TemplateUpdateInput = {
  title?: string;
  body?: string;
  enabled?: boolean;
};

type TemplateVariables = Record<string, string | number | null | undefined>;

type SendTextMessageOptions = {
  source?: "test" | "auto_reply" | "order_status" | "manual";
};

const SESSION_PREFIX = "podepedir";
const AUTO_REPLY_COOLDOWN_MS = 2 * 60_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DEFAULT_TEMPLATES: Array<{
  trigger: WhatsappTemplateTrigger;
  title: string;
  body: string;
  sortOrder: number;
}> = [
  {
    trigger: "WELCOME",
    title: "Saudacao automatica",
    body: "Ola! Voce esta falando com {restaurante}. Para fazer seu pedido, acesse {cardapio}.",
    sortOrder: 10
  },
  {
    trigger: "ORDER_PLACED",
    title: "Pedido recebido",
    body: "{restaurante}: recebemos seu pedido #{codigo}. Acompanhe em {rastreamento}",
    sortOrder: 20
  },
  {
    trigger: "ORDER_ACCEPTED",
    title: "Pedido aceito",
    body: "{restaurante}: seu pedido #{codigo} foi aceito.",
    sortOrder: 30
  },
  {
    trigger: "ORDER_PREPARING",
    title: "Em preparo",
    body: "{restaurante}: seu pedido #{codigo} esta em preparo.",
    sortOrder: 40
  },
  {
    trigger: "ORDER_READY",
    title: "Pedido pronto",
    body: "{restaurante}: seu pedido #{codigo} esta pronto.",
    sortOrder: 50
  },
  {
    trigger: "ORDER_DISPATCHED",
    title: "Saiu para entrega",
    body: "{restaurante}: seu pedido #{codigo} saiu para entrega.",
    sortOrder: 60
  },
  {
    trigger: "ORDER_DELIVERED",
    title: "Pedido entregue",
    body: "{restaurante}: seu pedido #{codigo} foi entregue. Obrigado!",
    sortOrder: 70
  },
  {
    trigger: "ORDER_COMPLETED",
    title: "Pedido concluido",
    body: "{restaurante}: seu pedido #{codigo} foi concluido. Obrigado!",
    sortOrder: 80
  },
  {
    trigger: "ORDER_CANCELLED",
    title: "Pedido cancelado",
    body: "{restaurante}: seu pedido #{codigo} foi cancelado.",
    sortOrder: 90
  },
  {
    trigger: "ORDER_REJECTED",
    title: "Pedido recusado",
    body: "{restaurante}: nao conseguimos aceitar o pedido #{codigo}.",
    sortOrder: 100
  }
];

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

const getSerializedId = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  return asString(record._serialized) ?? asString(record.id) ?? asString(record.remote);
};

const getExternalId = (payload: Record<string, unknown>) => {
  const id = payload.id;

  const direct =
    getSerializedId(id) ??
    asString(payload.messageId) ??
    asString(payload.externalId) ??
    getSerializedId((payload._data as Record<string, unknown> | undefined)?.id) ??
    getSerializedId((payload.message as Record<string, unknown> | undefined)?.id);

  if (direct) return direct;

  return undefined;
};

const getStableMessageId = (sessionName: string, payload: Record<string, unknown>) => {
  const externalId = getExternalId(payload);

  if (externalId) return externalId;

  const stablePayload = {
    sessionName,
    chatId: asString(payload.chatId) ?? asString(payload.from) ?? asString(payload.to),
    from: asString(payload.from),
    to: asString(payload.to),
    fromMe: Boolean(payload.fromMe),
    timestamp: payload.timestamp,
    type: asString(payload.type),
    body: asString(payload.body) ?? asString(payload.text)
  };

  return `hash:${crypto.createHash("sha256").update(JSON.stringify(stablePayload)).digest("hex")}`;
};

const getPayloadQrCode = (payload: Record<string, unknown>) =>
  asString(payload.qr) ?? asString(payload.qrCode) ?? asString(payload.image);

const logWhatsapp = (level: "info" | "warn" | "error", message: string, meta: Record<string, unknown> = {}) => {
  const safeMeta = {
    ...meta,
    body: undefined,
    text: undefined,
    token: undefined,
    secret: undefined
  };

  console[level](`[whatsapp] ${message}`, safeMeta);
};

const maskIdentifier = (value: string) => {
  const [id, suffix] = value.split("@");
  const visible = id.slice(-4);
  const masked = `${"*".repeat(Math.max(id.length - visible.length, 0))}${visible}`;

  return suffix ? `${masked}@${suffix}` : masked;
};

const getErrorDetails = (error: unknown) =>
  error instanceof AppError && error.details && typeof error.details === "object"
    ? (error.details as Record<string, unknown>)
    : {};

const getWahaErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "WhatsApp send failed");

const timingSafeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyWebhookSecret = (rawBody: Buffer | undefined, headers: Record<string, string | string[] | undefined>, querySecret?: string) => {
  if (!env.WAHA_WEBHOOK_SECRET) return;

  const webhookSecret = env.WAHA_WEBHOOK_SECRET;

  if (querySecret && timingSafeEqual(querySecret, webhookSecret)) return;

  const webhookHmacHeader = headers["x-webhook-hmac"];
  const webhookHmacAlgorithmHeader = headers["x-webhook-hmac-algorithm"];
  const signatureHeader = webhookHmacHeader ?? headers["x-waha-signature"] ?? headers["x-webhook-hmac-sha256"] ?? headers["x-hub-signature-256"] ?? headers["x-signature"];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

  if (!signature || !rawBody) {
    throw new AppError("Invalid WAHA webhook signature", 401);
  }

  const received = signature.replace(/^sha(256|512)=/, "");
  const requestedAlgorithm = Array.isArray(webhookHmacAlgorithmHeader) ? webhookHmacAlgorithmHeader[0] : webhookHmacAlgorithmHeader;
  const algorithms = webhookHmacHeader ? [requestedAlgorithm === "sha256" ? "sha256" : "sha512"] : ["sha256", "sha512"];
  const matchesSignature = algorithms.some((algorithm) => {
    const expected = crypto.createHmac(algorithm, webhookSecret).update(rawBody).digest("hex");

    return timingSafeEqual(received, expected);
  });

  if (!matchesSignature) {
    throw new AppError("Invalid WAHA webhook signature", 401);
  }
};

const getWahaStatus = (error: unknown) =>
  error instanceof AppError && error.details && typeof error.details === "object" && "wahaStatus" in error.details
    ? Number((error.details as { wahaStatus?: unknown }).wahaStatus)
    : undefined;

const triggerForOrderStatus = (status: OrderStatus): WhatsappTemplateTrigger | null => {
  const triggers: Partial<Record<OrderStatus, WhatsappTemplateTrigger>> = {
    PLACED: "ORDER_PLACED",
    ACCEPTED: "ORDER_ACCEPTED",
    PREPARING: "ORDER_PREPARING",
    READY: "ORDER_READY",
    DISPATCHED: "ORDER_DISPATCHED",
    DELIVERED: "ORDER_DELIVERED",
    COMPLETED: "ORDER_COMPLETED",
    CANCELLED: "ORDER_CANCELLED",
    REJECTED: "ORDER_REJECTED"
  };

  return triggers[status] ?? null;
};

const renderTemplate = (body: string, variables: TemplateVariables) =>
  body.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => String(variables[key] ?? ""));

const templateVariablesForTenant = (tenant: { name: string; slug: string; settings: { brandName: string | null } | null }) => ({
  restaurante: tenant.settings?.brandName ?? tenant.name,
  cardapio: publicMenuUrl(tenant.slug)
});

const ensureDefaultTemplates = async (tenantId: string, sessionId: string) => {
  await prisma.$transaction(
    DEFAULT_TEMPLATES.map((template) =>
      prisma.whatsappMessageTemplate.upsert({
        where: { sessionId_trigger: { sessionId, trigger: template.trigger } },
        create: {
          tenantId,
          sessionId,
          trigger: template.trigger,
          title: template.title,
          body: template.body,
          sortOrder: template.sortOrder
        },
        update: {}
      })
    )
  );
};

const getRenderedTemplate = async (sessionId: string, trigger: WhatsappTemplateTrigger, variables: TemplateVariables) => {
  const template = await prisma.whatsappMessageTemplate.findUnique({
    where: { sessionId_trigger: { sessionId, trigger } }
  });

  if (template && !template.enabled) return "";

  const fallback = DEFAULT_TEMPLATES.find((item) => item.trigger === trigger);
  const body = template?.body || fallback?.body;

  if (!body) return null;

  return renderTemplate(body, variables).trim();
};

const syncSessionStatusFromWaha = async (session: NonNullable<Awaited<ReturnType<typeof prisma.whatsappSession.findUnique>>>) => {
  const wahaSession = await wahaRequest<Record<string, unknown>>(`/api/sessions/${encodeURIComponent(session.sessionName)}`);
  const nextStatus = normalizeWahaStatus(asString(wahaSession.status));
  const me = wahaSession.me && typeof wahaSession.me === "object" ? (wahaSession.me as Record<string, unknown>) : null;

  return updateSessionFromWahaStatus(session, nextStatus, {
    phoneNumber: asString(me?.id)?.replace(/@.*/, ""),
    displayName: asString(me?.pushName)
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

const emitSessionUpdate = (session: NonNullable<Awaited<ReturnType<typeof prisma.whatsappSession.findUnique>>>, event = "whatsapp.session_updated") => {
  const mapped = mapSession(session);
  getSocketServer()?.to(`tenant:${session.tenantId}`).emit(event, mapped);
  if (event !== "whatsapp.session_updated") {
    getSocketServer()?.to(`tenant:${session.tenantId}`).emit("whatsapp.session_updated", mapped);
  }
};

const updateSessionFromWahaStatus = async (
  session: NonNullable<Awaited<ReturnType<typeof prisma.whatsappSession.findUnique>>>,
  nextStatus: WhatsappSessionStatus,
  input: { qrCode?: string | null; phoneNumber?: string | null; displayName?: string | null; lastError?: string | null } = {}
) => {
  const now = new Date();
  const shouldIgnorePendingQr = session.status === "CONNECTED" && nextStatus === "PENDING_QR";

  if (shouldIgnorePendingQr) {
    logWhatsapp("info", "ignored stale QR status for connected session", {
      tenantId: session.tenantId,
      sessionName: session.sessionName,
      currentStatus: session.status,
      nextStatus
    });
    return session;
  }

  const updated = await prisma.whatsappSession.update({
    where: { id: session.id },
    data: {
      status: nextStatus,
      qrCode: nextStatus === "CONNECTED" ? null : input.qrCode ?? session.qrCode,
      phoneNumber: input.phoneNumber ?? session.phoneNumber,
      displayName: input.displayName ?? session.displayName,
      connectedAt: nextStatus === "CONNECTED" ? session.connectedAt ?? now : session.connectedAt,
      disconnectedAt: nextStatus === "DISCONNECTED" ? now : session.disconnectedAt,
      lastStatusAt: now,
      lastError: nextStatus === "CONNECTED" ? null : input.lastError ?? session.lastError
    }
  });

  logWhatsapp("info", "session status updated", {
    tenantId: updated.tenantId,
    sessionName: updated.sessionName,
    previousStatus: session.status,
    nextStatus: updated.status
  });
  emitSessionUpdate(updated, input.qrCode ? "whatsapp.qr_updated" : "whatsapp.session_updated");

  return updated;
};

const mapTemplate = (template: Awaited<ReturnType<typeof prisma.whatsappMessageTemplate.findFirst>>) =>
  template
    ? {
        id: template.id,
        tenantId: template.tenantId,
        sessionId: template.sessionId,
        trigger: template.trigger,
        title: template.title,
        body: template.body,
        enabled: template.enabled,
        sortOrder: template.sortOrder,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
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
  await ensureDefaultTemplates(tenantId, session.id);
  return mapSession(synced);
};

export const listTemplates = async (tenantId: string) => {
  const session = await prisma.whatsappSession.findUnique({ where: { tenantId } });

  if (!session) {
    return [];
  }

  await ensureDefaultTemplates(tenantId, session.id);

  return prisma.whatsappMessageTemplate.findMany({
    where: { tenantId, sessionId: session.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
};

export const updateTemplate = async (tenantId: string, id: string, data: TemplateUpdateInput) => {
  const template = await prisma.whatsappMessageTemplate.findFirst({ where: { id, tenantId } });

  if (!template) {
    throw new AppError("WhatsApp message template not found", 404);
  }

  const updated = await prisma.whatsappMessageTemplate.update({
    where: { id },
    data: {
      title: data.title,
      body: data.body,
      enabled: data.enabled
    }
  });

  return mapTemplate(updated);
};

export const deleteTemplate = async (tenantId: string, id: string) => {
  const template = await prisma.whatsappMessageTemplate.findFirst({ where: { id, tenantId } });

  if (!template) {
    throw new AppError("WhatsApp message template not found", 404);
  }

  const updated = await prisma.whatsappMessageTemplate.update({
    where: { id },
    data: { enabled: false }
  });

  return mapTemplate(updated);
};

export const createOrStartSession = async (tenantId: string): Promise<ReturnType<typeof mapSession>> => {
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null }, include: { settings: true } });

  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  const sessionName = sessionNameForTenant(tenant.slug);
  const webhookUrl = `${env.PUBLIC_BACKEND_URL.replace(/\/$/, "")}/public/webhooks/waha`;

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
  await ensureDefaultTemplates(tenantId, session.id);

  const webhooks = [
    {
      url: webhookUrl,
      events: ["message", "session.status"],
      ...(env.WAHA_WEBHOOK_SECRET ? { hmac: { key: env.WAHA_WEBHOOK_SECRET } } : {})
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
      const connected = await updateSessionFromWahaStatus(session, "CONNECTED");

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

  const updated = qrCode
    ? await updateSessionFromWahaStatus(syncedSession, "PENDING_QR", { qrCode, lastError: null })
    : await prisma.whatsappSession.update({
        where: { id: session.id },
        data: {
          lastStatusAt: new Date(),
          lastError: null
        }
      });

  if (!qrCode) {
    emitSessionUpdate(updated);
  }

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

export const getWahaConnectivityHealth = async (tenantId: string) => {
  const session = await prisma.whatsappSession.findUnique({ where: { tenantId } });
  const startedAt = Date.now();

  try {
    const sessionsResult = await wahaRequestWithMeta<unknown>("/api/sessions", { timeoutMs: 5_000 });
    let wahaSession: Record<string, unknown> | null = null;

    if (session) {
      wahaSession = await wahaRequest<Record<string, unknown>>(`/api/sessions/${encodeURIComponent(session.sessionName)}`, { timeoutMs: 5_000 }).catch(() => null);
    }

    const rawStatus = asString(wahaSession?.status);
    const normalizedStatus = rawStatus ? normalizeWahaStatus(rawStatus) : null;

    logWhatsapp("info", "WAHA connectivity health ok", {
      tenantId,
      sessionId: session?.id,
      sessionName: session?.sessionName,
      wahaStatus: rawStatus,
      durationMs: Date.now() - startedAt
    });

    return {
      ok: true,
      wahaReachable: true,
      sessionName: session?.sessionName ?? null,
      internalStatus: session?.status ?? null,
      wahaStatus: rawStatus ?? null,
      normalizedWahaStatus: normalizedStatus,
      latencyMs: Date.now() - startedAt,
      listSessionsStatus: sessionsResult.status,
      baseUrlHost: new URL(wahaBaseUrl()).host,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    const details = getErrorDetails(error);

    logWhatsapp("warn", "WAHA connectivity health failed", {
      tenantId,
      sessionId: session?.id,
      sessionName: session?.sessionName,
      code: details.code,
      wahaStatus: details.wahaStatus,
      durationMs: details.durationMs ?? Date.now() - startedAt,
      error: getWahaErrorMessage(error)
    });

    return {
      ok: false,
      wahaReachable: false,
      sessionName: session?.sessionName ?? null,
      internalStatus: session?.status ?? null,
      latencyMs: Date.now() - startedAt,
      error: {
        code: details.code ?? "WAHA_UNREACHABLE",
        message: getWahaErrorMessage(error),
        wahaStatus: details.wahaStatus ?? null
      },
      baseUrlHost: (() => {
        try {
          return new URL(wahaBaseUrl()).host;
        } catch {
          return null;
        }
      })(),
      checkedAt: new Date().toISOString()
    };
  }
};

export const sendTextMessage = async (tenantId: string, phone: string, text: string, options: SendTextMessageOptions = {}) => {
  const session = await prisma.whatsappSession.findUnique({ where: { tenantId } });

  if (!session) {
    throw new AppError("WhatsApp session not found", 404);
  }

  if (session.status !== "CONNECTED") {
    throw new AppError("WhatsApp session is not connected", 409);
  }

  const chatId = toChatId(phone);
  const source = options.source ?? "manual";

  logWhatsapp("info", "WhatsApp outbound send requested", {
    tenantId,
    sessionId: session.id,
    sessionName: session.sessionName,
    chatIdMasked: maskIdentifier(chatId),
    source
  });

  let response: Record<string, unknown>;
  let responseStatus = 0;
  let durationMs = 0;

  try {
    const result = await wahaRequestWithMeta<Record<string, unknown>>("/api/sendText", {
      method: "POST",
      body: {
        session: session.sessionName,
        chatId,
        text
      }
    });

    response = result.data;
    responseStatus = result.status;
    durationMs = result.durationMs;
  } catch (error) {
    const details = getErrorDetails(error);
    const message = getWahaErrorMessage(error);

    await prisma.whatsappSession.update({
      where: { id: session.id },
      data: { lastError: message, lastStatusAt: new Date() }
    });

    logWhatsapp("error", "WhatsApp outbound send failed", {
      tenantId,
      sessionId: session.id,
      sessionName: session.sessionName,
      chatIdMasked: maskIdentifier(chatId),
      source,
      code: details.code,
      wahaStatus: details.wahaStatus,
      durationMs: details.durationMs,
      error: message
    });

    throw new AppError(message, error instanceof AppError ? error.statusCode : 502, {
      code: details.code ?? "WAHA_SEND_REJECTED",
      wahaStatus: details.wahaStatus,
      durationMs: details.durationMs,
      source
    });
  }

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

  logWhatsapp("info", "WhatsApp outbound send succeeded", {
    tenantId,
    sessionId: session.id,
    sessionName: session.sessionName,
    chatIdMasked: maskIdentifier(chatId),
    source,
    wahaStatus: responseStatus,
    durationMs,
    externalId: getExternalId(response)
  });

  return {
    sent: true,
    wahaStatus: responseStatus,
    latencyMs: durationMs,
    messageId: getExternalId(response) ?? null
  };
};

export const deleteMessage = async (tenantId: string, id: string) => {
  const message = await prisma.whatsappMessage.findFirst({
    where: { id, tenantId, deletedAt: null }
  });

  if (!message) {
    throw new AppError("WhatsApp message not found", 404);
  }

  const deleted = await prisma.whatsappMessage.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  getSocketServer()?.to(`tenant:${tenantId}`).emit("whatsapp.message_deleted", {
    id,
    tenantId,
    sessionId: deleted.sessionId,
    conversationId: deleted.conversationId,
    deletedAt: deleted.deletedAt
  });

  return deleted;
};

export const handleWebhook = async (
  body: WahaWebhookBody,
  rawBody: Buffer | undefined,
  headers: Record<string, string | string[] | undefined>,
  querySecret?: string
) => {
  verifyWebhookSecret(rawBody, headers, querySecret);

  void processWebhook(body).catch((error) => {
    logWhatsapp("error", "unhandled webhook processing error", {
      error: error instanceof Error ? error.message : String(error),
      eventType: body.event ?? body.type
    });
  });

  return { received: true };
};

const processWebhook = async (body: WahaWebhookBody) => {
  const eventType = body.event ?? body.type ?? "message";
  const payload = (body.payload ?? body) as Record<string, unknown>;
  const sessionName = body.session ?? asString(payload.session) ?? asString(payload.sessionName);
  const session = sessionName ? await prisma.whatsappSession.findUnique({ where: { sessionName }, include: { tenant: { include: { settings: true } } } }) : null;
  const webhookExternalId = eventType.includes("message") && sessionName ? getStableMessageId(sessionName, payload) : getExternalId(payload);

  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      tenantId: session?.tenantId,
      provider: "waha",
      eventType,
      externalId: webhookExternalId,
      payload: body as Prisma.InputJsonObject
    }
  });

  if (!session) {
    logWhatsapp("warn", "webhook session not found", { eventType, sessionName });
    await prisma.webhookEvent.update({ where: { id: webhookEvent.id }, data: { processedAt: new Date(), error: "Session not found" } });
    return { received: true };
  }

  try {
    logWhatsapp("info", "webhook received", {
      tenantId: session.tenantId,
      sessionName,
      eventType,
      externalId: webhookExternalId
    });

    const qrCode = getPayloadQrCode(payload);
    if (qrCode) {
      await updateSessionFromWahaStatus(session, "PENDING_QR", { qrCode });
    }

    if (eventType.includes("session")) {
      const me = payload.me && typeof payload.me === "object" ? (payload.me as Record<string, unknown>) : null;
      const nextStatus = normalizeWahaStatus(asString(payload.status) ?? asString(payload.state));
      await updateSessionFromWahaStatus(session, nextStatus, {
        phoneNumber: asString(me?.id)?.replace(/@.*/, ""),
        displayName: asString(me?.pushName),
        lastError: asString(payload.error) ?? asString(payload.message)
      });
    }

    if (eventType.includes("message")) {
      await handleIncomingMessage(session, payload);
    }

    await prisma.webhookEvent.update({ where: { id: webhookEvent.id }, data: { processedAt: new Date() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    logWhatsapp("error", "webhook processing failed", {
      tenantId: session.tenantId,
      sessionName,
      eventType,
      error: message
    });
    await prisma.webhookEvent.update({ where: { id: webhookEvent.id }, data: { processedAt: new Date(), error: message } });
  }

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

  const externalId = getStableMessageId(session.sessionName, payload);
  let messageCreated = false;

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
    .then(() => {
      messageCreated = true;
    })
    .catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        logWhatsapp("info", "duplicate message webhook ignored", {
          tenantId: session.tenantId,
          sessionName: session.sessionName,
          chatId,
          externalId
        });
        messageCreated = false;
        return;
      }
      throw error;
    });

  if (messageCreated) {
    getSocketServer()?.to(`tenant:${session.tenantId}`).emit("whatsapp.message_received", {
      tenantId: session.tenantId,
      sessionId: session.id,
      conversationId: conversation.id,
      chatId,
      direction: fromMe ? "OUTBOUND" : "INBOUND",
      receivedAt
    });
  }

  if (!fromMe && messageCreated && session.autoReplyEnabled && body) {
    const botState = conversation.botState && typeof conversation.botState === "object" ? (conversation.botState as Record<string, unknown>) : {};
    const lastAutoReplyAt = asString(botState.lastAutoReplyAt);
    const lastAutoReplyTime = lastAutoReplyAt ? new Date(lastAutoReplyAt).getTime() : 0;

    if (Date.now() - lastAutoReplyTime < AUTO_REPLY_COOLDOWN_MS) {
      return;
    }

    const renderedMessage = await getRenderedTemplate(session.id, "WELCOME", {
        ...templateVariablesForTenant(session.tenant),
        cliente: contactName ?? contactPhone
      });
    const message = renderedMessage === null ? session.welcomeMessage || defaultWelcomeMessage(session.tenant) : renderedMessage;

    if (!message) {
      return;
    }

    if (env.WHATSAPP_AUTO_REPLY_DELAY_MS > 0) {
      logWhatsapp("info", "auto reply scheduled", {
        tenantId: session.tenantId,
        sessionName: session.sessionName,
        chatId,
        delayMs: env.WHATSAPP_AUTO_REPLY_DELAY_MS
      });
      await sleep(env.WHATSAPP_AUTO_REPLY_DELAY_MS);
    }

    await sendTextMessage(session.tenantId, chatId, message, { source: "auto_reply" }).then(async () => {
      await prisma.whatsappConversation.update({
        where: { id: conversation.id },
        data: {
          botState: {
            ...botState,
            lastAutoReplyAt: new Date().toISOString()
          }
        }
      });
    }).catch(async (error) => {
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

  const trigger = triggerForOrderStatus(order.status);
  if (!trigger) return;

  const message = await getRenderedTemplate(session.id, trigger, {
    ...templateVariablesForTenant(tenant),
    codigo: order.publicCode,
    status: order.status,
    total: Number(order.total).toFixed(2),
    rastreamento: `${env.FRONTEND_URL.replace(/\/$/, "")}/${tenant.slug}/pedido/${order.publicCode}`
  });

  if (!message) return;

  await sendTextMessage(tenantId, order.customerPhone, message, { source: "order_status" }).catch(async (error) => {
    await prisma.whatsappSession.update({
      where: { id: session.id },
      data: { lastError: error instanceof Error ? error.message : "Could not send order notification" }
    });
  });
};
