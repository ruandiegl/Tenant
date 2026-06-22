import { Navigate, NavLink, Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import { ChefHat, Menu as MenuIcon, ReceiptText, ShoppingBag, UserRound } from "lucide-react";
import { AdminLayout } from "../app/layouts/admin-layout";
import { ProtectedRoute } from "./protected-route";
import { AdminDashboard } from "../pages/admin/dashboard";
import { AdminOrders } from "../pages/admin/orders";
import { AdminMenu } from "../pages/admin/menu";
import { AdminSettings } from "../pages/admin/settings";
import { KitchenQueue } from "../pages/kitchen/queue";
import { CustomerMenu } from "../pages/customer/menu";
import { CustomerCart } from "../pages/customer/cart";
import { CustomerProfile } from "../pages/customer/profile";
import { LoginPage } from "../pages/auth/login";
import { OrderTracking } from "../pages/customer/order-tracking";
import { useCustomerFlow } from "../app/providers/customer-flow-provider";

const customerNavItems = [
  { to: "/cliente/menu", label: "Menu", icon: MenuIcon },
  { to: "/cliente/carrinho", label: "Carrinho", icon: ShoppingBag },
  { to: "/cliente/pedido", label: "Pedido", icon: ReceiptText },
  { to: "/cliente/perfil", label: "Perfil", icon: UserRound }
];

const staffNavItems = [
  { to: "/cozinha", label: "Cozinha", icon: ChefHat }
];

export function AppRoutes() {
  return (
    <Router>
      <RouteShell />
    </Router>
  );
}

function RouteShell() {
  const location = useLocation();
  const { order } = useCustomerFlow();
  const isAuthRoute = location.pathname === "/login";
  const isCustomerRoute = location.pathname.startsWith("/cliente");
  const isAdminRoute = location.pathname.startsWith("/admin");
  const navItems = isCustomerRoute ? customerNavItems : staffNavItems;

  return (
    <div className={`app-shell ${isAdminRoute ? "admin-shell-active" : ""}`}>
      <main className={`app-main ${isAdminRoute ? "admin-main" : ""}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/cliente/menu" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cliente" element={<Navigate to="/cliente/menu" replace />} />
          <Route path="/cliente/menu" element={<CustomerMenu />} />
          <Route path="/cliente/carrinho" element={<CustomerCart />} />
          <Route path="/cliente/perfil" element={<CustomerProfile />} />
          <Route path="/cliente/pedido" element={<OrderTracking publicCodeFallback={order?.publicCode} />} />
          <Route path="/cliente/pedido/:publicCode" element={<OrderTracking />} />
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
            path="/admin/config"
            element={
              <ProtectedRoute permission="tenant.branches.read">
                <AdminLayout>
                  <AdminSettings />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      {!isAuthRoute && !isAdminRoute && (
        <nav className={`bottom-nav ${isCustomerRoute ? "customer-nav" : "staff-nav"}`} aria-label="Navegacao principal">
          {navItems.map((item) => (
            <NavLink end={item.to !== "/cliente/pedido"} key={item.to} to={item.to}>
              <item.icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
