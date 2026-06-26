import "./styles.css";
import { PropsWithChildren, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Building2, ClipboardList, LayoutDashboard, LogOut, PackageCheck, ShieldCheck } from "lucide-react";
import { BrandLogo } from "../../../components/brand-logo";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { useAuth } from "../../providers/auth-provider";

const navItems = [
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
    <div className="superadmin-layout">
      <aside className="superadmin-sidebar" aria-label="Menu superadmin">
        <div className="superadmin-brand">
          <BrandLogo compact />
          <div>
            <strong>PodePedir TMS</strong>
            <span>Console da plataforma</span>
          </div>
        </div>

        <nav className="superadmin-nav">
          {navItems.map((item) => (
            <NavLink end={item.end} key={item.to} to={item.to}>
              <item.icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="superadmin-operator">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>{user?.name ?? "Operador"}</strong>
            <span>{user?.email ?? "superadmin@podepedir.local"}</span>
          </div>
          <button aria-label="Sair do superadmin" onClick={() => setLogoutModalOpen(true)} type="button">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <section className="superadmin-content">{children}</section>
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
    </div>
  );
}
