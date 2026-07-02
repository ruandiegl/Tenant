import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

type DeliveryZoneInput = {
  branchId: string;
  name: string;
  type: "POSTAL_CODE" | "RADIUS";
  postalCodeStart?: string;
  postalCodeEnd?: string;
  radiusKm?: number;
  fee: number;
  minimumOrderValue?: number;
  estimatedMinutes?: number;
  status?: "ACTIVE" | "INACTIVE";
};

const includeBranch = {
  branch: { include: { address: true } }
};

async function ensureBranch(tenantId: string, branchId: string) {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId, deletedAt: null }
  });

  if (!branch) {
    throw new AppError("Branch not found", 404);
  }
}

function toDeliveryZoneData(data: DeliveryZoneInput) {
  return {
    branchId: data.branchId,
    name: data.name,
    type: data.type,
    postalCodeStart: data.type === "POSTAL_CODE" ? data.postalCodeStart : null,
    postalCodeEnd: data.type === "POSTAL_CODE" ? data.postalCodeEnd : null,
    radiusKm: data.type === "RADIUS" && data.radiusKm !== undefined ? new Prisma.Decimal(data.radiusKm) : null,
    fee: new Prisma.Decimal(data.fee),
    minimumOrderValue: new Prisma.Decimal(data.minimumOrderValue ?? 0),
    estimatedMinutes: data.estimatedMinutes,
    status: data.status ?? "ACTIVE"
  };
}

function toAuditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

export const listDeliveryZones = (tenantId: string) => {
  return prisma.deliveryZone.findMany({
    where: { tenantId },
    include: includeBranch,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
};

export const listPublicDeliveryZones = async (tenantSlug: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });

  if (!tenant || !["ACTIVE", "TRIAL"].includes(tenant.status)) {
    throw new AppError("Tenant not found or unavailable", 404);
  }

  return prisma.deliveryZone.findMany({
    where: {
      tenantId: tenant.id,
      status: "ACTIVE",
      branch: { status: "ACTIVE", acceptsDelivery: true, deletedAt: null }
    },
    include: includeBranch,
    orderBy: [{ minimumOrderValue: "desc" }, { fee: "asc" }]
  });
};

export const createDeliveryZone = async (tenantId: string, data: DeliveryZoneInput, userId?: string) => {
  await ensureBranch(tenantId, data.branchId);

  const created = await prisma.deliveryZone.create({
    data: {
      tenantId,
      ...toDeliveryZoneData(data)
    },
    include: includeBranch
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "tenant.delivery_zone_created",
      entity: "DeliveryZone",
      entityId: created.id,
      after: toAuditJson(data)
    }
  });

  return created;
};

export const updateDeliveryZone = async (tenantId: string, id: string, data: DeliveryZoneInput, userId?: string) => {
  const current = await prisma.deliveryZone.findFirst({ where: { id, tenantId } });

  if (!current) {
    throw new AppError("Delivery zone not found", 404);
  }

  await ensureBranch(tenantId, data.branchId);

  const updated = await prisma.deliveryZone.update({
    where: { id },
    data: toDeliveryZoneData(data),
    include: includeBranch
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "tenant.delivery_zone_updated",
      entity: "DeliveryZone",
      entityId: id,
      before: toAuditJson(current),
      after: toAuditJson(data)
    }
  });

  return updated;
};

export const deleteDeliveryZone = async (tenantId: string, id: string, userId?: string) => {
  const current = await prisma.deliveryZone.findFirst({ where: { id, tenantId } });

  if (!current) {
    throw new AppError("Delivery zone not found", 404);
  }

  await prisma.deliveryZone.update({
    where: { id },
    data: { status: "INACTIVE" }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "tenant.delivery_zone_disabled",
      entity: "DeliveryZone",
      entityId: id,
      before: toAuditJson(current)
    }
  });
};
