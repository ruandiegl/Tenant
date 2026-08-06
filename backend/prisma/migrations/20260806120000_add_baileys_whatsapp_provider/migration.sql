ALTER TYPE "WhatsappSessionStatus" ADD VALUE IF NOT EXISTS 'CONNECTING';
ALTER TYPE "WhatsappSessionStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAIRING_CODE';
ALTER TYPE "WhatsappSessionStatus" ADD VALUE IF NOT EXISTS 'RECONNECTING';
ALTER TYPE "WhatsappSessionStatus" ADD VALUE IF NOT EXISTS 'LOGGED_OUT';

CREATE TYPE "WhatsappProvider" AS ENUM ('WAHA', 'BAILEYS');
CREATE TYPE "WhatsappMessageQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

ALTER TABLE "WhatsappSession"
  ADD COLUMN "provider" "WhatsappProvider" NOT NULL DEFAULT 'WAHA',
  ADD COLUMN "pairingCode" TEXT,
  ADD COLUMN "lastQrAt" TIMESTAMP(3),
  ADD COLUMN "lastPairingCodeAt" TIMESTAMP(3),
  ADD COLUMN "connectionAttempts" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "WhatsappAuthState" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsappAuthState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsappMessageQueue" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "conversationId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "WhatsappMessageQueueStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processingAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsappMessageQueue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappAuthState_sessionId_key_key" ON "WhatsappAuthState"("sessionId", "key");
CREATE INDEX "WhatsappAuthState_tenantId_idx" ON "WhatsappAuthState"("tenantId");
CREATE INDEX "WhatsappAuthState_sessionId_idx" ON "WhatsappAuthState"("sessionId");

CREATE UNIQUE INDEX "WhatsappMessageQueue_idempotencyKey_key" ON "WhatsappMessageQueue"("idempotencyKey");
CREATE INDEX "WhatsappMessageQueue_tenantId_status_idx" ON "WhatsappMessageQueue"("tenantId", "status");
CREATE INDEX "WhatsappMessageQueue_sessionId_status_availableAt_idx" ON "WhatsappMessageQueue"("sessionId", "status", "availableAt");

CREATE INDEX "WhatsappSession_provider_status_idx" ON "WhatsappSession"("provider", "status");

ALTER TABLE "WhatsappAuthState"
  ADD CONSTRAINT "WhatsappAuthState_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "WhatsappSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsappMessageQueue"
  ADD CONSTRAINT "WhatsappMessageQueue_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "WhatsappSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
