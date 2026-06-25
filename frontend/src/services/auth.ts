import { PlanCapabilities, TenantUser } from "../types/database";
import { api, clearSession, loginRequest, protectedApi, setSession } from "./api";

type MeResponse = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isPlatformAdmin?: boolean;
  platform?: {
    role: string;
    permissions: string[];
  };
  memberships: Array<{
    tenant: {
      id: string;
      plan?: {
        id: string;
        name: string;
        capabilities: PlanCapabilities;
      } | null;
    };
    role: string;
    branch?: { id: string };
    permissions: string[];
  }>;
};

function mapMeToTenantUser(me: MeResponse): TenantUser {
  if (me.isPlatformAdmin && me.platform) {
    return {
      id: me.id,
      tenantId: "",
      userId: me.id,
      roleId: me.platform.role,
      status: "ACTIVE",
      name: me.name,
      email: me.email,
      phone: me.phone,
      roleName: me.platform.role,
      permissions: me.platform.permissions,
      plan: null,
      isPlatformAdmin: true
    };
  }

  const membership = me.memberships[0];

  return {
    id: me.id,
    tenantId: membership?.tenant.id ?? "",
    userId: me.id,
    roleId: membership?.role ?? "",
    branchId: membership?.branch?.id,
    status: "ACTIVE",
    name: me.name,
    email: me.email,
    phone: me.phone,
    roleName: membership?.role ?? "admin",
    permissions: membership?.permissions ?? [],
    plan: membership?.tenant.plan ?? null,
    isPlatformAdmin: false
  };
}

export const authService = {
  login: async (credentials: { email: string; password: string; tenantSlug?: string }) => {
    await loginRequest(credentials);
    return mapMeToTenantUser(await protectedApi<MeResponse>("/auth/me"));
  },
  getCurrentUser: async () => mapMeToTenantUser(await protectedApi<MeResponse>("/auth/me")),
  updateProfile: async (payload: { name?: string; email?: string; phone?: string | null; currentPassword?: string; password?: string }) => {
    await protectedApi<{ id: string; name: string; email: string; phone?: string | null }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });

    return mapMeToTenantUser(await protectedApi<MeResponse>("/auth/me"));
  },
  logout: async () => {
    clearSession();
  }
};

export type InviteInfo = {
  email: string;
  role: string;
  expiresAt: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
    brandName: string;
    primaryColor: string;
    secondaryColor: string;
  };
};

export const publicInviteService = {
  getInvite: async (token: string) => api<InviteInfo>(`/auth/invite/${token}`),
  acceptInvite: async (payload: { token: string; password: string; name?: string }) => {
    const response = await api<{ token: string; tenant: { id: string }; permissions: string[] }>("/auth/accept-invite", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    setSession(response.token, response.tenant.id);
    return response;
  }
};
