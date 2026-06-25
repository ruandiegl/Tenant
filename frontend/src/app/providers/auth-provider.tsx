import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "../../services/auth";
import { getAuthToken } from "../../services/api";
import { PlanCapabilities, TenantUser } from "../../types/database";

type AuthContextValue = {
  user: TenantUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string; tenantSlug?: string }) => Promise<TenantUser>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
  hasPlanCapability: (capability: keyof PlanCapabilities) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(Boolean(getAuthToken()));
  const { data: user = null, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authService.getCurrentUser,
    enabled: hasToken,
    retry: false
  });
  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: async (nextUser) => {
      queryClient.removeQueries({ queryKey: ["admin-orders"] });
      queryClient.removeQueries({ queryKey: ["admin-summary"] });
      queryClient.removeQueries({ queryKey: ["admin-bundle"] });
      queryClient.removeQueries({ queryKey: ["kitchen-orders"] });
      queryClient.removeQueries({ queryKey: ["order-details"] });
      queryClient.setQueryData(["auth", "me"], nextUser);
      setHasToken(true);
      await queryClient.invalidateQueries({ queryKey: ["tenant", "current"] });
    }
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading: hasToken && isLoading,
      login: async (credentials) => {
        const nextUser = await loginMutation.mutateAsync(credentials);
        await queryClient.invalidateQueries({ queryKey: ["tenant", "current"] });
        return nextUser;
      },
      logout: async () => {
        await authService.logout();
        setHasToken(false);
        queryClient.removeQueries({ queryKey: ["auth"] });
        queryClient.removeQueries({ queryKey: ["tenant"] });
        queryClient.removeQueries({ queryKey: ["admin-orders"] });
        queryClient.removeQueries({ queryKey: ["admin-summary"] });
        queryClient.removeQueries({ queryKey: ["admin-bundle"] });
        queryClient.removeQueries({ queryKey: ["kitchen-orders"] });
        queryClient.removeQueries({ queryKey: ["order-details"] });
      },
      can: (permission) => {
        if (!user) return false;

        return user.permissions.includes(permission);
      },
      hasPlanCapability: (capability) => {
        if (!user || user.isPlatformAdmin) return true;

        return user.plan?.capabilities?.[capability] ?? true;
      }
    }),
    [hasToken, isLoading, loginMutation, queryClient, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
