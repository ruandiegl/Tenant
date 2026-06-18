import { createContext, PropsWithChildren, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { mockTenantBundle } from "../../data/mock";
import { tenantsService } from "../../services/tenants";
import { Tenant, TenantSettings } from "../../types/database";

type TenantContextValue = {
  tenant: Tenant;
  settings: TenantSettings;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: PropsWithChildren) {
  const { data = mockTenantBundle } = useQuery({
    queryKey: ["tenant", "current"],
    queryFn: tenantsService.getCurrentTenant,
    retry: 1
  });

  return <TenantContext.Provider value={data}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant must be used inside TenantProvider");
  }

  return context;
}
