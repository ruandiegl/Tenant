import { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../app/providers/auth-provider";

type ProtectedRouteProps = {
  permission: string;
  children: ReactElement;
};

export function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const { can, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <section className="screen"><div className="panel">Carregando acesso...</div></section>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!can(permission)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
