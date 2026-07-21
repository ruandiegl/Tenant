import "./styles.css";
import { type PropsWithChildren, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ClipboardList, LayoutDashboard, PackageCheck, ShieldCheck } from "lucide-react";
import { PanelSidebar, type PanelSidebarItem } from "../../../components/navigation/panel-sidebar";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { SidebarInset, SidebarProvider } from "../../../components/ui/sidebar";
import { useAuth } from "../../providers/auth-provider";

const navItems: PanelSidebarItem[] = [
  { to: "/superadmin", label: "Visao geral", icon: LayoutDashboard, end: true },
  { to: "/superadmin/tenants", label: "Tenants", icon: Building2 },
  { to: "/superadmin/planos", label: "Planos", icon: PackageCheck },
  { to: "/superadmin/audit-logs", label: "Auditoria", icon: ClipboardList }
];

export function SuperAdminLayout({ children }: PropsWithChildren) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
      setLogoutModalOpen(false);
    }
  };

  return (
    <SidebarProvider className="superadmin-layout" storageKey="podepedir.superadmin.sidebar">
      <PanelSidebar
        ariaLabel="Menu superadmin"
        brandSubtitle="Console da plataforma"
        brandTitle="podePedir TMS"
        contextIcon={ShieldCheck}
        contextLabel="Acesso de plataforma"
        onLogout={() => setLogoutModalOpen(true)}
        primaryItems={navItems}
        primaryLabel="Plataforma"
        userEmail={user?.email ?? "superadmin@podepedir.local"}
        userName={user?.name ?? "Operador"}
      />
      <SidebarInset className="superadmin-content">{children}</SidebarInset>
      <ConfirmDialog
        open={logoutModalOpen}
        title="Sair do superadmin"
        description="Voce sera desconectado do console da plataforma e voltara para a tela de login."
        confirmLabel="Sair"
        tone="neutral"
        isLoading={isLoggingOut}
        onCancel={() => setLogoutModalOpen(false)}
        onConfirm={() => void handleLogout()}
      />
    </SidebarProvider>
  );
}
