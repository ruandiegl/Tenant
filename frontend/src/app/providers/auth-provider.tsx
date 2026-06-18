import { createContext, PropsWithChildren, useContext } from "react";
import { mockSession } from "../../data/mock";
import { TenantUser } from "../../types/database";

type AuthContextValue = {
  user: TenantUser;
  can: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const value: AuthContextValue = {
    user: mockSession,
    can: (permission) => mockSession.permissions.includes(permission)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
