CREATE TYPE "WhatsappTemplateTrigger" AS ENUM (
    'WELCOME',
    'ORDER_PLACED',
    'ORDER_ACCEPTED',
    'ORDER_PREPARING',
    'ORDER_READY',
    'ORDER_DISPATCHED',
    'ORDER_DELIVERED',
    'ORDER_COMPLETED',
    'ORDER_CANCELLED',
    'ORDER_REJECTED'
);

CREATE TABLE "WhatsappMessageTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "trigger" "WhatsappTemplateTrigger" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappMessageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappMessageTemplate_sessionId_trigger_key" ON "WhatsappMessageTemplate"("sessionId", "trigger");
CREATE INDEX "WhatsappMessageTemplate_tenantId_trigger_enabled_idx" ON "WhatsappMessageTemplate"("tenantId", "trigger", "enabled");

ALTER TABLE "WhatsappMessageTemplate" ADD CONSTRAINT "WhatsappMessageTemplate_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhatsappSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
