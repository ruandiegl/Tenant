import "./styles.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Bike,
  CalendarDays,
  Clock,
  DollarSign,
  Eye,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useTenant } from "../../../app/providers/tenant-provider";
import { useSocket } from "../../../app/providers/socket-provider";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { PageHeader } from "../../../components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../../components/ui/select";
import { StatusBadge } from "../../../components/ui/status-badge";
import { ordersService } from "../../../services/orders";
import { Order, OrderStatus } from "../../../types/database";
import { formatCurrency, formatTime } from "../../../utils/format";
import {
  addDays,
  dayBounds,
  formatShortDate,
  fromDateInputValue,
  rangeBounds,
  toDateInputValue,
  type PeriodFilterValue
} from "../../../utils/period-range";

export type ExtendedPeriodValue = PeriodFilterValue | "all";

export function AdminOrders() {
  const { tenant } = useTenant();
  const socket = useSocket();
  const queryClient = useQueryClient();

  // Filter states
  const [period, setPeriod] = useState<ExtendedPeriodValue>("today");
  const [customDate, setCustomDate] = useState<string>(() => toDateInputValue(new Date()));
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  // Modal / Detail state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectDialogOrder, setRejectDialogOrder] = useState<Order | null>(null);

  // Compute API date bounds
  const range = useMemo(() => {
    const today = new Date();
    if (period === "today") return dayBounds(today);
    if (period === "yesterday") return dayBounds(addDays(today, -1));
    if (period === "last7") return rangeBounds(addDays(today, -6), today);
    if (period === "custom") {
      const selected = fromDateInputValue(customDate);
      return dayBounds(selected);
    }
    return undefined; // "all"
  }, [period, customDate]);

  // Query orders
  const {
    data: orders = [],
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ["admin-orders", tenant.id, range?.from, range?.to],
    queryFn: () => ordersService.list(range),
    refetchInterval: 10000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true
  });

  // Query details for selected order in modal
  const { data: selectedOrder } = useQuery({
    enabled: Boolean(selectedOrderId),
    queryKey: ["order-details", tenant.id, selectedOrderId],
    queryFn: () => ordersService.get(selectedOrderId!)
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      ordersService.updateStatus(orderId, status),
    onSuccess: (order) => {
      toast.success(`Pedido #${order.publicCode} atualizado para ${order.status}.`);
      void queryClient.invalidateQueries({ queryKey: ["admin-orders", tenant.id] });
      void queryClient.invalidateQueries({ queryKey: ["kitchen-orders", tenant.id] });
      void queryClient.invalidateQueries({ queryKey: ["admin-summary", tenant.id], refetchType: "all" });
      if (selectedOrderId) {
        void queryClient.invalidateQueries({ queryKey: ["order-details", tenant.id, selectedOrderId] });
      }
    },
    onError: () => {
      toast.error("Nao foi possivel atualizar o status do pedido.");
    }
  });

  // Client-side filtering
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const codeMatch = order.publicCode.toLowerCase().includes(query);
        const nameMatch = order.customerName.toLowerCase().includes(query);
        const phoneMatch = (order.customerPhone ?? "").toLowerCase().includes(query);
        const totalMatch =
          order.total.toString().includes(query) ||
          formatCurrency(order.total).toLowerCase().includes(query);
        const itemMatch = order.items.some((item) =>
          item.productNameSnapshot.toLowerCase().includes(query)
        );
        if (!codeMatch && !nameMatch && !phoneMatch && !totalMatch && !itemMatch) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "ALL" && order.status !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== "ALL" && order.type !== typeFilter) {
        return false;
      }

      // Payment filter
      if (paymentFilter !== "ALL") {
        const isPaid = order.payment?.status === "PAID";
        if (paymentFilter === "PAID" && !isPaid) return false;
        if (paymentFilter === "PENDING" && isPaid) return false;
      }

      return true;
    });
  }, [orders, searchQuery, statusFilter, typeFilter, paymentFilter]);

  // Aggregated metrics for current filtered view
  const metrics = useMemo(() => {
    const totalCount = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;
    const activeCount = filteredOrders.filter(
      (o) => !["DELIVERED", "COMPLETED", "CANCELLED", "REJECTED"].includes(o.status)
    ).length;

    return {
      totalCount,
      totalRevenue,
      avgTicket,
      activeCount
    };
  }, [filteredOrders]);

  // Description label for date context
  const dateLabel = useMemo(() => {
    if (period === "today") return "Hoje";
    if (period === "yesterday") return "Ontem";
    if (period === "last7") return "Últimos 7 dias";
    if (period === "custom") {
      const parts = customDate.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return customDate;
    }
    return "Todas as datas";
  }, [period, customDate]);

  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    paymentFilter !== "ALL" ||
    period !== "today";

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setPaymentFilter("ALL");
    setPeriod("today");
    setCustomDate(toDateInputValue(new Date()));
  };

  return (
    <section className="screen orders-screen">
      <PageHeader
        eyebrow="Pedidos"
        title="Gestao de pedidos"
        description="Consulte, filtre e gerencie o status dos pedidos recebidos e do histórico da loja."
        actions={
          <div className="orders-header-actions">
            {socket.lastEvent ? (
              <span className="orders-socket-indicator" title="Status de comunicacao em tempo real">
                <span className="socket-dot" /> {socket.lastEvent}
              </span>
            ) : null}
            <button
              aria-label="Atualizar lista de pedidos"
              className="orders-refresh-button"
              disabled={isFetching}
              onClick={() => void refetch()}
              type="button"
            >
              <RefreshCw className={isFetching ? "spin" : ""} size={16} />
              <span>{isFetching ? "Atualizando..." : "Atualizar"}</span>
            </button>
          </div>
        }
      />

      {/* Cards de Resumo e Totalizadores */}
      <section aria-label="Resumo estatistico dos pedidos" className="orders-metrics-grid">
        <article className="orders-stat-card">
          <div className="stat-card-icon">
            <ReceiptText size={20} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Total de pedidos</span>
            <strong className="stat-card-value">{metrics.totalCount}</strong>
            <small className="stat-card-context">{dateLabel}</small>
          </div>
        </article>

        <article className="orders-stat-card">
          <div className="stat-card-icon">
            <DollarSign size={20} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Faturamento</span>
            <strong className="stat-card-value">{formatCurrency(metrics.totalRevenue)}</strong>
            <small className="stat-card-context">{dateLabel}</small>
          </div>
        </article>

        <article className="orders-stat-card">
          <div className="stat-card-icon">
            <PackageCheck size={20} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Ticket médio</span>
            <strong className="stat-card-value">{formatCurrency(metrics.avgTicket)}</strong>
            <small className="stat-card-context">Média por pedido</small>
          </div>
        </article>

        <article className="orders-stat-card">
          <div className="stat-card-icon">
            <Clock size={20} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Em andamento</span>
            <strong className="stat-card-value">{metrics.activeCount}</strong>
            <small className="stat-card-context">Aguardando entrega</small>
          </div>
        </article>
      </section>

      {/* Barra de Filtros Elaborada */}
      <section aria-label="Filtros de pedidos" className="orders-filter-section">
        <div className="orders-filter-bar">
          {/* Input de Pesquisa Dinâmica */}
          <div className="orders-search-wrapper">
            <Search aria-hidden="true" className="orders-search-icon" size={17} />
            <input
              aria-label="Buscar pedidos por cliente, código, valor ou produto"
              className="orders-search-input"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, #código, valor ou produto..."
              type="text"
              value={searchQuery}
            />
            {searchQuery ? (
              <button
                aria-label="Limpar texto de busca"
                className="orders-search-clear"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>

          {/* Filtro por Data / Período */}
          <div className="orders-date-wrapper">
            <div className="orders-date-presets">
              <button
                className={`date-preset-btn ${period === "today" ? "active" : ""}`}
                onClick={() => setPeriod("today")}
                type="button"
              >
                Hoje
              </button>
              <button
                className={`date-preset-btn ${period === "yesterday" ? "active" : ""}`}
                onClick={() => setPeriod("yesterday")}
                type="button"
              >
                Ontem
              </button>
              <button
                className={`date-preset-btn ${period === "last7" ? "active" : ""}`}
                onClick={() => setPeriod("last7")}
                type="button"
              >
                7 dias
              </button>
              <button
                className={`date-preset-btn ${period === "all" ? "active" : ""}`}
                onClick={() => setPeriod("all")}
                type="button"
              >
                Todos
              </button>
            </div>

            <div className="orders-date-picker-container">
              <CalendarDays aria-hidden="true" className="date-picker-icon" size={16} />
              <input
                aria-label="Selecionar data específica"
                className="orders-date-input"
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setPeriod("custom");
                }}
                type="date"
                value={customDate}
              />
            </div>
          </div>
        </div>

        {/* Linha de Selects Padrão Shadcn */}
        <div className="orders-selects-row">
          {/* Select de Status */}
          <div className="select-control-group">
            <label className="select-label">Status do pedido</label>
            <Select onValueChange={setStatusFilter} value={statusFilter}>
              <SelectTrigger className="orders-shadcn-trigger">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="PLACED">Novo / Recebido</SelectItem>
                <SelectItem value="ACCEPTED">Aceito</SelectItem>
                <SelectItem value="PREPARING">Em preparação</SelectItem>
                <SelectItem value="READY">Pronto</SelectItem>
                <SelectItem value="DISPATCHED">Saiu para entrega</SelectItem>
                <SelectItem value="DELIVERED">Entregue</SelectItem>
                <SelectItem value="COMPLETED">Concluído</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
                <SelectItem value="REJECTED">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select de Tipo de Entrega */}
          <div className="select-control-group">
            <label className="select-label">Tipo de entrega</label>
            <Select onValueChange={setTypeFilter} value={typeFilter}>
              <SelectTrigger className="orders-shadcn-trigger">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                <SelectItem value="DELIVERY">Delivery (Entrega)</SelectItem>
                <SelectItem value="PICKUP">Retirada</SelectItem>
                <SelectItem value="DINE_IN">Consumo no Local</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select de Status de Pagamento */}
          <div className="select-control-group">
            <label className="select-label">Pagamento</label>
            <Select onValueChange={setPaymentFilter} value={paymentFilter}>
              <SelectTrigger className="orders-shadcn-trigger">
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os pagamentos</SelectItem>
                <SelectItem value="PAID">Pago</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botão para limpar filtros */}
          {hasActiveFilters ? (
            <div className="clear-filters-wrapper">
              <button className="clear-filters-button" onClick={clearAllFilters} type="button">
                <X size={15} />
                <span>Limpar filtros</span>
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Lista de Pedidos */}
      <section aria-label="Lista de pedidos recebidos" className="orders-list-container">
        {isLoading ? (
          <div className="orders-loading-state">
            <RefreshCw className="spin" size={24} />
            <p>Carregando pedidos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="orders-empty-state">
            <div className="empty-icon-circle">
              <AlertCircle size={28} />
            </div>
            <h3>Nenhum pedido encontrado</h3>
            <p>Não há pedidos para a data ou filtros informados no momento.</p>
            {hasActiveFilters ? (
              <button className="empty-clear-button" onClick={clearAllFilters} type="button">
                Limpar filtros aplicados
              </button>
            ) : null}
          </div>
        ) : (
          <div className="orders-list-stack">
            {filteredOrders.map((order) => {
              const deliveryTypeLabel =
                order.type === "DELIVERY" ? "Delivery" : order.type === "PICKUP" ? "Retirada" : "No Local";
              const DeliveryIcon =
                order.type === "DELIVERY" ? Bike : order.type === "PICKUP" ? ShoppingBag : Store;

              return (
                <article className="order-manage-card" key={order.id}>
                  {/* Cabeçalho do Card */}
                  <div className="order-manage-header">
                    <div className="order-manage-id-block">
                      <span className="order-manage-code">#{order.publicCode}</span>
                      <StatusBadge status={order.status} />
                      <span className="order-manage-type-badge">
                        <DeliveryIcon size={14} />
                        {deliveryTypeLabel}
                      </span>
                    </div>

                    <div className="order-manage-time-block">
                      <Clock size={14} />
                      <span>{formatShortDate(new Date(order.createdAt ?? ""))} às {formatTime(order.createdAt)}</span>
                    </div>
                  </div>

                  {/* Corpo do Pedido: Cliente e Itens */}
                  <div className="order-manage-body">
                    <div className="order-client-info">
                      <div className="client-name-phone">
                        <strong className="client-name">{order.customerName}</strong>
                        {order.customerPhone ? (
                          <span className="client-phone">
                            <Phone size={13} /> {order.customerPhone}
                          </span>
                        ) : null}
                      </div>

                      {order.type === "DELIVERY" && order.deliveryAddress ? (
                        <p className="order-client-address">
                          <MapPin size={13} />
                          <span>
                            {order.deliveryAddress.street}, {order.deliveryAddress.number}
                            {order.deliveryAddress.complement ? ` (${order.deliveryAddress.complement})` : ""} - {order.deliveryAddress.district}
                          </span>
                        </p>
                      ) : null}
                    </div>

                    {/* Resumo de itens */}
                    <div className="order-manage-items">
                      <ul className="order-items-compact-list">
                        {order.items.map((item) => (
                          <li key={item.id}>
                            <strong>{item.quantity}x</strong>
                            <span>{item.productNameSnapshot}</span>
                            {item.options.length > 0 ? (
                              <small className="item-options-preview">
                                ({item.options.map((opt) => opt.optionNameSnapshot).join(", ")})
                              </small>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      {order.notes ? (
                        <p className="order-manage-notes">
                          <em>Obs: {order.notes}</em>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Rodapé: Valores e Ações de Alteração de Status */}
                  <div className="order-manage-footer">
                    <div className="order-manage-totals">
                      <span className="totals-label">Total:</span>
                      <strong className="totals-amount">{formatCurrency(order.total)}</strong>
                      <span className={`payment-pill payment-${(order.payment?.status ?? "pending").toLowerCase()}`}>
                        {order.payment?.status === "PAID" ? "Pago" : "Pendente"}
                      </span>
                    </div>

                    <div className="order-manage-actions">
                      {/* Select para alterar o status diretamente */}
                      <div className="order-status-change-group">
                        <span className="status-change-label">Alterar status:</span>
                        <Select
                          disabled={updateStatus.isPending}
                          onValueChange={(nextStatus) => {
                            if (nextStatus === "REJECTED") {
                              setRejectDialogOrder(order);
                              return;
                            }
                            updateStatus.mutate({ orderId: order.id, status: nextStatus as OrderStatus });
                          }}
                          value={order.status}
                        >
                          <SelectTrigger className="order-status-select-trigger">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLACED">Novo / Recebido</SelectItem>
                            <SelectItem value="ACCEPTED">Aceito</SelectItem>
                            <SelectItem value="PREPARING">Em preparação</SelectItem>
                            <SelectItem value="READY">Pronto</SelectItem>
                            <SelectItem value="DISPATCHED">Saiu para entrega</SelectItem>
                            <SelectItem value="DELIVERED">Entregue</SelectItem>
                            <SelectItem value="COMPLETED">Concluído</SelectItem>
                            <SelectItem value="CANCELLED">Cancelado</SelectItem>
                            <SelectItem value="REJECTED">Rejeitado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Botão Ver Detalhes */}
                      <button
                        aria-label="Ver detalhes completos do pedido"
                        className="order-details-btn"
                        onClick={() => setSelectedOrderId(order.id)}
                        type="button"
                      >
                        <Eye size={15} />
                        <span>Detalhes</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal de Detalhes Completos */}
      {selectedOrderId && selectedOrder ? (
        <div className="order-modal-backdrop" onClick={() => setSelectedOrderId(null)}>
          <div className="order-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <header className="order-modal-header">
              <div>
                <h2>Pedido #{selectedOrder.publicCode}</h2>
                <span>Criado em {formatShortDate(new Date(selectedOrder.createdAt ?? ""))} às {formatTime(selectedOrder.createdAt)}</span>
              </div>
              <button
                aria-label="Fechar detalhes"
                className="order-modal-close"
                onClick={() => setSelectedOrderId(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </header>

            <div className="order-modal-body">
              {/* Cliente */}
              <section className="modal-section">
                <h3>Cliente</h3>
                <div className="modal-info-grid">
                  <div>
                    <small>Nome</small>
                    <strong>{selectedOrder.customerName}</strong>
                  </div>
                  <div>
                    <small>Telefone</small>
                    <strong>{selectedOrder.customerPhone || "Não informado"}</strong>
                  </div>
                  <div>
                    <small>Tipo de entrega</small>
                    <strong>{selectedOrder.type === "DELIVERY" ? "Delivery" : selectedOrder.type === "PICKUP" ? "Retirada" : "No Local"}</strong>
                  </div>
                </div>

                {selectedOrder.deliveryAddress ? (
                  <div className="modal-address-box">
                    <MapPin size={16} />
                    <div>
                      <strong>Endereço de entrega:</strong>
                      <p>
                        {selectedOrder.deliveryAddress.street}, {selectedOrder.deliveryAddress.number}
                        {selectedOrder.deliveryAddress.complement ? ` - ${selectedOrder.deliveryAddress.complement}` : ""}
                      </p>
                      <small>
                        {selectedOrder.deliveryAddress.district}, {selectedOrder.deliveryAddress.city}/{selectedOrder.deliveryAddress.state} - CEP: {selectedOrder.deliveryAddress.postalCode}
                      </small>
                      {selectedOrder.deliveryAddress.reference ? (
                        <p className="modal-reference">Ref: {selectedOrder.deliveryAddress.reference}</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </section>

              {/* Itens */}
              <section className="modal-section">
                <h3>Itens do pedido ({selectedOrder.items.length})</h3>
                <div className="modal-items-list">
                  {selectedOrder.items.map((item) => (
                    <div className="modal-item-row" key={item.id}>
                      <div className="item-title-qty">
                        <strong>{item.quantity}x {item.productNameSnapshot}</strong>
                        {item.options.length > 0 ? (
                          <ul className="item-options-list">
                            {item.options.map((opt) => (
                              <li key={opt.id}>
                                + {opt.quantity}x {opt.optionNameSnapshot} ({formatCurrency(opt.totalPrice)})
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {item.notes ? <p className="item-note">Obs: {item.notes}</p> : null}
                      </div>
                      <span className="item-price">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Financeiro */}
              <section className="modal-section">
                <h3>Resumo de valores</h3>
                <div className="modal-financial-grid">
                  <div className="fin-row">
                    <span>Subtotal:</span>
                    <strong>{formatCurrency(selectedOrder.subtotal)}</strong>
                  </div>
                  {selectedOrder.deliveryFee > 0 ? (
                    <div className="fin-row">
                      <span>Taxa de entrega:</span>
                      <strong>+{formatCurrency(selectedOrder.deliveryFee)}</strong>
                    </div>
                  ) : null}
                  {selectedOrder.discountTotal > 0 ? (
                    <div className="fin-row discount">
                      <span>Desconto:</span>
                      <strong>-{formatCurrency(selectedOrder.discountTotal)}</strong>
                    </div>
                  ) : null}
                  <div className="fin-row total">
                    <span>Total:</span>
                    <strong>{formatCurrency(selectedOrder.total)}</strong>
                  </div>
                </div>
              </section>

              {/* Histórico */}
              {selectedOrder.history && selectedOrder.history.length > 0 ? (
                <section className="modal-section">
                  <h3>Histórico de alterações</h3>
                  <div className="modal-history-list">
                    {selectedOrder.history.map((entry) => (
                      <div className="modal-history-item" key={entry.id}>
                        <Clock size={13} />
                        <span>{formatTime(entry.createdAt)}</span>
                        <StatusBadge status={entry.toStatus} />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <footer className="order-modal-footer">
              <div className="modal-footer-status">
                <span>Status atual:</span>
                <StatusBadge status={selectedOrder.status} />
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedOrderId(null)} type="button">
                Fechar
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {/* Confirmação de rejeição */}
      <ConfirmDialog
        cancelLabel="Voltar"
        confirmLabel="Rejeitar pedido"
        description={`Tem certeza de que deseja rejeitar o pedido #${rejectDialogOrder?.publicCode}? Ele não seguirá para produção.`}
        isLoading={updateStatus.isPending}
        onCancel={() => setRejectDialogOrder(null)}
        onConfirm={() => {
          if (rejectDialogOrder) {
            updateStatus.mutate({ orderId: rejectDialogOrder.id, status: "REJECTED" });
            setRejectDialogOrder(null);
          }
        }}
        open={Boolean(rejectDialogOrder)}
        title="Rejeitar pedido?"
        tone="danger"
      />
    </section>
  );
}


