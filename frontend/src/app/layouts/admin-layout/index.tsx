import "./styles.css";
import { PropsWithChildren, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { BarChart3, Bike, ChefHat, LogOut, Menu as MenuIcon, MessageCircle, ReceiptText, Settings, Store } from "lucide-react";
import { BrandLogo } from "../../../components/brand-logo";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { useAuth } from "../../providers/auth-provider";
import { useTenant } from "../../providers/tenant-provider";

const adminNavItems = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, end: true },
  { to: "/admin/pedidos", label: "Pedidos", icon: ReceiptText },
  { to: "/admin/cardapio", label: "Cardapio", icon: MenuIcon },
  { to: "/admin/cozinha", label: "Cozinha", icon: ChefHat },
  { to: "/admin/entregas", label: "Entregas", icon: Bike },
  { to: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/admin/config", label: "Configuracoes", icon: Settings }
];

export function AdminLayout({ children }: PropsWithChildren) {
  const { settings } = useTenant();
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
    <div className="admin-layout">
      <aside className="admin-sidebar" aria-label="Menu administrativo">
        <div className="admin-brand">
          <BrandLogo compact />
          <div>
            <strong>podePedir</strong>
            <span>{settings.brandName}</span>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {adminNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <span className="admin-nav-icon">
                <item.icon size={18} aria-hidden="true" />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <span className="admin-avatar">{user?.name?.slice(0, 2).toUpperCase() ?? "AD"}</span>
            <div>
              <strong>{user?.name ?? "Admin"}</strong>
              <span>{user?.email ?? "admin@podepedir.local"}</span>
            </div>
            <button aria-label="Sair do admin" onClick={() => setLogoutModalOpen(true)}>
              <LogOut size={18} />
            </button>
          </div>
          <div className="admin-tenant-chip">
            <Store size={16} />
            <span>Tenant ativo</span>
          </div>
        </div>
      </aside>

      <section className="admin-content">{children}</section>
      <ConfirmDialog
        open={logoutModalOpen}
        title="Sair da conta"
        description="Voce sera desconectado deste painel e precisara entrar novamente para acessar a administracao."
        confirmLabel="Sair"
        tone="neutral"
        isLoading={isLoggingOut}
        onCancel={() => setLogoutModalOpen(false)}
        onConfirm={() => void handleLogout()}
      />
    </div>
  );
}

