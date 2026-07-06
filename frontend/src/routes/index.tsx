import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { ChefHat, Menu as MenuIcon, ReceiptText, ShoppingBag, UserRound } from "lucide-react";
import { AdminLayout } from "../app/layouts/admin-layout";
import { SuperAdminLayout } from "../app/layouts/superadmin-layout";
import { ProtectedRoute } from "./protected-route";
import { AdminDashboard } from "../pages/admin/dashboard";
import { AdminBranches } from "../pages/admin/branches";
import { AdminDeliveries } from "../pages/admin/deliveries";
import { AdminOrders } from "../pages/admin/orders";
import { AdminMenu } from "../pages/admin/menu";
import { AdminSettings } from "../pages/admin/settings";
import { AdminWhatsapp } from "../pages/admin/whatsapp";
import { SuperAdminAuditLogs } from "../pages/superadmin/audit-logs";
import { SuperAdminDashboard } from "../pages/superadmin/dashboard";
import { SuperAdminPlans } from "../pages/superadmin/plans";
import { SuperAdminTenantDetail } from "../pages/superadmin/tenant-detail";
import { SuperAdminTenants } from "../pages/superadmin/tenants";
import { KitchenQueue } from "../pages/kitchen/queue";
import { CustomerMenu } from "../pages/customer/menu";
import { CustomerCart } from "../pages/customer/cart";
import { CustomerProfile } from "../pages/customer/profile";
import { LoginPage } from "../pages/auth/login";
import { AcceptInvitePage } from "../pages/invite/accept";
import { OrderTracking } from "../pages/customer/order-tracking";
import { useCustomerFlow } from "../app/providers/customer-flow-provider";
import { DEFAULT_PUBLIC_TENANT_SLUG, getPublicTenantSlug, publicTenantPath } from "../utils/public-tenant-route";

const staffNavItems = [
  { to: "/cozinha", label: "Cozinha", icon: ChefHat }
];

export function AppRoutes() {
  return <RouteShell />;
}

function RouteShell() {
  const location = useLocation();
  const { order } = useCustomerFlow();
  const publicTenantSlug = getPublicTenantSlug(location.pathname) ?? DEFAULT_PUBLIC_TENANT_SLUG;
  const customerNavItems = [
    { to: publicTenantPath(publicTenantSlug, "/menu"), label: "Menu", icon: MenuIcon },
    { to: publicTenantPath(publicTenantSlug, "/carrinho"), label: "Carrinho", icon: ShoppingBag },
    { to: publicTenantPath(publicTenantSlug, "/pedido"), label: "Pedido", icon: ReceiptText },
    { to: publicTenantPath(publicTenantSlug, "/perfil"), label: "Perfil", icon: UserRound }
  ];
  const isAuthRoute = location.pathname === "/login";
  const isInviteRoute = location.pathname.startsWith("/invite");
  const isLegacyCustomerRoute = location.pathname.startsWith("/cliente");
  const isCustomerRoute = Boolean(getPublicTenantSlug(location.pathname)) || isLegacyCustomerRoute;
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/superadmin");
  const navItems = isCustomerRoute ? customerNavItems : staffNavItems;

  return (
    <div className={`app-shell ${isAdminRoute ? "admin-shell-active" : ""}`}>
      <main className={`app-main ${isAdminRoute ? "admin-main" : ""}`}>
        <Routes>
          <Route path="/" element={<Navigate to={publicTenantPath(DEFAULT_PUBLIC_TENANT_SLUG)} replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invite/:token" element={<AcceptInvitePage />} />
          <Route path="/cliente" element={<Navigate to={publicTenantPath(DEFAULT_PUBLIC_TENANT_SLUG)} replace />} />
          <Route path="/cliente/menu" element={<Navigate to={publicTenantPath(DEFAULT_PUBLIC_TENANT_SLUG, "/menu")} replace />} />
          <Route path="/cliente/carrinho" element={<Navigate to={publicTenantPath(DEFAULT_PUBLIC_TENANT_SLUG, "/carrinho")} replace />} />
          <Route path="/cliente/carrinho/endereco" element={<Navigate to={publicTenantPath(DEFAULT_PUBLIC_TENANT_SLUG, "/carrinho/endereco")} replace />} />
          <Route path="/cliente/carrinho/pagamento" element={<Navigate to={publicTenantPath(DEFAULT_PUBLIC_TENANT_SLUG, "/carrinho/pagamento")} replace />} />
          <Route path="/cliente/carrinho/confirmacao" element={<Navigate to={publicTenantPath(DEFAULT_PUBLIC_TENANT_SLUG, "/carrinho/confirmacao")} replace />} />
          <Route path="/cliente/perfil" element={<Navigate to={publicTenantPath(DEFAULT_PUBLIC_TENANT_SLUG, "/perfil")} replace />} />
          <Route path="/cliente/pedido" element={<Navigate to={publicTenantPath(DEFAULT_PUBLIC_TENANT_SLUG, "/pedido")} replace />} />
          <Route path="/cliente/pedido/:publicCode" element={<Navigate to={publicTenantPath(DEFAULT_PUBLIC_TENANT_SLUG, `/pedido/${location.pathname.split("/").pop() ?? ""}`)} replace />} />
          <Route
            path="/cozinha"
            element={
              <ProtectedRoute permission="tenant.kitchen.read">
                <KitchenQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute permission="tenant.reports.read">
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pedidos"
            element={
              <ProtectedRoute permission="tenant.orders.read">
                <AdminLayout>
                  <AdminOrders />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/cardapio"
            element={
              <ProtectedRoute permission="tenant.menu.read">
                <AdminLayout>
                  <AdminMenu />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/cozinha"
            element={
              <ProtectedRoute permission="tenant.kitchen.read">
                <AdminLayout>
                  <KitchenQueue />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/entregas"
            element={
              <ProtectedRoute permission="tenant.branches.read">
                <AdminLayout>
                  <AdminDeliveries />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/entregas/filiais"
            element={
              <ProtectedRoute permission="tenant.branches.read">
                <AdminLayout>
                  <AdminBranches />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/whatsapp"
            element={
              <ProtectedRoute permission="tenant.settings.read">
                <AdminLayout>
                  <AdminWhatsapp />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/config"
            element={
              <ProtectedRoute permission="tenant.branches.read">
                <AdminLayout>
                  <AdminSettings />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute permission="platform.tenants.read" platformOnly>
                <SuperAdminLayout>
                  <SuperAdminDashboard />
                </SuperAdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/tenants"
            element={
              <ProtectedRoute permission="platform.tenants.read" platformOnly>
                <SuperAdminLayout>
                  <SuperAdminTenants />
                </SuperAdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/tenants/:id/editar"
            element={
              <ProtectedRoute permission="platform.tenants.read" platformOnly>
                <SuperAdminLayout>
                  <SuperAdminTenantDetail />
                </SuperAdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/tenants/:id"
            element={
              <ProtectedRoute permission="platform.tenants.read" platformOnly>
                <SuperAdminLayout>
                  <SuperAdminTenantDetail />
                </SuperAdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/planos"
            element={
              <ProtectedRoute permission="platform.tenants.read" platformOnly>
                <SuperAdminLayout>
                  <SuperAdminPlans />
                </SuperAdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/audit-logs"
            element={
              <ProtectedRoute permission="platform.tenants.read" platformOnly>
                <SuperAdminLayout>
                  <SuperAdminAuditLogs />
                </SuperAdminLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/:tenantSlug" element={<CustomerMenu />} />
          <Route path="/:tenantSlug/menu" element={<CustomerMenu />} />
          <Route path="/:tenantSlug/carrinho" element={<CustomerCart step="cart" />} />
          <Route path="/:tenantSlug/carrinho/endereco" element={<CustomerCart step="address" />} />
          <Route path="/:tenantSlug/carrinho/pagamento" element={<CustomerCart step="payment" />} />
          <Route path="/:tenantSlug/carrinho/confirmacao" element={<CustomerCart step="done" />} />
          <Route path="/:tenantSlug/perfil" element={<CustomerProfile />} />
          <Route path="/:tenantSlug/pedido" element={<OrderTracking publicCodeFallback={order?.publicCode} />} />
          <Route path="/:tenantSlug/pedido/:publicCode" element={<OrderTracking />} />
        </Routes>
      </main>
      {!isAuthRoute && !isInviteRoute && !isAdminRoute && (
        <nav className={`bottom-nav ${isCustomerRoute ? "customer-nav" : "staff-nav"}`} aria-label="Navegacao principal">
          {navItems.map((item) => (
            <NavLink end={item.to.endsWith("/menu") || item.to.endsWith("/perfil")} key={item.to} to={item.to}>
              <item.icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
