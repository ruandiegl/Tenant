import { TenantUser } from "../types/database";
import { clearSession, loginRequest, protectedApi } from "./api";

type MeResponse = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  memberships: Array<{
    tenant: { id: string };
    role: string;
    branch?: { id: string };
    permissions: string[];
  }>;
};

function mapMeToTenantUser(me: MeResponse): TenantUser {
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
    roleName: membership?.role ?? "admin",
    permissions: membership?.permissions ?? []
  };
}

export const authService = {
  login: async (credentials: { email: string; password: string; tenantSlug: string }) => {
    await loginRequest(credentials);
    return mapMeToTenantUser(await protectedApi<MeResponse>("/auth/me"));
  },
  getCurrentUser: async () => mapMeToTenantUser(await protectedApi<MeResponse>("/auth/me")),
  logout: async () => {
    clearSession();
  }
};
