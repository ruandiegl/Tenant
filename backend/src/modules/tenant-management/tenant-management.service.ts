import { Prisma, type TenantStatus } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

const PLAN_LIMITS = {
  TRIAL: { branches: 1, users: 2, products: 20, coupons: 2, label: "Trial" },
  BASIC: { branches: 1, users: 5, products: 100, coupons: 10, label: "Basic" },
  PRO: { branches: 5, users: 20, products: null, coupons: null, label: "Pro" },
  ENTERPRISE: { branches: null, users: null, products: null, coupons: null, label: "Enterprise" }
} as const;

type PlanName = keyof typeof PLAN_LIMITS;

type Actor = {
  userId?: string;
  ip?: string;
  userAgent?: string;
};

type ListTenantsParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: TenantStatus;
  plan?: string;
};

type TenantCreateInput = {
  name: string;
  slug: string;
  planId?: string;
  planName: PlanName;
  adminName?: string;
  adminEmail: string;
  document?: string;
  email?: string;
  phone?: string;
  status: TenantStatus;
  settings?: {
    brandName?: string;
    logoUrl?: string;
    primaryColor?: string;
    allowGuestCheckout?: boolean;
    autoAcceptOrders?: boolean;
    defaultPreparationTime?: number;
    minimumOrderValue?: number;
  };
};

type TenantUpdateInput = {
  name?: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  settings?: {
    brandName?: string;
    logoUrl?: string | null;
    primaryColor?: string;
    allowGuestCheckout?: boolean;
    autoAcceptOrders?: boolean;
    defaultPreparationTime?: number;
    minimumOrderValue?: number;
  };
};

const tenantInclude = {
  settings: true,
  plan: true,
  _count: {
    select: {
      branches: true,
      users: true
    }
  }
} satisfies Prisma.TenantInclude;

function normalizePlanName(planName?: string | null, status?: TenantStatus): PlanName {
  const upperName = planName?.toUpperCase();

  if (upperName === "BASIC" || upperName === "PRO" || upperName === "ENTERPRISE" || upperName === "TRIAL") {
    return upperName;
  }

  return status === "TRIAL" ? "TRIAL" : "BASIC";
}

async function resolvePlan(planId?: string | null, planName?: PlanName | null) {
  if (planId) {
    return prisma.plan.findUnique({ where: { id: planId } });
  }

  if (!planName) {
    return null;
  }

  return prisma.plan.findFirst({ where: { name: planName } });
}

async function getUsageCounts(tenantId: string) {
  const [branches, users, products, coupons, ordersLast30Days] = await Promise.all([
    prisma.branch.count({ where: { tenantId, deletedAt: null } }),
    prisma.tenantUser.count({ where: { tenantId, status: { not: "DISABLED" } } }),
    prisma.product.count({ where: { tenantId, deletedAt: null, status: { not: "ARCHIVED" } } }),
    prisma.coupon.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.order.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    })
  ]);

  return { branches, users, products, coupons, ordersLast30Days };
}

function usageWithLimits(counts: Awaited<ReturnType<typeof getUsageCounts>>, planName: PlanName) {
  const limits = PLAN_LIMITS[planName];

  return {
    planName,
    ordersLast30Days: counts.ordersLast30Days,
    resources: {
      branches: { used: counts.branches, limit: limits.branches },
      users: { used: counts.users, limit: limits.users },
      products: { used: counts.products, limit: limits.products },
      coupons: { used: counts.coupons, limit: limits.coupons }
    }
  };
}

async function mapTenant(tenant: Prisma.TenantGetPayload<{ include: typeof tenantInclude }>) {
  const planName = normalizePlanName(tenant.plan?.name, tenant.status);
  const counts = await getUsageCounts(tenant.id);

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    document: tenant.document,
    email: tenant.email,
    phone: tenant.phone,
    status: tenant.status,
    plan: tenant.plan
      ? { id: tenant.plan.id, name: tenant.plan.name, price: Number(tenant.plan.price) }
      : { id: null, name: planName, price: 0 },
    settings: tenant.settings
      ? {
          ...tenant.settings,
          minimumOrderValue: Number(tenant.settings.minimumOrderValue)
        }
      : null,
    counts: {
      branches: tenant._count.branches,
      users: tenant._count.users
    },
    usage: usageWithLimits(counts, planName),
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt
  };
}

async function createAuditLog(input: {
  tenantId?: string;
  actor: Actor;
  action: string;
  entity: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.actor.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      ip: input.actor.ip,
      userAgent: input.actor.userAgent
    }
  });
}

async function ensureTenantAdminRole(tenantId: string) {
  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: "admin" } },
    create: {
      tenantId,
      name: "admin",
      description: "Administrador do tenant",
      isSystem: true
    },
    update: {}
  });

  const permissions = await prisma.permission.findMany({
    where: {
      key: {
        startsWith: "tenant."
      }
    }
  });

  if (permissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: adminRole.id,
        permissionId: permission.id
      })),
      skipDuplicates: true
    });
  }

  return adminRole;
}

async function ensureKitchenRole(tenantId: string) {
  const kitchenRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: "kitchen" } },
    create: {
      tenantId,
      name: "kitchen",
      description: "Operador de cozinha",
      isSystem: true
    },
    update: {}
  });

  const permissions = await prisma.permission.findMany({
    where: {
      key: { in: ["tenant.orders.read", "tenant.kitchen.read", "tenant.kitchen.write"] }
    }
  });

  if (permissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: kitchenRole.id,
        permissionId: permission.id
      })),
      skipDuplicates: true
    });
  }

  return kitchenRole;
}

export const listPlans = async () => {
  const plans = await prisma.plan.findMany({
    where: { status: "ACTIVE" },
    orderBy: { price: "asc" }
  });

  const persistedNames = new Set(plans.map((plan) => plan.name.toUpperCase()));
  const fallbackPlans = Object.entries(PLAN_LIMITS)
    .filter(([name]) => !persistedNames.has(name))
    .map(([name, limits]) => ({
      id: null,
      name,
      description: `${limits.label} PodePedir`,
      price: 0,
      limits
    }));

  return [
    ...plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price),
      limits: PLAN_LIMITS[normalizePlanName(plan.name)]
    })),
    ...fallbackPlans
  ];
};

export const listTenants = async (params: ListTenantsParams) => {
  const where: Prisma.TenantWhereInput = {
    deletedAt: null,
    status: params.status,
    OR: params.search
      ? [
          { name: { contains: params.search, mode: "insensitive" } },
          { slug: { contains: params.search, mode: "insensitive" } },
          { email: { contains: params.search, mode: "insensitive" } }
        ]
      : undefined
  };

  if (params.plan) {
    where.plan = { name: { equals: params.plan } };
  }

  const [total, tenants] = await Promise.all([
    prisma.tenant.count({ where }),
    prisma.tenant.findMany({
      where,
      include: tenantInclude,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize
    })
  ]);

  return {
    data: await Promise.all(tenants.map(mapTenant)),
    meta: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize))
    }
  };
};

export const createTenant = async (data: TenantCreateInput, actor: Actor) => {
  const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } });

  if (existing) {
    throw new AppError("Slug already in use", 409);
  }

  const plan = await resolvePlan(data.planId, data.planName);
  const tenant = await prisma.$transaction(async (tx) => {
    const createdTenant = await tx.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        document: data.document,
        email: data.email,
        phone: data.phone,
        status: data.status,
        planId: plan?.id,
        settings: {
          create: {
            brandName: data.settings?.brandName ?? data.name,
            logoUrl: data.settings?.logoUrl,
            primaryColor: data.settings?.primaryColor ?? "#1a6b3b",
            allowGuestCheckout: data.settings?.allowGuestCheckout ?? true,
            autoAcceptOrders: data.settings?.autoAcceptOrders ?? false,
            defaultPreparationTime: data.settings?.defaultPreparationTime ?? 30,
            minimumOrderValue: new Prisma.Decimal(data.settings?.minimumOrderValue ?? 0)
          }
        },
        branches: {
          create: {
            name: "Matriz",
            slug: "matriz",
            email: data.email,
            phone: data.phone
          }
        }
      }
    });

    return createdTenant;
  });

  const adminRole = await ensureTenantAdminRole(tenant.id);
  await ensureKitchenRole(tenant.id);

  const adminUser = await prisma.user.upsert({
    where: { email: data.adminEmail },
    create: {
      name: data.adminName ?? data.adminEmail.split("@")[0],
      email: data.adminEmail,
      status: "INVITED"
    },
    update: {
      name: data.adminName
    }
  });

  await prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: adminUser.id } },
    create: {
      tenantId: tenant.id,
      userId: adminUser.id,
      roleId: adminRole.id,
      status: "INVITED"
    },
    update: {
      roleId: adminRole.id,
      status: "INVITED"
    }
  });

  await createAuditLog({
    tenantId: tenant.id,
    actor,
    action: "tenant.created",
    entity: "Tenant",
    entityId: tenant.id,
    after: {
      name: data.name,
      slug: data.slug,
      status: data.status,
      planName: plan?.name ?? data.planName,
      adminEmail: data.adminEmail
    }
  });

  return getTenant(tenant.id);
};

export const getTenant = async (id: string) => {
  const tenant = await prisma.tenant.findFirst({
    where: { id, deletedAt: null },
    include: {
      ...tenantInclude,
      branches: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: 8
      },
      users: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          user: true,
          role: true
        }
      }
    }
  });

  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  const mapped = await mapTenant(tenant);
  const auditLogs = await prisma.auditLog.findMany({
    where: { tenantId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: true }
  });

  return {
    ...mapped,
    branches: tenant.branches,
    users: tenant.users.map((membership) => ({
      id: membership.id,
      status: membership.status,
      role: membership.role.name,
      createdAt: membership.createdAt,
      user: {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        status: membership.user.status,
        lastLoginAt: membership.user.lastLoginAt
      }
    })),
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      before: log.before,
      after: log.after,
      ip: log.ip,
      createdAt: log.createdAt,
      user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : null
    }))
  };
};

export const updateTenant = async (id: string, data: TenantUpdateInput, actor: Actor) => {
  const tenant = await prisma.tenant.findFirst({ where: { id, deletedAt: null }, include: { settings: true } });

  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  const updated = await prisma.tenant.update({
    where: { id },
    data: {
      name: data.name,
      document: data.document,
      email: data.email,
      phone: data.phone,
      settings: data.settings
        ? {
            upsert: {
              create: {
                brandName: data.settings.brandName ?? data.name ?? tenant.name,
                logoUrl: data.settings.logoUrl,
                primaryColor: data.settings.primaryColor ?? "#1a6b3b",
                allowGuestCheckout: data.settings.allowGuestCheckout ?? true,
                autoAcceptOrders: data.settings.autoAcceptOrders ?? false,
                defaultPreparationTime: data.settings.defaultPreparationTime ?? 30,
                minimumOrderValue: new Prisma.Decimal(data.settings.minimumOrderValue ?? 0)
              },
              update: {
                brandName: data.settings.brandName,
                logoUrl: data.settings.logoUrl,
                primaryColor: data.settings.primaryColor,
                allowGuestCheckout: data.settings.allowGuestCheckout,
                autoAcceptOrders: data.settings.autoAcceptOrders,
                defaultPreparationTime: data.settings.defaultPreparationTime,
                minimumOrderValue:
                  data.settings.minimumOrderValue === undefined
                    ? undefined
                    : new Prisma.Decimal(data.settings.minimumOrderValue)
              }
            }
          }
        : undefined
    },
    include: tenantInclude
  });

  await createAuditLog({
    tenantId: id,
    actor,
    action: "tenant.updated",
    entity: "Tenant",
    entityId: id,
    before: {
      name: tenant.name,
      document: tenant.document,
      email: tenant.email,
      phone: tenant.phone,
      settings: tenant.settings
    },
    after: data as Prisma.InputJsonObject
  });

  return mapTenant(updated);
};

export const updateTenantStatus = async (id: string, status: TenantStatus, reason: string, actor: Actor) => {
  const tenant = await prisma.tenant.findFirst({ where: { id, deletedAt: null } });

  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  if (tenant.status === "CANCELLED" && status !== "CANCELLED") {
    throw new AppError("Cancelled tenants are read-only", 409);
  }

  const updated = await prisma.tenant.update({
    where: { id },
    data: { status },
    include: tenantInclude
  });

  await createAuditLog({
    tenantId: id,
    actor,
    action: "tenant.status_changed",
    entity: "Tenant",
    entityId: id,
    before: { status: tenant.status },
    after: { status, reason }
  });

  return mapTenant(updated);
};

export const updateTenantPlan = async (id: string, planId: string | null | undefined, planName: PlanName | undefined, reason: string | undefined, actor: Actor) => {
  const tenant = await prisma.tenant.findFirst({ where: { id, deletedAt: null }, include: { plan: true } });

  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  const plan = planId === null ? null : await resolvePlan(planId, planName);

  if ((planId || planName) && !plan) {
    throw new AppError("Plan not found", 404);
  }

  const updated = await prisma.tenant.update({
    where: { id },
    data: {
      planId: plan?.id ?? null,
      status: planName === "TRIAL" ? "TRIAL" : tenant.status === "TRIAL" ? "ACTIVE" : undefined
    },
    include: tenantInclude
  });

  await createAuditLog({
    tenantId: id,
    actor,
    action: "tenant.plan_changed",
    entity: "Tenant",
    entityId: id,
    before: { planId: tenant.planId, planName: tenant.plan?.name },
    after: { planId: plan?.id ?? null, planName: plan?.name ?? planName ?? null, reason }
  });

  return mapTenant(updated);
};

export const getTenantUsage = async (id: string) => {
  const tenant = await prisma.tenant.findFirst({ where: { id, deletedAt: null }, include: { plan: true } });

  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  return usageWithLimits(await getUsageCounts(id), normalizePlanName(tenant.plan?.name, tenant.status));
};

export const listAuditLogs = async (params: {
  page: number;
  pageSize: number;
  tenantId?: string;
  action?: string;
  entity?: string;
}) => {
  const where: Prisma.AuditLogWhereInput = {
    tenantId: params.tenantId,
    action: params.action ? { contains: params.action, mode: "insensitive" } : undefined,
    entity: params.entity ? { contains: params.entity, mode: "insensitive" } : undefined
  };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: { user: true }
    })
  ]);

  return {
    data: logs.map((log) => ({
      id: log.id,
      tenantId: log.tenantId,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      before: log.before,
      after: log.after,
      ip: log.ip,
      createdAt: log.createdAt,
      user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : null
    })),
    meta: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize))
    }
  };
};
