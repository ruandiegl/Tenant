import { Prisma, type RecordStatus, type TenantStatus } from "@prisma/client";
import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

const DEFAULT_PLAN_DEFINITIONS = {
  TRIAL: {
    label: "Trial",
    description: "Validacao inicial para novos restaurantes.",
    price: 0,
    maxBranches: 1,
    maxUsers: 2,
    features: {
      limits: { products: 20, coupons: 2, ordersPerMonth: 100 },
      capabilities: {
        onlineOrders: true,
        menuBuilder: true,
        kitchen: true,
        coupons: false,
        reports: false,
        stockControl: false,
        customBranding: false,
        multiBranch: false,
        apiAccess: false,
        prioritySupport: false
      }
    }
  },
  BASIC: {
    label: "Basic",
    description: "Operacao essencial para um restaurante.",
    price: 99,
    maxBranches: 1,
    maxUsers: 5,
    features: {
      limits: { products: 100, coupons: 10, ordersPerMonth: 1000 },
      capabilities: {
        onlineOrders: true,
        menuBuilder: true,
        kitchen: true,
        coupons: true,
        reports: true,
        stockControl: true,
        customBranding: true,
        multiBranch: false,
        apiAccess: false,
        prioritySupport: false
      }
    }
  },
  PRO: {
    label: "Pro",
    description: "Crescimento com filiais, cupons e relatorios.",
    price: 249,
    maxBranches: 5,
    maxUsers: 20,
    features: {
      limits: { products: null, coupons: null, ordersPerMonth: 5000 },
      capabilities: {
        onlineOrders: true,
        menuBuilder: true,
        kitchen: true,
        coupons: true,
        reports: true,
        stockControl: true,
        customBranding: true,
        multiBranch: true,
        apiAccess: false,
        prioritySupport: false
      }
    }
  },
  ENTERPRISE: {
    label: "Enterprise",
    description: "Operacao avancada para redes e contratos especiais.",
    price: 0,
    maxBranches: null,
    maxUsers: null,
    features: {
      limits: { products: null, coupons: null, ordersPerMonth: null },
      capabilities: {
        onlineOrders: true,
        menuBuilder: true,
        kitchen: true,
        coupons: true,
        reports: true,
        stockControl: true,
        customBranding: true,
        multiBranch: true,
        apiAccess: true,
        prioritySupport: true
      }
    }
  }
} as const;

type PlanName = keyof typeof DEFAULT_PLAN_DEFINITIONS;

type PlanLimits = {
  branches: number | null;
  users: number | null;
  products: number | null;
  coupons: number | null;
  ordersPerMonth: number | null;
};

type PlanCapabilities = {
  onlineOrders: boolean;
  menuBuilder: boolean;
  kitchen: boolean;
  coupons: boolean;
  reports: boolean;
  stockControl: boolean;
  customBranding: boolean;
  multiBranch: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
};

type PlanFeatures = {
  limits: Omit<PlanLimits, "branches" | "users">;
  capabilities: PlanCapabilities;
};

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
  legalName?: string;
  planId?: string;
  planName: PlanName;
  adminName?: string;
  adminEmail: string;
  document?: string;
  email?: string;
  phone?: string;
  status: TenantStatus;
  branch?: {
    name?: string;
    phone?: string;
    email?: string;
    address: {
      street: string;
      number: string;
      complement?: string;
      district: string;
      city: string;
      state: string;
      postalCode: string;
      reference?: string;
    };
  };
  settings?: {
    brandName?: string;
    legalName?: string;
    description?: string;
    slogan?: string;
    businessType?: string;
    cuisineCategory?: string;
    websiteUrl?: string;
    instagramUrl?: string;
    whatsapp?: string;
    logoUrl?: string;
    coverImageUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    themeFontFamily?: string;
    welcomeMessage?: string;
    allowGuestCheckout?: boolean;
    autoAcceptOrders?: boolean;
    defaultPreparationTime?: number;
    minimumOrderValue?: number;
  };
};

type PlanInput = {
  name: string;
  description?: string | null;
  price?: number;
  maxUsers?: number | null;
  maxBranches?: number | null;
  limits?: Partial<Omit<PlanLimits, "branches" | "users">>;
  capabilities?: Partial<PlanCapabilities>;
  status?: RecordStatus;
};

type TenantUpdateInput = {
  name?: string;
  slug?: string;
  legalName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  settings?: {
    brandName?: string;
    legalName?: string | null;
    description?: string | null;
    slogan?: string | null;
    businessType?: string | null;
    cuisineCategory?: string | null;
    websiteUrl?: string | null;
    instagramUrl?: string | null;
    whatsapp?: string | null;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    themeFontFamily?: string | null;
    welcomeMessage?: string | null;
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

const hashInviteToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

function buildInviteUrl(token: string) {
  return `${env.FRONTEND_URL.replace(/\/$/, "")}/invite/${token}`;
}

function normalizePlanName(planName?: string | null, status?: TenantStatus): PlanName {
  const upperName = planName?.toUpperCase();

  if (upperName === "BASIC" || upperName === "PRO" || upperName === "ENTERPRISE" || upperName === "TRIAL") {
    return upperName;
  }

  return status === "TRIAL" ? "TRIAL" : "BASIC";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nullableNumber(value: unknown, fallback: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function defaultPlanFeatures(planName: PlanName): PlanFeatures {
  const defaults = DEFAULT_PLAN_DEFINITIONS[planName].features;
  return {
    limits: { ...defaults.limits },
    capabilities: { ...defaults.capabilities }
  };
}

function extractPlanFeatures(planName: PlanName, features?: Prisma.JsonValue | null): PlanFeatures {
  const defaults = defaultPlanFeatures(planName);
  const root = isObject(features) ? features : {};
  const limits = isObject(root.limits) ? root.limits : {};
  const capabilities = isObject(root.capabilities) ? root.capabilities : {};

  return {
    limits: {
      products: nullableNumber(limits.products, defaults.limits.products),
      coupons: nullableNumber(limits.coupons, defaults.limits.coupons),
      ordersPerMonth: nullableNumber(limits.ordersPerMonth, defaults.limits.ordersPerMonth)
    },
    capabilities: {
      onlineOrders: booleanValue(capabilities.onlineOrders, defaults.capabilities.onlineOrders),
      menuBuilder: booleanValue(capabilities.menuBuilder, defaults.capabilities.menuBuilder),
      kitchen: booleanValue(capabilities.kitchen, defaults.capabilities.kitchen),
      coupons: booleanValue(capabilities.coupons, defaults.capabilities.coupons),
      reports: booleanValue(capabilities.reports, defaults.capabilities.reports),
      stockControl: booleanValue(capabilities.stockControl, defaults.capabilities.stockControl),
      customBranding: booleanValue(capabilities.customBranding, defaults.capabilities.customBranding),
      multiBranch: booleanValue(capabilities.multiBranch, defaults.capabilities.multiBranch),
      apiAccess: booleanValue(capabilities.apiAccess, defaults.capabilities.apiAccess),
      prioritySupport: booleanValue(capabilities.prioritySupport, defaults.capabilities.prioritySupport)
    }
  };
}

function buildPlanFeatures(data: Pick<PlanInput, "limits" | "capabilities">, current?: Prisma.JsonValue | null, planName: PlanName = "BASIC") {
  const base = extractPlanFeatures(planName, current);

  return {
    limits: {
      ...base.limits,
      ...data.limits
    },
    capabilities: {
      ...base.capabilities,
      ...data.capabilities
    }
  } satisfies PlanFeatures;
}

function mapPlan(plan: Prisma.PlanGetPayload<object>) {
  const planName = normalizePlanName(plan.name);
  const features = extractPlanFeatures(planName, plan.features);
  const limits = {
    branches: plan.maxBranches,
    users: plan.maxUsers,
    products: features.limits.products,
    coupons: features.limits.coupons,
    ordersPerMonth: features.limits.ordersPerMonth
  };

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: Number(plan.price),
    maxUsers: plan.maxUsers,
    maxBranches: plan.maxBranches,
    status: plan.status,
    limits,
    capabilities: features.capabilities,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt
  };
}

function mapPlanAudit(plan: Prisma.PlanGetPayload<object>) {
  const mapped = mapPlan(plan);

  return {
    ...mapped,
    createdAt: mapped.createdAt.toISOString(),
    updatedAt: mapped.updatedAt.toISOString()
  };
}

async function ensureDefaultPlans() {
  await Promise.all(
    Object.entries(DEFAULT_PLAN_DEFINITIONS).map(([name, definition]) =>
      prisma.plan.upsert({
        where: { name },
        create: {
          name,
          description: definition.description,
          price: new Prisma.Decimal(definition.price),
          maxUsers: definition.maxUsers,
          maxBranches: definition.maxBranches,
          features: definition.features,
          status: "ACTIVE"
        },
        update: {}
      })
    )
  );
}

async function resolvePlan(planId?: string | null, planName?: PlanName | null) {
  await ensureDefaultPlans();

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

function usageWithLimits(counts: Awaited<ReturnType<typeof getUsageCounts>>, plan?: Prisma.PlanGetPayload<object> | null, status?: TenantStatus) {
  const planName = normalizePlanName(plan?.name, status);
  const features = extractPlanFeatures(planName, plan?.features);
  const limits = {
    branches: plan?.maxBranches ?? DEFAULT_PLAN_DEFINITIONS[planName].maxBranches,
    users: plan?.maxUsers ?? DEFAULT_PLAN_DEFINITIONS[planName].maxUsers,
    products: features.limits.products,
    coupons: features.limits.coupons
  };

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
    legalName: tenant.legalName,
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
    usage: usageWithLimits(counts, tenant.plan, tenant.status),
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
  await ensureDefaultPlans();

  const plans = await prisma.plan.findMany({
    orderBy: [{ status: "asc" }, { price: "asc" }, { name: "asc" }]
  });

  return plans.map(mapPlan);
};

export const createPlan = async (data: PlanInput, actor: Actor) => {
  await ensureDefaultPlans();

  const name = data.name.trim().toUpperCase();
  const planName = normalizePlanName(name);
  const created = await prisma.plan.create({
    data: {
      name,
      description: data.description,
      price: new Prisma.Decimal(data.price ?? 0),
      maxUsers: data.maxUsers,
      maxBranches: data.maxBranches,
      features: buildPlanFeatures(data, null, planName),
      status: data.status ?? "ACTIVE"
    }
  });

  await createAuditLog({
    actor,
    action: "platform.plan_created",
    entity: "Plan",
    entityId: created.id,
    after: mapPlanAudit(created)
  });

  return mapPlan(created);
};

export const updatePlan = async (id: string, data: Partial<PlanInput>, actor: Actor) => {
  const plan = await prisma.plan.findUnique({ where: { id } });

  if (!plan) {
    throw new AppError("Plan not found", 404);
  }

  const nextName = data.name?.trim().toUpperCase();
  const planName = normalizePlanName(nextName ?? plan.name);
  const updated = await prisma.plan.update({
    where: { id },
    data: {
      name: nextName,
      description: data.description,
      price: data.price === undefined ? undefined : new Prisma.Decimal(data.price),
      maxUsers: data.maxUsers,
      maxBranches: data.maxBranches,
      status: data.status,
      features: data.limits || data.capabilities ? buildPlanFeatures(data, plan.features, planName) : undefined
    }
  });

  await createAuditLog({
    actor,
    action: "platform.plan_updated",
    entity: "Plan",
    entityId: id,
    before: mapPlanAudit(plan),
    after: mapPlanAudit(updated)
  });

  return mapPlan(updated);
};

export const deletePlan = async (id: string, actor: Actor) => {
  const plan = await prisma.plan.findUnique({ where: { id }, include: { _count: { select: { tenants: true } } } });

  if (!plan) {
    throw new AppError("Plan not found", 404);
  }

  if (plan._count.tenants > 0) {
    const updated = await prisma.plan.update({ where: { id }, data: { status: "INACTIVE" } });

    await createAuditLog({
      actor,
      action: "platform.plan_disabled",
      entity: "Plan",
      entityId: id,
      before: { status: plan.status },
      after: { status: updated.status }
    });

    return mapPlan(updated);
  }

  await prisma.plan.delete({ where: { id } });

  await createAuditLog({
    actor,
    action: "platform.plan_deleted",
    entity: "Plan",
    entityId: id,
    before: mapPlanAudit(plan)
  });
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
        legalName: data.legalName ?? data.settings?.legalName,
        document: data.document,
        email: data.email,
        phone: data.phone,
        status: data.status,
        planId: plan?.id,
        settings: {
          create: {
            brandName: data.settings?.brandName ?? data.name,
            legalName: data.settings?.legalName ?? data.legalName,
            description: data.settings?.description,
            slogan: data.settings?.slogan,
            businessType: data.settings?.businessType,
            cuisineCategory: data.settings?.cuisineCategory,
            websiteUrl: data.settings?.websiteUrl,
            instagramUrl: data.settings?.instagramUrl,
            whatsapp: data.settings?.whatsapp,
            logoUrl: data.settings?.logoUrl,
            coverImageUrl: data.settings?.coverImageUrl,
            primaryColor: data.settings?.primaryColor ?? "#1a6b3b",
            secondaryColor: data.settings?.secondaryColor ?? "#27ae51",
            themeFontFamily: data.settings?.themeFontFamily ?? "Inter",
            welcomeMessage: data.settings?.welcomeMessage,
            allowGuestCheckout: data.settings?.allowGuestCheckout ?? true,
            autoAcceptOrders: data.settings?.autoAcceptOrders ?? false,
            defaultPreparationTime: data.settings?.defaultPreparationTime ?? 30,
            minimumOrderValue: new Prisma.Decimal(data.settings?.minimumOrderValue ?? 0)
          }
        }
      }
    });

    await tx.branch.create({
      data: {
        tenant: { connect: { id: createdTenant.id } },
        name: data.branch?.name ?? "Matriz",
        slug: "matriz",
        email: data.branch?.email ?? data.email,
        phone: data.branch?.phone ?? data.phone,
        address: data.branch?.address
          ? {
              create: {
                tenantId: createdTenant.id,
                ...data.branch.address
              }
            }
          : undefined
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

  const invite = await createInviteForMembership(tenant.id, adminUser.email, adminRole.name, actor);

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
      adminEmail: data.adminEmail,
      legalName: data.legalName,
      document: data.document
    }
  });

  return {
    ...(await getTenant(tenant.id)),
    invite
  };
};

async function createInviteForMembership(tenantId: string, email: string, role: string, actor: Actor) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  await prisma.tenantInvite.updateMany({
    where: { tenantId, email, acceptedAt: null },
    data: { acceptedAt: new Date() }
  });

  const invite = await prisma.tenantInvite.create({
    data: {
      tenantId,
      email,
      role,
      tokenHash: hashInviteToken(token),
      expiresAt,
      createdByUserId: actor.userId
    }
  });

  await createAuditLog({
    tenantId,
    actor,
    action: "tenant.invite_created",
    entity: "TenantInvite",
    entityId: invite.id,
    after: { email, role, expiresAt: expiresAt.toISOString() }
  });

  return {
    email,
    role,
    expiresAt,
    acceptUrl: buildInviteUrl(token)
  };
}

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

  if (data.slug && data.slug !== tenant.slug) {
    const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } });

    if (existing && existing.id !== id) {
      throw new AppError("Slug already in use", 409);
    }
  }

  const updated = await prisma.tenant.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      legalName: data.legalName,
      document: data.document,
      email: data.email,
      phone: data.phone,
      settings: data.settings
        ? {
            upsert: {
              create: {
                brandName: data.settings.brandName ?? data.name ?? tenant.name,
                legalName: data.settings.legalName ?? data.legalName,
                description: data.settings.description,
                slogan: data.settings.slogan,
                businessType: data.settings.businessType,
                cuisineCategory: data.settings.cuisineCategory,
                websiteUrl: data.settings.websiteUrl,
                instagramUrl: data.settings.instagramUrl,
                whatsapp: data.settings.whatsapp,
                logoUrl: data.settings.logoUrl,
                coverImageUrl: data.settings.coverImageUrl,
                primaryColor: data.settings.primaryColor ?? "#1a6b3b",
                secondaryColor: data.settings.secondaryColor ?? "#27ae51",
                themeFontFamily: data.settings.themeFontFamily ?? "Inter",
                welcomeMessage: data.settings.welcomeMessage,
                allowGuestCheckout: data.settings.allowGuestCheckout ?? true,
                autoAcceptOrders: data.settings.autoAcceptOrders ?? false,
                defaultPreparationTime: data.settings.defaultPreparationTime ?? 30,
                minimumOrderValue: new Prisma.Decimal(data.settings.minimumOrderValue ?? 0)
              },
              update: {
                brandName: data.settings.brandName,
                legalName: data.settings.legalName,
                description: data.settings.description,
                slogan: data.settings.slogan,
                businessType: data.settings.businessType,
                cuisineCategory: data.settings.cuisineCategory,
                websiteUrl: data.settings.websiteUrl,
                instagramUrl: data.settings.instagramUrl,
                whatsapp: data.settings.whatsapp,
                logoUrl: data.settings.logoUrl,
                coverImageUrl: data.settings.coverImageUrl,
                primaryColor: data.settings.primaryColor,
                secondaryColor: data.settings.secondaryColor,
                themeFontFamily: data.settings.themeFontFamily,
                welcomeMessage: data.settings.welcomeMessage,
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
      slug: tenant.slug,
      legalName: tenant.legalName,
      document: tenant.document,
      email: tenant.email,
      phone: tenant.phone,
      settings: tenant.settings
    },
    after: data as Prisma.InputJsonObject
  });

  return mapTenant(updated);
};

export const deleteTenant = async (id: string, actor: Actor) => {
  const tenant = await prisma.tenant.findFirst({ where: { id, deletedAt: null } });

  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  await prisma.tenant.update({
    where: { id },
    data: {
      status: "CANCELLED",
      deletedAt: new Date()
    }
  });

  await createAuditLog({
    tenantId: id,
    actor,
    action: "tenant.deleted",
    entity: "Tenant",
    entityId: id,
    before: { name: tenant.name, slug: tenant.slug, status: tenant.status },
    after: { status: "CANCELLED", deletedAt: new Date().toISOString() }
  });
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

  const selectedPlanName = normalizePlanName(plan?.name, planName === "TRIAL" ? "TRIAL" : undefined);
  const updated = await prisma.tenant.update({
    where: { id },
    data: {
      planId: plan?.id ?? null,
      status: selectedPlanName === "TRIAL" ? "TRIAL" : tenant.status === "TRIAL" ? "ACTIVE" : undefined
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

export const createInviteLink = async (tenantId: string, tenantUserId: string, actor: Actor) => {
  const membership = await prisma.tenantUser.findFirst({
    where: { id: tenantUserId, tenantId },
    include: { user: true, role: true }
  });

  if (!membership) {
    throw new AppError("Tenant user not found", 404);
  }

  if (membership.status === "ACTIVE") {
    throw new AppError("User already accepted the invite", 409);
  }

  return createInviteForMembership(tenantId, membership.user.email, membership.role.name, actor);
};

export const getTenantUsage = async (id: string) => {
  const tenant = await prisma.tenant.findFirst({ where: { id, deletedAt: null }, include: { plan: true } });

  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  return usageWithLimits(await getUsageCounts(id), tenant.plan, tenant.status);
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
