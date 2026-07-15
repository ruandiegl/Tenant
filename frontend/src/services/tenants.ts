import { Tenant, TenantSettings } from "../types/database";
import { api, getAuthToken, getTenantId, protectedApi } from "./api";

const TENANT_SLUG = import.meta.env.VITE_DEMO_TENANT_SLUG ?? "demo-burger";

type PublicTenantResponse = Tenant & {
  settings: TenantSettings;
};

function normalizeDeliveryCalculationMethod(method: unknown): TenantSettings["deliveryCalculationMethod"] {
  return method === "NEIGHBORHOOD" ? "NEIGHBORHOOD" : "STRAIGHT_LINE";
}

export const tenantsService = {
  getCurrentTenant: async (publicTenantSlug?: string | null) => {
    if (!publicTenantSlug && getAuthToken() && getTenantId()) {
      const bundle = await protectedApi<{ tenant: Tenant; settings: TenantSettings }>("/tenant/settings");

      return {
        tenant: bundle.tenant,
        settings: {
          ...bundle.settings,
          minimumOrderValue: Number(bundle.settings.minimumOrderValue),
          defaultPreparationTime: Number(bundle.settings.defaultPreparationTime),
          logoUrl:
            bundle.settings.logoUrl ||
            "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
          primaryColor: bundle.settings.primaryColor || "#0f766e",
          secondaryColor: bundle.settings.secondaryColor || "#27ae51",
          deliveryCalculationMethod: normalizeDeliveryCalculationMethod(bundle.settings.deliveryCalculationMethod)
        }
      };
    }

    const tenant = await api<PublicTenantResponse>(`/tenants/${publicTenantSlug ?? TENANT_SLUG}/public`);

    return {
      tenant,
      settings: {
        ...tenant.settings,
        minimumOrderValue: Number(tenant.settings.minimumOrderValue),
        defaultPreparationTime: Number(tenant.settings.defaultPreparationTime),
        logoUrl:
          tenant.settings.logoUrl ||
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
          primaryColor: tenant.settings.primaryColor || "#0f766e",
          deliveryCalculationMethod: normalizeDeliveryCalculationMethod(tenant.settings.deliveryCalculationMethod)
      }
    };
  },
  updateCurrentTenant: async (
    payload: Partial<Omit<Tenant, "legalName" | "document" | "email" | "phone">> & {
      email?: string | null;
      phone?: string | null;
      settings?: Partial<Omit<TenantSettings, "legalName" | "description" | "slogan" | "businessType" | "cuisineCategory" | "websiteUrl" | "instagramUrl" | "whatsapp" | "logoUrl" | "coverImageUrl" | "welcomeMessage">> & {
        description?: string | null;
        slogan?: string | null;
        businessType?: string | null;
        cuisineCategory?: string | null;
        websiteUrl?: string | null;
        instagramUrl?: string | null;
        whatsapp?: string | null;
        logoUrl?: string | null;
        coverImageUrl?: string | null;
        welcomeMessage?: string | null;
      };
    }
  ) => {
    const bundle = await protectedApi<{ tenant: Tenant; settings: TenantSettings }>("/tenant/settings", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });

    return {
      tenant: bundle.tenant,
      settings: {
        ...bundle.settings,
        minimumOrderValue: Number(bundle.settings.minimumOrderValue),
        defaultPreparationTime: Number(bundle.settings.defaultPreparationTime),
        logoUrl: bundle.settings.logoUrl || "",
        primaryColor: bundle.settings.primaryColor || "#0f766e",
        secondaryColor: bundle.settings.secondaryColor || "#27ae51",
        deliveryCalculationMethod: normalizeDeliveryCalculationMethod(bundle.settings.deliveryCalculationMethod)
      }
    };
  }
};
