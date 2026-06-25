import "./styles.css";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Settings2 } from "lucide-react";
import { useTenant } from "../../../app/providers/tenant-provider";
import { PeriodFilter } from "../../../components/filters/period-filter";
import { PageHeader } from "../../../components/ui/page-header";
import { StatCard } from "../../../components/ui/stat-card";
import { StatusBadge } from "../../../components/ui/status-badge";
import { adminService } from "../../../services/admin";
import { formatCurrency } from "../../../utils/format";
import { addDays, getPeriodRange, toDateInputValue, type PeriodFilterValue } from "../../../utils/period-range";

function methodLabel(method: string) {
  const labels: Record<string, string> = {
    PIX: "PIX",
    CREDIT_CARD: "Cartao",
    CASH: "Dinheiro",
    UNKNOWN: "Nao informado"
  };

  return labels[method] ?? method;
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    DELIVERY: "Entrega",
    PICKUP: "Retirada",
    DINE_IN: "Balcao"
  };

  return labels[type] ?? type;
}

export function AdminDashboard() {
  const { tenant } = useTenant();
  const [period, setPeriod] = useState<PeriodFilterValue>("today");
  const [customStartDate, setCustomStartDate] = useState(() => toDateInputValue(addDays(new Date(), -6)));
  const [customEndDate, setCustomEndDate] = useState(() => toDateInputValue(new Date()));
  const range = useMemo(() => getPeriodRange(period, customStartDate, customEndDate), [customEndDate, customStartDate, period]);
  const { data: summary } = useQuery({
    queryKey: ["admin-summary", tenant.id, range.from, range.to],
    queryFn: () => adminService.getSummary(range),
    refetchInterval: 5000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  if (!summary) {
    return null;
  }

  const activeStatuses = Object.entries(summary.ordersByStatus).filter(([, value]) => value > 0);
  const peakHour = summary.hourlySales.reduce((best, item) => (item.revenue > (best?.revenue ?? 0) ? item : best), summary.hourlySales[0]);
  const bestPayment = summary.paymentsByMethod[0];
  const bestProduct = summary.topProducts[0];

  return (
    <section className="screen dashboard-screen">
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

      <PeriodFilter
        customEndDate={customEndDate}
        customStartDate={customStartDate}
        onCustomEndDateChange={setCustomEndDate}
        onCustomStartDateChange={setCustomStartDate}
        onPeriodChange={setPeriod}
        period={period}
      />

      <div className="stats-grid">
        <StatCard label="Pedidos" value={String(summary.ordersToday)} trend={`${summary.openOrders} em andamento`} />
        <StatCard label="Faturamento" value={formatCurrency(summary.revenueToday)} trend={bestPayment ? `${methodLabel(bestPayment.method)} lidera` : "Sem vendas"} />
        <StatCard label="Ticket medio" value={formatCurrency(summary.averageTicket)} trend={`${summary.cancelledOrders} cancelados`} />
        <StatCard label="Tempo medio" value={`${summary.averagePreparationMinutes} min`} trend={peakHour ? `Pico ${String(peakHour.hour).padStart(2, "0")}h` : "Sem pico"} />
      </div>

      <div className="insight-grid">
        <article className="panel insight-card">
          <span>Produto destaque</span>
          <strong>{bestProduct?.name ?? "Sem vendas no periodo"}</strong>
          <small>{bestProduct ? `${bestProduct.quantity} unidades - ${formatCurrency(bestProduct.revenue)}` : "Cadastre ou divulgue produtos para gerar dados."}</small>
        </article>
        <article className="panel insight-card">
          <span>Saude operacional</span>
          <strong>{Math.round(summary.cancellationRate * 100)}% cancelamento</strong>
          <small>{summary.openOrders > 0 ? `${summary.openOrders} pedidos ainda precisam de acao` : "Nenhum pedido pendente no periodo."}</small>
        </article>
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
          <h2>Pagamentos</h2>
          {summary.paymentsByMethod.map((payment) => (
            <div className="rank-row" key={payment.method}>
              <div>
                <strong>{methodLabel(payment.method)}</strong>
                <span>{payment.count} transacoes</span>
              </div>
              <strong>{formatCurrency(payment.revenue)}</strong>
            </div>
          ))}
          {summary.paymentsByMethod.length === 0 ? <p className="muted-text">Sem pagamentos no periodo.</p> : null}
        </article>

        <article className="panel">
          <h2>Tipo de pedido</h2>
          {summary.ordersByType.map((item) => (
            <div className="rank-row" key={item.type}>
              <div>
                <strong>{typeLabel(item.type)}</strong>
                <span>{item.orders} pedidos</span>
              </div>
              <strong>{formatCurrency(item.revenue)}</strong>
            </div>
          ))}
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
          {summary.topProducts.length === 0 ? <p className="muted-text">Sem produtos vendidos no periodo.</p> : null}
        </article>

        <article className="panel wide-panel">
          <h2>Movimento por horario</h2>
          <div className="hourly-grid">
            {summary.hourlySales.map((item) => (
              <div className="hourly-bar" key={item.hour}>
                <span>{String(item.hour).padStart(2, "0")}h</span>
                <strong style={{ height: `${Math.max(10, (item.revenue / Math.max(peakHour?.revenue ?? 1, 1)) * 92)}px` }} />
                <small>{item.orders}</small>
              </div>
            ))}
          </div>
          {summary.hourlySales.length === 0 ? <p className="muted-text">Sem movimento no periodo selecionado.</p> : null}
        </article>
      </div>

      <Link className="wide-link" to="/admin/pedidos">
        <ClipboardList size={18} /> Gerenciar pedidos
      </Link>
    </section>
  );
}
