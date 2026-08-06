import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { baileysManager } from "./baileys.manager.js";


class WhatsappQueueWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      this.processQueue().catch(() => {});
    }, 5000);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private async processQueue() {
    const pendingItems = await prisma.whatsappMessageQueue.findMany({
      where: {
        status: "PENDING",
        availableAt: { lte: new Date() },
        attempts: { lt: env.WHATSAPP_SEND_MAX_ATTEMPTS }
      },
      take: 10,
      orderBy: { createdAt: "asc" }
    });

    for (const item of pendingItems) {
      await prisma.whatsappMessageQueue.update({
        where: { id: item.id },
        data: {
          status: "PROCESSING",
          processingAt: new Date(),
          attempts: { increment: 1 }
        }
      });

      try {
        const socket = baileysManager.getSocket(item.sessionId);
        if (!socket) {
          throw new Error("Sessao WhatsApp Baileys nao esta conectada");
        }

        const formattedJid = item.to.includes("@s.whatsapp.net") ? item.to : `${item.to.replace(/\D/g, "")}@s.whatsapp.net`;
        await socket.sendMessage(formattedJid, { text: item.body });

        await prisma.whatsappMessageQueue.update({
          where: { id: item.id },
          data: {
            status: "SENT",
            sentAt: new Date()
          }
        });

        await prisma.whatsappMessage.create({
          data: {
            tenantId: item.tenantId,
            sessionId: item.sessionId,
            conversationId: item.conversationId,
            direction: "OUTBOUND",
            chatId: formattedJid,
            to: item.to,
            body: item.body,
            sentAt: new Date()
          }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const willRetry = item.attempts + 1 < env.WHATSAPP_SEND_MAX_ATTEMPTS;

        await prisma.whatsappMessageQueue.update({
          where: { id: item.id },
          data: {
            status: willRetry ? "PENDING" : "FAILED",
            failedAt: willRetry ? null : new Date(),
            lastErrorMessage: errorMessage,
            availableAt: new Date(Date.now() + 10000 * (item.attempts + 1))
          }
        });
      }
    }
  }
}

export const whatsappQueueWorker = new WhatsappQueueWorker();
