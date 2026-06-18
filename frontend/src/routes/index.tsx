import { Navigate, NavLink, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { BarChart3, ChefHat, Menu as MenuIcon, Settings, ShoppingBag } from "lucide-react";
import { ProtectedRoute } from "./protected-route";
import { AdminDashboard } from "../pages/admin/dashboard";
import { AdminOrders } from "../pages/admin/orders";
import { AdminMenu } from "../pages/admin/menu";
import { AdminSettings } from "../pages/admin/settings";
import { KitchenQueue } from "../pages/kitchen/queue";
import { CustomerMenu } from "../pages/customer/menu";
import { CustomerCart } from "../pages/customer/cart";
import { OrderTracking } from "../pages/customer/order-tracking";

const navItems = [
  { to: "/cliente", label: "Cliente", icon: ShoppingBag },
  { to: "/cozinha", label: "Cozinha", icon: ChefHat },
  { to: "/admin", label: "Admin", icon: BarChart3 },
  { to: "/admin/cardapio", label: "Menu", icon: MenuIcon },
  { to: "/admin/config", label: "Config", icon: Settings }
];

export function AppRoutes() {
  return (
    <Router>
      <div className="app-shell">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/cliente" replace />} />
            <Route path="/cliente" element={<CustomerMenu />} />
            <Route path="/cliente/carrinho" element={<CustomerCart />} />
            <Route path="/cliente/pedido/:publicCode" element={<OrderTracking />} />
            <Route
              path="/cozinha"
              element={
                <ProtectedRoute permission="kitchen.orders.manage">
                  <KitchenQueue />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute permission="reports.read">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pedidos"
              element={
                <ProtectedRoute permission="orders.manage">
                  <AdminOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cardapio"
              element={
                <ProtectedRoute permission="menu.manage">
                  <AdminMenu />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/config"
              element={
                <ProtectedRoute permission="settings.manage">
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <nav className="bottom-nav" aria-label="Navegacao principal">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/admin"}>
              <item.icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </Router>
  );
}
