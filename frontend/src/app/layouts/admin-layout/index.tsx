import "./styles.css";
import { PropsWithChildren, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Bike, Building2, ChefHat, LogOut, Menu as MenuIcon, MessageCircle, ReceiptText, Settings, Store } from "lucide-react";
import { BrandLogo } from "../../../components/brand-logo";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { useAuth } from "../../providers/auth-provider";
import { useTenant } from "../../providers/tenant-provider";

const dashboardItem = { to: "/admin", label: "Dashboard", icon: BarChart3, end: true, permission: "tenant.reports.read" };
const adminNavGroups = [
  {
    label: "Cozinha",
    icon: ChefHat,
    items: [
      { to: "/admin/pedidos", label: "Pedidos", icon: ReceiptText, permission: "tenant.orders.read" },
      { to: "/admin/cardapio", label: "Cardapio", icon: MenuIcon, permission: "tenant.menu.read" },
      { to: "/admin/cozinha", label: "Fila da cozinha", icon: ChefHat, permission: "tenant.kitchen.read" }
    ]
  },
  {
    label: "Logistica",
    icon: Bike,
    items: [
      { to: "/admin/entregas", label: "Painel de entregas", icon: Bike, permission: "tenant.branches.read", end: true },
      { to: "/admin/entregas/filiais", label: "Cadastro de filiais", icon: Building2, permission: "tenant.branches.read" }
    ]
  }
];
const adminSupportItems = [
  { to: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle, permission: "tenant.settings.read" },
  { to: "/admin/config", label: "Configuracoes", icon: Settings, permission: "tenant.branches.read" }
];

export function AdminLayout({ children }: PropsWithChildren) {
  const { settings } = useTenant();
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
          {can(dashboardItem.permission) ? (
            <NavLink key={dashboardItem.to} to={dashboardItem.to} end={dashboardItem.end} title={dashboardItem.label}>
              <span className="admin-nav-icon">
                <dashboardItem.icon size={18} aria-hidden="true" />
              </span>
              <span>{dashboardItem.label}</span>
            </NavLink>
          ) : null}

          {adminNavGroups.map((group) => {
            const items = group.items.filter((item) => can(item.permission));
            if (items.length === 0) return null;

            const isGroupActive = items.some((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)));

            return (
              <details className="admin-nav-group" key={group.label} open={isGroupActive}>
                <summary title={group.label}>
                  <span className="admin-nav-icon">
                    <group.icon size={18} aria-hidden="true" />
                  </span>
                  <span>{group.label}</span>
                </summary>
                <div className="admin-nav-group-content">
                  {items.map((item) => (
                    <NavLink key={item.to} to={item.to} end={item.end} title={item.label}>
                      <span className="admin-nav-icon">
                        <item.icon size={18} aria-hidden="true" />
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </details>
            );
          })}

          <div className="admin-nav-section">
            {adminSupportItems.filter((item) => can(item.permission)).map((item) => (
              <NavLink key={item.to} to={item.to} title={item.label}>
                <span className="admin-nav-icon">
                  <item.icon size={18} aria-hidden="true" />
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
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

