import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

type DeliveryZoneInput = {
  branchId: string;
  name: string;
  type: "NEIGHBORHOOD" | "RADIUS" | "RADIUS_OVERFLOW";
  neighborhood?: string;
  postalCodeStart?: string;
  postalCodeEnd?: string;
  radiusKm?: number;
  distanceMode?: "STRAIGHT_LINE";
  color?: string;
  fee: number;
  minimumOrderValue?: number;
  estimatedMinutes?: number;
  status?: "ACTIVE" | "INACTIVE";
};

type DeliveryCalculationMethod = "NEIGHBORHOOD" | "STRAIGHT_LINE";

const includeBranch = {
  branch: { include: { address: true } }
};
const STRAIGHT_LINE_DISTANCE_MODE = "STRAIGHT_LINE" as const;
const DEFAULT_RADIUS_COLOR = "#1e6b3c";

async function ensureBranch(tenantId: string, branchId: string) {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId, deletedAt: null }
  });

  if (!branch) {
    throw new AppError("Branch not found", 404);
  }
}

function calculationMethodFromZone(zone: Pick<DeliveryZoneInput, "type" | "distanceMode">): DeliveryCalculationMethod {
  if (zone.type === "NEIGHBORHOOD") return "NEIGHBORHOOD";
  return "STRAIGHT_LINE";
}

function deliveryMethodWhere(method: DeliveryCalculationMethod): Prisma.DeliveryZoneWhereInput {
  if (method === "NEIGHBORHOOD") return { type: "NEIGHBORHOOD" };

  return {
    type: { in: ["RADIUS", "RADIUS_OVERFLOW"] },
    distanceMode: STRAIGHT_LINE_DISTANCE_MODE
  };
}

function normalizeDeliveryCalculationMethod(method: string | null | undefined): DeliveryCalculationMethod {
  return method === "NEIGHBORHOOD" ? "NEIGHBORHOOD" : "STRAIGHT_LINE";
}

async function getDeliveryCalculationMethod(tenantId: string): Promise<DeliveryCalculationMethod> {
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { deliveryCalculationMethod: true }
  });

  return normalizeDeliveryCalculationMethod(settings?.deliveryCalculationMethod);
}

async function ensureSelectedCalculationMethod(tenantId: string, data: DeliveryZoneInput) {
  const selectedMethod = await getDeliveryCalculationMethod(tenantId);

  if (selectedMethod !== calculationMethodFromZone(data)) {
    throw new AppError("A area deve usar a forma de cobranca selecionada nas configuracoes de entrega.", 409);
  }
}

async function ensureRadiusOverflowRule(tenantId: string, data: DeliveryZoneInput, currentId?: string) {
  if (data.type !== "RADIUS_OVERFLOW") return;
  if (data.status === "INACTIVE") return;

  const radiusRange = await prisma.deliveryZone.findFirst({
    where: {
      tenantId,
      branchId: data.branchId,
      type: "RADIUS",
      distanceMode: STRAIGHT_LINE_DISTANCE_MODE,
      status: "ACTIVE"
    },
    select: { id: true }
  });

  if (!radiusRange) {
    throw new AppError("Cadastre uma faixa de distancia ativa antes da taxa acima da maior faixa.", 400);
  }

  const existingOverflow = await prisma.deliveryZone.findFirst({
    where: {
      tenantId,
      branchId: data.branchId,
      type: "RADIUS_OVERFLOW",
      distanceMode: STRAIGHT_LINE_DISTANCE_MODE,
      status: "ACTIVE",
      id: currentId ? { not: currentId } : undefined
    },
    select: { id: true }
  });

  if (existingOverflow) {
    throw new AppError("Esta filial ja possui uma taxa para distancias acima da maior faixa.", 409);
  }
}

function toDeliveryZoneData(data: DeliveryZoneInput) {
  return {
    branchId: data.branchId,
    name: data.name,
    type: data.type,
    neighborhood: data.type === "NEIGHBORHOOD" ? data.neighborhood?.trim() : null,
    postalCodeStart: null,
    postalCodeEnd: null,
    radiusKm: data.type === "RADIUS" && data.radiusKm !== undefined ? new Prisma.Decimal(data.radiusKm) : null,
    distanceMode: STRAIGHT_LINE_DISTANCE_MODE,
    color: data.type === "RADIUS" || data.type === "RADIUS_OVERFLOW" ? data.color ?? DEFAULT_RADIUS_COLOR : null,
    fee: new Prisma.Decimal(data.fee),
    minimumOrderValue: new Prisma.Decimal(data.minimumOrderValue ?? 0),
    estimatedMinutes: data.estimatedMinutes,
    status: data.status ?? "ACTIVE"
  };
}

function toAuditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

export const listDeliveryZones = async (tenantId: string) => {
  const method = await getDeliveryCalculationMethod(tenantId);

  return prisma.deliveryZone.findMany({
    where: { tenantId, ...deliveryMethodWhere(method) },
    include: includeBranch,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
};

export const listPublicDeliveryZones = async (tenantSlug: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, include: { settings: true } });

  if (!tenant || !["ACTIVE", "TRIAL"].includes(tenant.status)) {
    throw new AppError("Tenant not found or unavailable", 404);
  }

  const method = normalizeDeliveryCalculationMethod(tenant.settings?.deliveryCalculationMethod);

  return prisma.deliveryZone.findMany({
    where: {
      tenantId: tenant.id,
      ...deliveryMethodWhere(method),
      status: "ACTIVE",
      branch: { status: "ACTIVE", acceptsDelivery: true, deletedAt: null }
    },
    include: includeBranch,
    orderBy: [{ minimumOrderValue: "desc" }, { fee: "asc" }]
  });
};

export const createDeliveryZone = async (tenantId: string, data: DeliveryZoneInput, userId?: string) => {
  await ensureBranch(tenantId, data.branchId);
  await ensureSelectedCalculationMethod(tenantId, data);
  await ensureRadiusOverflowRule(tenantId, data);

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

  if (current.branchId !== data.branchId) {
    throw new AppError("A filial de uma area existente nao pode ser alterada.", 400);
  }

  await ensureBranch(tenantId, data.branchId);
  await ensureSelectedCalculationMethod(tenantId, data);
  await ensureRadiusOverflowRule(tenantId, data, id);

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

export const updateDeliveryCalculationMethod = async (
  tenantId: string,
  method: DeliveryCalculationMethod,
  userId?: string
) => {
  const previousMethod = await getDeliveryCalculationMethod(tenantId);

  if (previousMethod === method) {
    return { method };
  }

  await prisma.$transaction(async (transaction) => {
    const settings = await transaction.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, deliveryCalculationMethod: method },
      update: { deliveryCalculationMethod: method },
      select: { id: true }
    });

    await transaction.deliveryZone.updateMany({
      where: {
        tenantId,
        status: "ACTIVE",
        NOT: deliveryMethodWhere(method)
      },
      data: { status: "INACTIVE" }
    });

    await transaction.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "tenant.delivery_calculation_method_updated",
        entity: "TenantSettings",
        entityId: settings.id,
        before: { method: previousMethod },
        after: { method }
      }
    });
  });

  return { method };
};

export const deleteDeliveryZone = async (tenantId: string, id: string, userId?: string) => {
  const current = await prisma.deliveryZone.findFirst({ where: { id, tenantId } });

  if (!current) {
    throw new AppError("Delivery zone not found", 404);
  }

  await prisma.deliveryZone.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "tenant.delivery_zone_deleted",
      entity: "DeliveryZone",
      entityId: id,
      before: toAuditJson(current)
    }
  });
};
