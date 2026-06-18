import { Tenant, TenantSettings } from "../types/database";
import { api } from "./api";

const TENANT_SLUG = import.meta.env.VITE_DEMO_TENANT_SLUG ?? "demo-burger";

type PublicTenantResponse = Tenant & {
  settings: TenantSettings;
};

export const tenantsService = {
  getCurrentTenant: async () => {
    const tenant = await api<PublicTenantResponse>(`/tenants/${TENANT_SLUG}/public`);

    return {
      tenant,
      settings: {
        ...tenant.settings,
        minimumOrderValue: Number(tenant.settings.minimumOrderValue),
        defaultPreparationTime: Number(tenant.settings.defaultPreparationTime),
        logoUrl:
          tenant.settings.logoUrl ||
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
        primaryColor: tenant.settings.primaryColor || "#0f766e"
      }
    };
  }
};
