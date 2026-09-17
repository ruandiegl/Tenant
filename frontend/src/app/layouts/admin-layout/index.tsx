import "./styles.css";
import { type PropsWithChildren, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Bike, Building2, ChefHat, Menu as MenuIcon, MessageCircle, ReceiptText, Settings, Store } from "lucide-react";
import { PanelSidebar, type PanelSidebarGroup, type PanelSidebarItem } from "../../../components/navigation/panel-sidebar";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { SidebarInset, SidebarProvider } from "../../../components/ui/sidebar";
import { useAuth } from "../../providers/auth-provider";
import { useTenant } from "../../providers/tenant-provider";

type AdminNavItem = PanelSidebarItem & {
  permission: string;
};

type AdminNavGroupDef = {
  label: string;
  items: AdminNavItem[];
};

const adminNavGroupDefs: AdminNavGroupDef[] = [
  {
    label: "Principal",
    items: [
      { to: "/admin", label: "Dashboard", icon: BarChart3, end: true, permission: "tenant.reports.read" }
    ]
  },
  {
    label: "Cozinha",
    items: [
      { to: "/admin/pedidos", label: "Pedidos", icon: ReceiptText, permission: "tenant.orders.read" },
      { to: "/admin/cardapio", label: "Cardapio", icon: MenuIcon, permission: "tenant.menu.read" },
      { to: "/admin/cozinha", label: "Fila da cozinha", icon: ChefHat, permission: "tenant.kitchen.read" }
    ]
  },
  {
    label: "Logistica",
    items: [
      { to: "/admin/entregas", label: "Painel de entregas", icon: Bike, permission: "tenant.branches.read", end: true },
      { to: "/admin/entregas/filiais", label: "Cadastro de filiais", icon: Building2, permission: "tenant.branches.read" }
    ]
  },
  {
    label: "Sistema",
    items: [
      { to: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle, permission: "tenant.settings.read" },
      { to: "/admin/config", label: "Configuracoes", icon: Settings, permission: "tenant.branches.read" }
    ]
  }
];

export function AdminLayout({ children }: PropsWithChildren) {
  const { settings } = useTenant();
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const groups: PanelSidebarGroup[] = adminNavGroupDefs
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => can(item.permission))
    }))
    .filter((group) => group.items.length > 0);

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
    <SidebarProvider className="admin-layout" storageKey="podepedir.admin.sidebar">
      <PanelSidebar
        ariaLabel="Menu administrativo"
        brandSubtitle={settings.brandName}
        brandTitle="podePedir"
        contextIcon={Store}
        contextLabel="Tenant ativo"
        groups={groups}
        onLogout={() => setLogoutModalOpen(true)}
        userEmail={user?.email ?? "admin@podepedir.local"}
        userName={user?.name ?? "Admin"}
      />
      <SidebarInset className="admin-content">{children}</SidebarInset>
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
    </SidebarProvider>
  );
}
