import { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../app/providers/auth-provider";

type ProtectedRouteProps = {
  permission: string;
  children: ReactElement;
};

export function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const { can } = useAuth();

  if (!can(permission)) {
    return <Navigate to="/cliente" replace />;
  }

  return children;
}
