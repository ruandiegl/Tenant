import "./styles.css";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Clock, Settings2, Sun, type LucideIcon } from "lucide-react";
import { PageHeader } from "../../../components/ui/page-header";
import { StatCard } from "../../../components/ui/stat-card";
import { StatusBadge } from "../../../components/ui/status-badge";
import { adminService } from "../../../services/admin";
import { formatCurrency } from "../../../utils/format";

type DashboardPeriod = "today" | "yesterday" | "last7" | "custom";

const periodLabels: Record<DashboardPeriod, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  last7: "7 dias",
  custom: "Data"
};

const periodIcons: Record<DashboardPeriod, LucideIcon> = {
  today: Sun,
  yesterday: Clock,
  last7: ArrowRight,
  custom: CalendarDays
};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function fromDateInputValue(value: string) {
  return new Date(`${value}T12:00:00`);
}

function dayBounds(date: Date) {
  const from = new Date(date);
  from.setHours(0, 0, 0, 0);

  const to = new Date(date);
  to.setHours(23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
}

function rangeBounds(fromDate: Date, toDate: Date) {
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);

  const to = new Date(toDate);
  to.setHours(23, 59, 59, 999);

  return { from: from.toISOString(), to: to.toISOString() };
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date).replace(".", "");
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

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
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const [customStartDate, setCustomStartDate] = useState(() => toDateInputValue(addDays(new Date(), -6)));
  const [customEndDate, setCustomEndDate] = useState(() => toDateInputValue(new Date()));
  const [customMonth, setCustomMonth] = useState(() => new Date());
  const range = useMemo(() => {
    const today = new Date();

    if (period === "today") return dayBounds(today);

    if (period === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return dayBounds(yesterday);
    }

    if (period === "last7") {
      return rangeBounds(addDays(today, -6), today);
    }

    const from = fromDateInputValue(customStartDate);
    const to = fromDateInputValue(customEndDate);
    return rangeBounds(from <= to ? from : to, from <= to ? to : from);
  }, [customEndDate, customStartDate, period]);
  const { data: summary } = useQuery({
    queryKey: ["admin-summary", range.from, range.to],
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
  const today = new Date();
  const yesterday = addDays(today, -1);
  const last7Start = addDays(today, -6);
  const customStart = fromDateInputValue(customStartDate);
  const customEnd = fromDateInputValue(customEndDate);
  const periodSublabels: Record<DashboardPeriod, string> = {
    today: formatShortDate(today),
    yesterday: formatShortDate(yesterday),
    last7: `${formatShortDate(last7Start)}–${formatShortDate(today)}`,
    custom: `${formatShortDate(customStart <= customEnd ? customStart : customEnd)}–${formatShortDate(customStart <= customEnd ? customEnd : customStart)}`
  };

  function moveCustomMonth(direction: -1 | 1) {
    setCustomMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + direction);
      return next;
    });
  }

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

      <div className="dashboard-periods" aria-label="Filtro de periodo">
        <div className="dashboard-filter-row">
          {(Object.keys(periodLabels) as DashboardPeriod[]).map((item) => {
            const Icon = periodIcons[item];
            const isActive = period === item;

            return (
              <button className={`period-chip${isActive ? " is-active" : ""}`} key={item} onClick={() => setPeriod(item)} type="button">
                <span className="period-chip-icon">
                  <Icon size={16} />
                </span>
                <span className="period-chip-label">{periodLabels[item]}</span>
                <span className="period-chip-context" aria-hidden={!isActive}>
                  {periodSublabels[item]}
                </span>
              </button>
            );
          })}
        </div>

        <div className={`custom-period-panel${period === "custom" ? " is-open" : ""}`}>
          <div className="custom-period-nav" aria-label="Navegacao do mes">
            <button type="button" onClick={() => moveCustomMonth(-1)} aria-label="Mes anterior">
              <ChevronLeft size={16} />
            </button>
            <strong>{formatMonthLabel(customMonth)}</strong>
            <button type="button" onClick={() => moveCustomMonth(1)} aria-label="Proximo mes">
              <ChevronRight size={16} />
            </button>
          </div>
          <p>Selecione um intervalo</p>
          <div className="custom-date-fields">
            <label>
              De
              <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} />
            </label>
            <label>
              Até
              <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} />
            </label>
          </div>
        </div>
      </div>

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

