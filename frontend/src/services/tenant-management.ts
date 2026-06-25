import { TenantStatus, UserStatus } from "../types/database";
import { protectedApi } from "./api";

export type PlanName = "TRIAL" | "BASIC" | "PRO" | "ENTERPRISE";
export type RecordStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type UsageResource = {
  used: number;
  limit: number | null;
};

export type TenantUsage = {
  planName: PlanName;
  ordersLast30Days: number;
  resources: {
    branches: UsageResource;
    users: UsageResource;
    products: UsageResource;
    coupons: UsageResource;
  };
};

export type TenantManagementSummary = {
  id: string;
  name: string;
  slug: string;
  legalName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  status: TenantStatus;
  plan: {
    id: string | null;
    name: string;
    price: number;
  };
  settings: {
    brandName?: string | null;
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
    primaryColor?: string | null;
    secondaryColor?: string | null;
    themeFontFamily?: string | null;
    welcomeMessage?: string | null;
    minimumOrderValue: number;
  } | null;
  counts: {
    branches: number;
    users: number;
  };
  usage: TenantUsage;
  createdAt: string;
  updatedAt: string;
};

export type TenantManagementDetail = TenantManagementSummary & {
  branches: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    email?: string | null;
    phone?: string | null;
  }>;
  users: Array<{
    id: string;
    status: UserStatus;
    role: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      status: UserStatus;
      lastLoginAt?: string | null;
    };
  }>;
  auditLogs: AuditLogEntry[];
  invite?: TenantInviteLink;
};

export type TenantInviteLink = {
  email: string;
  role: string;
  expiresAt: string;
  acceptUrl: string;
};

export type AuditLogEntry = {
  id: string;
  tenantId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type PlatformPlan = {
  id: string;
  name: PlanName | string;
  description?: string | null;
  price: number;
  maxUsers?: number | null;
  maxBranches?: number | null;
  status: RecordStatus;
  limits: {
    branches: number | null;
    users: number | null;
    products: number | null;
    coupons: number | null;
    ordersPerMonth: number | null;
  };
  capabilities: {
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
  createdAt: string;
  updatedAt: string;
};

export type PlanMutationPayload = {
  name?: string;
  description?: string | null;
  price?: number;
  maxUsers?: number | null;
  maxBranches?: number | null;
  limits?: {
    products?: number | null;
    coupons?: number | null;
    ordersPerMonth?: number | null;
  };
  capabilities?: Partial<PlatformPlan["capabilities"]>;
  status?: RecordStatus;
};

const defaultPlanCapabilities: PlatformPlan["capabilities"] = {
  onlineOrders: true,
  menuBuilder: true,
  kitchen: true,
  coupons: false,
  reports: false,
  stockControl: true,
  customBranding: false,
  multiBranch: false,
  apiAccess: false,
  prioritySupport: false
};

const fallbackPlans: Array<Partial<PlatformPlan>> = [
  {
    name: "TRIAL",
    description: "Validacao inicial para novos restaurantes.",
    price: 0,
    status: "ACTIVE",
    limits: { branches: 1, users: 2, products: 20, coupons: 2, ordersPerMonth: 100 },
    capabilities: { ...defaultPlanCapabilities, coupons: false, reports: false, stockControl: false }
  },
  {
    name: "BASIC",
    description: "Operacao essencial para um restaurante.",
    price: 99,
    status: "ACTIVE",
    limits: { branches: 1, users: 5, products: 100, coupons: 10, ordersPerMonth: 1000 },
    capabilities: { ...defaultPlanCapabilities, coupons: true, reports: true, stockControl: true, customBranding: true }
  },
  {
    name: "PRO",
    description: "Crescimento com filiais, cupons e relatorios.",
    price: 249,
    status: "ACTIVE",
    limits: { branches: 5, users: 20, products: null, coupons: null, ordersPerMonth: 5000 },
    capabilities: { ...defaultPlanCapabilities, coupons: true, reports: true, stockControl: true, customBranding: true, multiBranch: true }
  },
  {
    name: "ENTERPRISE",
    description: "Operacao avancada para redes e contratos especiais.",
    price: 0,
    status: "ACTIVE",
    limits: { branches: null, users: null, products: null, coupons: null, ordersPerMonth: null },
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
];

function normalizePlan(plan: Partial<PlatformPlan>): PlatformPlan {
  const limits = plan.limits ?? {
    branches: plan.maxBranches ?? null,
    users: plan.maxUsers ?? null,
    products: null,
    coupons: null,
    ordersPerMonth: null
  };

  return {
    id: plan.id ?? "",
    name: plan.name ?? "BASIC",
    description: plan.description ?? null,
    price: Number(plan.price ?? 0),
    maxUsers: plan.maxUsers ?? limits.users ?? null,
    maxBranches: plan.maxBranches ?? limits.branches ?? null,
    status: plan.status ?? "ACTIVE",
    limits: {
      branches: limits.branches ?? null,
      users: limits.users ?? null,
      products: limits.products ?? null,
      coupons: limits.coupons ?? null,
      ordersPerMonth: limits.ordersPerMonth ?? null
    },
    capabilities: {
      ...defaultPlanCapabilities,
      ...(plan.capabilities ?? {})
    },
    createdAt: plan.createdAt ?? "",
    updatedAt: plan.updatedAt ?? ""
  };
}

type Paginated<T> = {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type TenantCreatePayload = {
  name: string;
  slug: string;
  legalName?: string;
  document?: string;
  planId?: string;
  planName: PlanName;
  adminName?: string;
  adminEmail: string;
  email?: string;
  phone?: string;
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
  };
};

export type TenantUpdatePayload = {
  name?: string;
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

function toQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const tenantManagementService = {
  listPlans: async () => {
    try {
      const plans = await protectedApi<Array<Partial<PlatformPlan>>>("/admin/tenants/plans");
      return plans.map(normalizePlan);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return fallbackPlans.map(normalizePlan);
      }

      throw error;
    }
  },
  createPlan: (payload: Required<Pick<PlanMutationPayload, "name">> & PlanMutationPayload) =>
    protectedApi<PlatformPlan>("/admin/tenants/plans", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updatePlan: (id: string, payload: PlanMutationPayload) =>
    protectedApi<PlatformPlan>(`/admin/tenants/plans/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deletePlan: (id: string) =>
    protectedApi<PlatformPlan>(`/admin/tenants/plans/${id}`, {
      method: "DELETE"
    }),
  listTenants: (params: { page?: number; pageSize?: number; search?: string; status?: TenantStatus | "" }) =>
    protectedApi<Paginated<TenantManagementSummary>>(`/admin/tenants${toQuery(params)}`),
  createTenant: (payload: TenantCreatePayload) =>
    protectedApi<TenantManagementDetail>("/admin/tenants", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getTenant: (id: string) => protectedApi<TenantManagementDetail>(`/admin/tenants/${id}`),
  updateTenant: (id: string, payload: TenantUpdatePayload) =>
    protectedApi<TenantManagementSummary>(`/admin/tenants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteTenant: (id: string) =>
    protectedApi<void>(`/admin/tenants/${id}`, {
      method: "DELETE"
    }),
  updateTenantStatus: (id: string, payload: { status: TenantStatus; reason: string }) =>
    protectedApi<TenantManagementSummary>(`/admin/tenants/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  updateTenantPlan: (id: string, payload: { planId?: string | null; planName?: PlanName; reason?: string }) =>
    protectedApi<TenantManagementSummary>(`/admin/tenants/${id}/plan`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  createInviteLink: (tenantId: string, tenantUserId: string) =>
    protectedApi<TenantInviteLink>(`/admin/tenants/${tenantId}/users/${tenantUserId}/invite-link`, {
      method: "POST"
    }),
  listAuditLogs: (params: { page?: number; pageSize?: number; tenantId?: string; action?: string }) =>
    protectedApi<Paginated<AuditLogEntry>>(`/admin/audit-logs${toQuery(params)}`)
};
