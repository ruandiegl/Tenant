import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "../../services/auth";
import { getAuthToken } from "../../services/api";
import { TenantUser } from "../../types/database";

type AuthContextValue = {
  user: TenantUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string; tenantSlug: string }) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
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
    onSuccess: (nextUser) => {
      queryClient.setQueryData(["auth", "me"], nextUser);
      setHasToken(true);
    }
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading: hasToken && isLoading,
      login: async (credentials) => {
        await loginMutation.mutateAsync(credentials);
      },
      logout: async () => {
        await authService.logout();
        setHasToken(false);
        queryClient.removeQueries({ queryKey: ["auth"] });
      },
      can: (permission) => {
        if (!user) return false;

        return user.permissions.includes(permission);
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
