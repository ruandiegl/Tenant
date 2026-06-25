import { TenantStatus, UserStatus } from "../types/database";
import { protectedApi } from "./api";

export type PlanName = "TRIAL" | "BASIC" | "PRO" | "ENTERPRISE";

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
    logoUrl?: string | null;
    primaryColor?: string | null;
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
  id: string | null;
  name: PlanName | string;
  description?: string | null;
  price: number;
  limits: {
    branches: number | null;
    users: number | null;
    products: number | null;
    coupons: number | null;
  };
};

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
  planName: PlanName;
  adminName?: string;
  adminEmail: string;
  email?: string;
  phone?: string;
  settings?: {
    brandName?: string;
    primaryColor?: string;
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
  listPlans: () => protectedApi<PlatformPlan[]>("/admin/tenants/plans"),
  listTenants: (params: { page?: number; pageSize?: number; search?: string; status?: TenantStatus | "" }) =>
    protectedApi<Paginated<TenantManagementSummary>>(`/admin/tenants${toQuery(params)}`),
  createTenant: (payload: TenantCreatePayload) =>
    protectedApi<TenantManagementDetail>("/admin/tenants", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getTenant: (id: string) => protectedApi<TenantManagementDetail>(`/admin/tenants/${id}`),
  updateTenantStatus: (id: string, payload: { status: TenantStatus; reason: string }) =>
    protectedApi<TenantManagementSummary>(`/admin/tenants/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  updateTenantPlan: (id: string, payload: { planName: PlanName; reason?: string }) =>
    protectedApi<TenantManagementSummary>(`/admin/tenants/${id}/plan`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  listAuditLogs: (params: { page?: number; pageSize?: number; tenantId?: string; action?: string }) =>
    protectedApi<Paginated<AuditLogEntry>>(`/admin/audit-logs${toQuery(params)}`)
};
