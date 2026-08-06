SET lock_timeout = '15s';
SET statement_timeout = '120s';

ALTER TYPE "WhatsappSessionStatus" ADD VALUE IF NOT EXISTS 'CONNECTING';
ALTER TYPE "WhatsappSessionStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAIRING_CODE';
ALTER TYPE "WhatsappSessionStatus" ADD VALUE IF NOT EXISTS 'RECONNECTING';
ALTER TYPE "WhatsappSessionStatus" ADD VALUE IF NOT EXISTS 'LOGGED_OUT';

DO $$
BEGIN
  CREATE TYPE "WhatsappProvider" AS ENUM ('WAHA', 'BAILEYS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "WhatsappMessageQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "WhatsappSession"
  ADD COLUMN IF NOT EXISTS "provider" "WhatsappProvider" NOT NULL DEFAULT 'WAHA',
  ADD COLUMN IF NOT EXISTS "pairingCode" TEXT,
  ADD COLUMN IF NOT EXISTS "lastQrAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastPairingCodeAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "connectionAttempts" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "WhatsappAuthState" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsappAuthState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WhatsappMessageQueue" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappAuthState_sessionId_key_key" ON "WhatsappAuthState"("sessionId", "key");
CREATE INDEX IF NOT EXISTS "WhatsappAuthState_tenantId_idx" ON "WhatsappAuthState"("tenantId");
CREATE INDEX IF NOT EXISTS "WhatsappAuthState_sessionId_idx" ON "WhatsappAuthState"("sessionId");

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappMessageQueue_idempotencyKey_key" ON "WhatsappMessageQueue"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "WhatsappMessageQueue_tenantId_status_idx" ON "WhatsappMessageQueue"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "WhatsappMessageQueue_sessionId_status_availableAt_idx" ON "WhatsappMessageQueue"("sessionId", "status", "availableAt");

CREATE INDEX IF NOT EXISTS "WhatsappSession_provider_status_idx" ON "WhatsappSession"("provider", "status");

DO $$
BEGIN
  ALTER TABLE "WhatsappAuthState"
    ADD CONSTRAINT "WhatsappAuthState_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "WhatsappSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "WhatsappMessageQueue"
    ADD CONSTRAINT "WhatsappMessageQueue_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "WhatsappSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
