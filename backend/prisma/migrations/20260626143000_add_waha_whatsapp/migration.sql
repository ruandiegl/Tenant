ALTER TYPE "OrderSource" ADD VALUE IF NOT EXISTS 'WHATSAPP';

CREATE TYPE "WhatsappSessionStatus" AS ENUM ('PENDING_QR', 'CONNECTED', 'DISCONNECTED', 'ERROR');

CREATE TYPE "WhatsappMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TABLE "WhatsappSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "displayName" TEXT,
    "status" "WhatsappSessionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "qrCode" TEXT,
    "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notifyOrderStatus" BOOLEAN NOT NULL DEFAULT true,
    "welcomeMessage" TEXT,
    "lastStatusAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsappConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "contactPhone" TEXT NOT NULL,
    "contactName" TEXT,
    "chatId" TEXT NOT NULL,
    "botState" JSONB,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsappMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "conversationId" TEXT,
    "externalId" TEXT,
    "direction" "WhatsappMessageDirection" NOT NULL,
    "chatId" TEXT NOT NULL,
    "from" TEXT,
    "to" TEXT,
    "body" TEXT,
    "messageType" TEXT,
    "rawPayload" JSONB,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappSession_tenantId_key" ON "WhatsappSession"("tenantId");
CREATE UNIQUE INDEX "WhatsappSession_sessionName_key" ON "WhatsappSession"("sessionName");
CREATE INDEX "WhatsappSession_tenantId_status_idx" ON "WhatsappSession"("tenantId", "status");

CREATE UNIQUE INDEX "WhatsappConversation_sessionId_chatId_key" ON "WhatsappConversation"("sessionId", "chatId");
CREATE INDEX "WhatsappConversation_tenantId_contactPhone_idx" ON "WhatsappConversation"("tenantId", "contactPhone");

CREATE UNIQUE INDEX "WhatsappMessage_sessionId_externalId_key" ON "WhatsappMessage"("sessionId", "externalId");
CREATE INDEX "WhatsappMessage_tenantId_chatId_createdAt_idx" ON "WhatsappMessage"("tenantId", "chatId", "createdAt");
CREATE INDEX "WhatsappMessage_conversationId_createdAt_idx" ON "WhatsappMessage"("conversationId", "createdAt");

ALTER TABLE "WhatsappSession" ADD CONSTRAINT "WhatsappSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsappConversation" ADD CONSTRAINT "WhatsappConversation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhatsappSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsappConversation" ADD CONSTRAINT "WhatsappConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhatsappSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsappConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
