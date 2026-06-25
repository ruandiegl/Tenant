ALTER TABLE "Tenant" ADD COLUMN "legalName" TEXT;

ALTER TABLE "TenantSettings"
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "slogan" TEXT,
  ADD COLUMN "businessType" TEXT,
  ADD COLUMN "cuisineCategory" TEXT,
  ADD COLUMN "websiteUrl" TEXT,
  ADD COLUMN "instagramUrl" TEXT,
  ADD COLUMN "whatsapp" TEXT,
  ADD COLUMN "coverImageUrl" TEXT,
  ADD COLUMN "secondaryColor" TEXT,
  ADD COLUMN "themeFontFamily" TEXT,
  ADD COLUMN "welcomeMessage" TEXT;

CREATE TABLE "TenantInvite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantInvite_tokenHash_key" ON "TenantInvite"("tokenHash");
CREATE INDEX "TenantInvite_tenantId_email_idx" ON "TenantInvite"("tenantId", "email");
CREATE INDEX "TenantInvite_tokenHash_idx" ON "TenantInvite"("tokenHash");

ALTER TABLE "TenantInvite" ADD CONSTRAINT "TenantInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
