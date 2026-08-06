import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, WASocket } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { getSocketServer } from "../../config/socket.js";
import { AppError } from "../../shared/errors/app-error.js";
import { usePrismaAuthState } from "./baileys.auth-state.js";

type ManagedSession = {
  socket: WASocket;
  tenantId: string;
  sessionId: string;
};

class BaileysManager {
  private sessions = new Map<string, ManagedSession>();
  private logger = pino({ level: "silent" });

  public async connect(tenantId: string, sessionId: string): Promise<WASocket> {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing.socket;
    }

    const { state, saveCreds } = await usePrismaAuthState(sessionId, tenantId);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      logger: this.logger,
      auth: state,
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      connectTimeoutMs: env.BAILEYS_CONNECT_TIMEOUT_MS,
      defaultQueryTimeoutMs: env.BAILEYS_DEFAULT_QUERY_TIMEOUT_MS,
      keepAliveIntervalMs: env.BAILEYS_KEEP_ALIVE_INTERVAL_MS
    });

    this.sessions.set(sessionId, { socket, tenantId, sessionId });

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "open") {
        const phoneNumber = socket.user?.id ? socket.user.id.split(":")[0].replace(/\D/g, "") : null;
        const displayName = socket.user?.name || null;

        await prisma.whatsappSession.update({
          where: { id: sessionId },
          data: {
            status: "CONNECTED",
            phoneNumber,
            displayName,
            connectedAt: new Date(),
            lastError: null,
            lastStatusAt: new Date()
          }
        });

        getSocketServer()?.to(`tenant:${tenantId}`).emit("whatsapp.session_updated", {
          id: sessionId,
          tenantId,
          status: "CONNECTED",
          phoneNumber,
          displayName
        });
      } else if (connection === "close") {
        this.sessions.delete(sessionId);
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (statusCode === DisconnectReason.loggedOut) {
          await prisma.whatsappAuthState.deleteMany({ where: { sessionId } });
          await prisma.whatsappSession.update({
            where: { id: sessionId },
            data: {
              status: "LOGGED_OUT",
              disconnectedAt: new Date(),
              lastError: "Sessao encerrada pelo dispositivo WhatsApp",
              lastStatusAt: new Date()
            }
          });

          getSocketServer()?.to(`tenant:${tenantId}`).emit("whatsapp.session_updated", {
            id: sessionId,
            tenantId,
            status: "LOGGED_OUT"
          });
        } else if (shouldReconnect) {
          await prisma.whatsappSession.update({
            where: { id: sessionId },
            data: {
              status: "RECONNECTING",
              lastStatusAt: new Date()
            }
          });

          setTimeout(() => {
            this.connect(tenantId, sessionId).catch(() => {});
          }, 5000);
        }
      }
    });

    return socket;
  }

  public async requestPairingCode(tenantId: string, sessionId: string, phone: string): Promise<string> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      const socket = await this.connect(tenantId, sessionId);
      session = { socket, tenantId, sessionId };
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15) {
      throw new AppError("Numero de telefone invalido para pareamento", 400);
    }

    try {
      await prisma.whatsappSession.update({
        where: { id: sessionId },
        data: {
          status: "PENDING_PAIRING_CODE",
          lastPairingCodeAt: new Date(),
          lastStatusAt: new Date()
        }
      });

      const code = await session.socket.requestPairingCode(cleanPhone);
      const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

      await prisma.whatsappSession.update({
        where: { id: sessionId },
        data: {
          pairingCode: formattedCode
        }
      });

      getSocketServer()?.to(`tenant:${tenantId}`).emit("whatsapp.session_updated", {
        id: sessionId,
        tenantId,
        status: "PENDING_PAIRING_CODE",
        pairingCode: formattedCode
      });

      return formattedCode;
    } catch (error) {
      throw new AppError(
        error instanceof Error ? error.message : "Nao foi possivel solicitar o codigo de pareamento Baileys",
        500
      );
    }
  }

  public async disconnect(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.socket.end(undefined);
      } catch {}
      this.sessions.delete(sessionId);
    }

    await prisma.whatsappSession.update({
      where: { id: sessionId },
      data: {
        status: "DISCONNECTED",
        disconnectedAt: new Date(),
        lastStatusAt: new Date()
      }
    });
  }

  public getSocket(sessionId: string): WASocket | null {
    return this.sessions.get(sessionId)?.socket || null;
  }
}

export const baileysManager = new BaileysManager();
