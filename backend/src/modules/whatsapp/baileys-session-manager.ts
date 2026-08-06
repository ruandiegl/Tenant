import makeWASocket, { Browsers, DisconnectReason, type WAMessage, type WASocket } from "@whiskeysockets/baileys";
import { getContentType } from "@whiskeysockets/baileys/lib/Utils/messages.js";
import pino from "pino";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { getSocketServer } from "../../config/socket.js";
import { AppError } from "../../shared/errors/app-error.js";
import { usePrismaBaileysAuthState } from "./baileys-auth-store.js";

export type BaileysIncomingMessagePayload = {
  providerMessageId: string;
  chatId: string;
  from?: string;
  to?: string;
  fromMe: boolean;
  body?: string;
  type?: string;
  pushName?: string;
  timestamp?: number;
  rawMessage: WAMessage;
};

type ManagedSession = {
  tenantId: string;
  sessionId: string;
  socket: WASocket;
  saveCreds: () => Promise<void>;
  stopped: boolean;
  reconnectTimer?: NodeJS.Timeout;
};

type IncomingMessageHandler = (sessionId: string, payload: BaileysIncomingMessagePayload) => Promise<void>;

const sessions = new Map<string, ManagedSession>();
let incomingMessageHandler: IncomingMessageHandler | null = null;

const logger = pino({ level: "silent" });

const isMissingMigrationError = (error: unknown) =>
  error instanceof Error &&
  (error.message.includes("WhatsappSession.provider") ||
    error.message.includes("WhatsappSession.pairingCode") ||
    error.message.includes("WhatsappSession.lastQrAt") ||
    error.message.includes("WhatsappAuthState"));

const baileysJid = (phoneOrJid: string) => {
  if (phoneOrJid.endsWith("@s.whatsapp.net") || phoneOrJid.endsWith("@lid")) return phoneOrJid;
  if (phoneOrJid.endsWith("@c.us")) return `${phoneOrJid.replace(/@c\.us$/, "")}@s.whatsapp.net`;

  const digits = phoneOrJid.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
};

const mapSessionForSocket = (session: NonNullable<Awaited<ReturnType<typeof prisma.whatsappSession.findUnique>>>) => ({
  id: session.id,
  tenantId: session.tenantId,
  sessionName: session.sessionName,
  provider: session.provider,
  phoneNumber: session.phoneNumber,
  displayName: session.displayName,
  status: session.status,
  qrCode: session.qrCode,
  pairingCode: session.pairingCode,
  autoReplyEnabled: session.autoReplyEnabled,
  notifyOrderStatus: session.notifyOrderStatus,
  welcomeMessage: session.welcomeMessage,
  lastStatusAt: session.lastStatusAt,
  lastQrAt: session.lastQrAt,
  lastPairingCodeAt: session.lastPairingCodeAt,
  connectedAt: session.connectedAt,
  disconnectedAt: session.disconnectedAt,
  lastError: session.lastError,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt
});

const emitBaileysSessionUpdate = (session: NonNullable<Awaited<ReturnType<typeof prisma.whatsappSession.findUnique>>>, event = "whatsapp.session_updated") => {
  const mapped = mapSessionForSocket(session);
  getSocketServer()?.to(`tenant:${session.tenantId}`).emit(event, mapped);
  if (event !== "whatsapp.session_updated") {
    getSocketServer()?.to(`tenant:${session.tenantId}`).emit("whatsapp.session_updated", mapped);
  }
};

const updateBaileysSession = async (
  sessionId: string,
  data: Parameters<typeof prisma.whatsappSession.update>[0]["data"],
  event = "whatsapp.session_updated"
) => {
  const updated = await prisma.whatsappSession.update({
    where: { id: sessionId },
    data
  });

  emitBaileysSessionUpdate(updated, event);
  return updated;
};

const extractBody = (message: WAMessage) => {
  const content = message.message;
  if (!content) return undefined;

  return (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    content.documentMessage?.caption ??
    content.buttonsResponseMessage?.selectedDisplayText ??
    content.listResponseMessage?.title ??
    undefined
  );
};

const extractTimestamp = (message: WAMessage) => {
  const timestamp = message.messageTimestamp;

  if (typeof timestamp === "number") return timestamp;
  if (timestamp && typeof timestamp === "object" && "toNumber" in timestamp && typeof timestamp.toNumber === "function") {
    return timestamp.toNumber();
  }

  return Math.floor(Date.now() / 1000);
};

const normalizeIncomingMessage = (message: WAMessage): BaileysIncomingMessagePayload | null => {
  const chatId = message.key.remoteJid;
  const providerMessageId = message.key.id;

  if (!chatId || !providerMessageId || chatId.endsWith("@g.us") || chatId === "status@broadcast") {
    return null;
  }

  const fromMe = Boolean(message.key.fromMe);
  const participant = message.key.participant;

  return {
    providerMessageId,
    chatId,
    from: fromMe ? undefined : participant ?? chatId,
    to: fromMe ? chatId : undefined,
    fromMe,
    body: extractBody(message) ?? undefined,
    type: getContentType(message.message ?? undefined) ?? "unknown",
    pushName: message.pushName ?? undefined,
    timestamp: extractTimestamp(message),
    rawMessage: message
  };
};

const clearReconnectTimer = (managed: ManagedSession) => {
  if (managed.reconnectTimer) {
    clearTimeout(managed.reconnectTimer);
    managed.reconnectTimer = undefined;
  }
};

const scheduleReconnect = async (tenantId: string, sessionId: string) => {
  const current = sessions.get(sessionId);
  if (!current || current.stopped) return;

  const session = await prisma.whatsappSession.findUnique({ where: { id: sessionId } });
  if (!session || session.provider !== "BAILEYS") return;

  const attempts = session.connectionAttempts + 1;
  const delayMs = Math.min(60_000, 1_000 * 2 ** Math.min(attempts, 6));

  await updateBaileysSession(sessionId, {
    status: "RECONNECTING",
    connectionAttempts: attempts,
    lastStatusAt: new Date()
  });

  clearReconnectTimer(current);
  current.reconnectTimer = setTimeout(() => {
    sessions.delete(sessionId);
    void startBaileysSession(tenantId, sessionId).catch((error) => {
      console.error("[whatsapp] Baileys reconnect failed", {
        tenantId,
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
    });
  }, delayMs);
};

export const setBaileysIncomingMessageHandler = (handler: IncomingMessageHandler) => {
  incomingMessageHandler = handler;
};

export const startBaileysSession = async (tenantId: string, sessionId: string) => {
  const existing = sessions.get(sessionId);
  if (existing && !existing.stopped) {
    return existing.socket;
  }

  const session = await prisma.whatsappSession.findFirst({
    where: { id: sessionId, tenantId, provider: "BAILEYS" }
  });

  if (!session) {
    throw new AppError("Baileys session not found", 404);
  }

  await updateBaileysSession(sessionId, {
    status: "CONNECTING",
    lastStatusAt: new Date(),
    lastError: null
  });

  const { state, saveCreds } = await usePrismaBaileysAuthState(tenantId, sessionId);
  const socket = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu("Chrome"),
    logger,
    connectTimeoutMs: env.BAILEYS_CONNECT_TIMEOUT_MS,
    defaultQueryTimeoutMs: env.BAILEYS_DEFAULT_QUERY_TIMEOUT_MS,
    keepAliveIntervalMs: env.BAILEYS_KEEP_ALIVE_INTERVAL_MS,
    qrTimeout: env.BAILEYS_QR_TIMEOUT_MS,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false
  });

  const managed: ManagedSession = {
    tenantId,
    sessionId,
    socket,
    saveCreds,
    stopped: false
  };
  sessions.set(sessionId, managed);

  socket.ev.on("creds.update", () => {
    void saveCreds().catch((error) => {
      console.error("[whatsapp] Could not persist Baileys credentials", {
        tenantId,
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
    });
  });

  socket.ev.on("connection.update", (update) => {
    void (async () => {
      if (update.qr) {
        await updateBaileysSession(
          sessionId,
          {
            status: "PENDING_QR",
            qrCode: update.qr,
            pairingCode: null,
            lastQrAt: new Date(),
            lastStatusAt: new Date(),
            lastError: null
          },
          "whatsapp.qr_updated"
        );
      }

      if (update.connection === "open") {
        const me = socket.authState.creds.me;
        await updateBaileysSession(sessionId, {
          status: "CONNECTED",
          qrCode: null,
          pairingCode: null,
          phoneNumber: me?.id?.replace(/@.*/, ""),
          displayName: me?.name,
          connectedAt: new Date(),
          lastStatusAt: new Date(),
          connectionAttempts: 0,
          lastError: null
        });
      }

      if (update.connection === "close") {
        const statusCode = (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;

        if (statusCode === DisconnectReason.loggedOut) {
          managed.stopped = true;
          clearReconnectTimer(managed);
          sessions.delete(sessionId);
          await prisma.whatsappAuthState.deleteMany({ where: { sessionId } });
          await updateBaileysSession(sessionId, {
            status: "LOGGED_OUT",
            qrCode: null,
            pairingCode: null,
            phoneNumber: null,
            displayName: null,
            disconnectedAt: new Date(),
            lastStatusAt: new Date(),
            lastError: "WhatsApp session logged out"
          });
          return;
        }

        if (!managed.stopped) {
          await scheduleReconnect(tenantId, sessionId);
        }
      }
    })().catch((error) => {
      console.error("[whatsapp] Baileys connection update failed", {
        tenantId,
        sessionId,
        error: error instanceof Error ? error.message : String(error)
      });
    });
  });

  socket.ev.on("messages.upsert", (event) => {
    if (event.type !== "notify") return;

    for (const message of event.messages) {
      const payload = normalizeIncomingMessage(message);
      if (!payload || !incomingMessageHandler) continue;

      void incomingMessageHandler(sessionId, payload).catch((error) => {
        console.error("[whatsapp] Baileys incoming message failed", {
          tenantId,
          sessionId,
          messageId: payload.providerMessageId,
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }
  });

  return socket;
};

export const requestBaileysPairingCode = async (tenantId: string, sessionId: string, phoneNumber: string) => {
  const socket = await startBaileysSession(tenantId, sessionId);
  const code = await socket.requestPairingCode(phoneNumber.replace(/\D/g, ""));
  const updated = await updateBaileysSession(sessionId, {
    status: "PENDING_PAIRING_CODE",
    pairingCode: code,
    qrCode: null,
    lastPairingCodeAt: new Date(),
    lastStatusAt: new Date(),
    lastError: null
  });

  return mapSessionForSocket(updated);
};

export const stopBaileysSession = async (tenantId: string, sessionId: string, logout = false) => {
  const managed = sessions.get(sessionId);

  if (managed) {
    managed.stopped = true;
    clearReconnectTimer(managed);
    sessions.delete(sessionId);

    if (logout) {
      await managed.socket.logout("PodePedir logout requested").catch(() => undefined);
      await prisma.whatsappAuthState.deleteMany({ where: { sessionId } });
    } else {
      await managed.socket.end(undefined).catch(() => undefined);
    }
  } else if (logout) {
    await prisma.whatsappAuthState.deleteMany({ where: { sessionId } });
  }

  const updated = await updateBaileysSession(sessionId, {
    status: logout ? "LOGGED_OUT" : "DISCONNECTED",
    qrCode: null,
    pairingCode: null,
    phoneNumber: logout ? null : undefined,
    displayName: logout ? null : undefined,
    disconnectedAt: new Date(),
    lastStatusAt: new Date(),
    lastError: null
  });

  return mapSessionForSocket(updated);
};

export const restartBaileysSessionForQr = async (tenantId: string, sessionId: string) => {
  const managed = sessions.get(sessionId);

  if (managed) {
    managed.stopped = true;
    clearReconnectTimer(managed);
    sessions.delete(sessionId);
    await managed.socket.end(undefined).catch(() => undefined);
  }

  await updateBaileysSession(sessionId, {
    status: "CONNECTING",
    qrCode: null,
    pairingCode: null,
    lastStatusAt: new Date(),
    lastError: null
  });

  await startBaileysSession(tenantId, sessionId);
  const updated = await prisma.whatsappSession.findUnique({ where: { id: sessionId } });

  if (!updated) {
    throw new AppError("Baileys session not found", 404);
  }

  return mapSessionForSocket(updated);
};

export const sendBaileysTextMessage = async (tenantId: string, sessionId: string, to: string, text: string) => {
  const socket = await startBaileysSession(tenantId, sessionId);
  const session = await prisma.whatsappSession.findFirst({ where: { id: sessionId, tenantId, provider: "BAILEYS" } });

  if (!session || session.status !== "CONNECTED") {
    throw new AppError("WhatsApp session is not connected", 409, { code: "BAILEYS_SESSION_NOT_READY" });
  }

  const jid = baileysJid(to);
  const response = await socket.sendMessage(jid, { text });

  if (!response?.key?.id) {
    throw new AppError("Baileys did not return a message id", 502, { code: "BAILEYS_SEND_REJECTED" });
  }

  return {
    jid,
    messageId: response.key.id,
    raw: response
  };
};

export const startConnectedBaileysSessions = async () => {
  const sessionsToStart = await prisma.whatsappSession
    .findMany({
      where: {
        provider: "BAILEYS",
        status: { in: ["CONNECTED", "RECONNECTING", "CONNECTING"] }
      },
      select: { id: true, tenantId: true }
    })
    .catch((error) => {
      if (isMissingMigrationError(error)) {
        console.warn("[whatsapp] Baileys startup skipped because database migrations are not applied yet");
        return [];
      }

      throw error;
    });

  for (const session of sessionsToStart) {
    void startBaileysSession(session.tenantId, session.id).catch((error) => {
      console.error("[whatsapp] Could not start Baileys session on boot", {
        tenantId: session.tenantId,
        sessionId: session.id,
        error: error instanceof Error ? error.message : String(error)
      });
    });
  }
};

export const getBaileysRuntimeSession = (sessionId: string) => sessions.get(sessionId);
