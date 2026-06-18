import { createContext, PropsWithChildren, useContext } from "react";
import { mockTenantBundle } from "../../data/mock";
import { Tenant, TenantSettings } from "../../types/database";

type TenantContextValue = {
  tenant: Tenant;
  settings: TenantSettings;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: PropsWithChildren) {
  return <TenantContext.Provider value={mockTenantBundle}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant must be used inside TenantProvider");
  }

  return context;
}
