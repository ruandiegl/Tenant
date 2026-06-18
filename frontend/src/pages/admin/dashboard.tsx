import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ClipboardList, Settings2 } from "lucide-react";
import { PageHeader } from "../../components/ui/page-header";
import { StatCard } from "../../components/ui/stat-card";
import { StatusBadge } from "../../components/ui/status-badge";
import { adminService } from "../../services/admin";
import { formatCurrency } from "../../utils/format";

export function AdminDashboard() {
  const { data: summary } = useQuery({ queryKey: ["admin-summary"], queryFn: adminService.getSummary });

  if (!summary) {
    return null;
  }

  const activeStatuses = Object.entries(summary.ordersByStatus).filter(([, value]) => value > 0);

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Admin"
        title="Painel operacional"
        description="Indicadores carregados da API podePedir por tenant."
        actions={
          <Link className="pill-button" to="/admin/config">
            <Settings2 size={17} /> Tenant
          </Link>
        }
      />

      <div className="stats-grid">
        <StatCard label="Pedidos hoje" value={String(summary.ordersToday)} trend="+12% vs ontem" />
        <StatCard label="Faturamento" value={formatCurrency(summary.revenueToday)} trend="PIX lidera" />
        <StatCard label="Ticket medio" value={formatCurrency(summary.averageTicket)} trend="Meta R$ 72" />
        <StatCard label="Tempo medio" value={`${summary.averagePreparationMinutes} min`} trend="Dentro do SLA" />
      </div>

      <div className="admin-grid">
        <article className="panel">
          <h2>Status dos pedidos</h2>
          <div className="status-list">
            {activeStatuses.map(([status, count]) => (
              <div key={status}>
                <StatusBadge status={status} />
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Produtos mais vendidos</h2>
          {summary.topProducts.map((product) => (
            <div className="rank-row" key={product.productId}>
              <div>
                <strong>{product.name}</strong>
                <span>{product.quantity} unidades</span>
              </div>
              <strong>{formatCurrency(product.revenue)}</strong>
            </div>
          ))}
        </article>
      </div>

      <Link className="wide-link" to="/admin/pedidos">
        <ClipboardList size={18} /> Gerenciar pedidos
      </Link>
    </section>
  );
}
