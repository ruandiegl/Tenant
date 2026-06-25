import { createContext, PropsWithChildren, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { mockTenantBundle } from "../../data/mock";
import { tenantsService } from "../../services/tenants";
import { Tenant, TenantSettings } from "../../types/database";
import { getTenantId } from "../../services/api";
import { getPublicTenantSlug } from "../../utils/public-tenant-route";

type TenantContextValue = {
  tenant: Tenant;
  settings: TenantSettings;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: PropsWithChildren) {
  const location = useLocation();
  const publicTenantSlug = getPublicTenantSlug(location.pathname);
  const shouldFetchTenant = Boolean(publicTenantSlug || getTenantId());
  const { data, isLoading } = useQuery({
    enabled: shouldFetchTenant,
    queryKey: ["tenant", "current", publicTenantSlug ?? getTenantId() ?? "default"],
    queryFn: () => tenantsService.getCurrentTenant(publicTenantSlug),
    retry: 1
  });
  const tenantBundle = data ?? mockTenantBundle;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand", tenantBundle.settings.primaryColor || "#1a6b3b");
    root.style.setProperty("--accent", tenantBundle.settings.secondaryColor || "#27ae51");
  }, [tenantBundle.settings.primaryColor, tenantBundle.settings.secondaryColor]);

  if (shouldFetchTenant && isLoading && !data) {
    return <section className="screen"><div className="panel">Carregando restaurante...</div></section>;
  }

  return <TenantContext.Provider value={tenantBundle}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant must be used inside TenantProvider");
  }

  return context;
}
