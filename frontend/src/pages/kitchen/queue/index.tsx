import "./styles.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { useSocket } from "../../../app/providers/socket-provider";
import { PageHeader } from "../../../components/ui/page-header";
import { StatusBadge } from "../../../components/ui/status-badge";
import { ordersService } from "../../../services/orders";
import { Order, OrderStatus } from "../../../types/database";
import { formatCurrency, formatTime } from "../../../utils/format";

type KitchenColumn = {
  id: string;
  title: string;
  description: string;
  statuses: OrderStatus[];
};

const kitchenColumns: KitchenColumn[] = [
  {
    id: "new",
    title: "Novo",
    description: "Pedidos aguardando inicio",
    statuses: ["PLACED", "ACCEPTED"]
  },
  {
    id: "preparing",
    title: "Preparando",
    description: "Em preparo ou pronto para despacho",
    statuses: ["PREPARING", "READY"]
  },
  {
    id: "delivery",
    title: "Saiu para entrega",
    description: "Pedidos em rota",
    statuses: ["DISPATCHED"]
  },
  {
    id: "done",
    title: "Concluido",
    description: "Pedidos finalizados",
    statuses: ["DELIVERED", "COMPLETED"]
  }
];

const nextStatus: Partial<Record<OrderStatus, { label: string; status: OrderStatus }>> = {
  PLACED: { label: "Aceitar", status: "ACCEPTED" },
  ACCEPTED: { label: "Iniciar preparo", status: "PREPARING" },
  PREPARING: { label: "Marcar pronto", status: "READY" },
  READY: { label: "Saiu para entrega", status: "DISPATCHED" },
  DISPATCHED: { label: "Entregue", status: "DELIVERED" },
  DELIVERED: { label: "Concluir", status: "COMPLETED" }
};

const previousStatus: Partial<Record<OrderStatus, { label: string; status: OrderStatus }>> = {
  ACCEPTED: { label: "Voltar para novo", status: "PLACED" },
  PREPARING: { label: "Voltar para aceito", status: "ACCEPTED" },
  READY: { label: "Voltar para preparo", status: "PREPARING" },
  DISPATCHED: { label: "Voltar para pronto", status: "READY" },
  DELIVERED: { label: "Voltar para entrega", status: "DISPATCHED" },
  COMPLETED: { label: "Voltar para entregue", status: "DELIVERED" }
};

export function KitchenQueue() {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(() => new Set());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { data: orders = [], isLoading } = useQuery({ queryKey: ["kitchen-orders"], queryFn: ordersService.list });
  const { data: selectedOrder, isFetching: isFetchingDetails } = useQuery({
    enabled: Boolean(selectedOrderId),
    queryKey: ["order-details", selectedOrderId],
    queryFn: () => ordersService.get(selectedOrderId!)
  });
  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) => ordersService.updateStatus(orderId, status),
    onSuccess: (order) => {
      toast.info(`Pedido #${order.publicCode} movido para ${order.status}.`);
      void queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
      if (selectedOrderId) {
        void queryClient.invalidateQueries({ queryKey: ["order-details", selectedOrderId] });
      }
    },
    onError: () => {
      toast.error("Nao foi possivel trocar o status do pedido.");
    }
  });

  const toggleExpanded = (orderId: string) => {
    setExpandedOrders((current) => {
      const next = new Set(current);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Cozinha"
        title="Fila de preparo"
        description="Pedidos separados por status para acompanhar o fluxo operacional."
        actions={<span className="connection">{socket.lastEvent}</span>}
      />

      {isLoading ? <p className="muted-text">Carregando pedidos...</p> : null}

      <div className="kitchen-board">
        {kitchenColumns.map((column) => {
          const columnOrders = orders.filter((order) => column.statuses.includes(order.status));

          return (
            <section className="kitchen-column" key={column.id}>
              <header>
                <div>
                  <h2>{column.title}</h2>
                  <span>{column.description}</span>
                </div>
                <strong>{columnOrders.length}</strong>
              </header>

              <div className="kitchen-column-list">
                {columnOrders.map((order) => (
                  <KitchenOrderCard
                    expanded={expandedOrders.has(order.id)}
                    isUpdating={updateStatus.isPending}
                    key={order.id}
                    onAdvance={(status) => updateStatus.mutate({ orderId: order.id, status })}
                    onDetails={() => setSelectedOrderId(order.id)}
                    onRevert={(status) => updateStatus.mutate({ orderId: order.id, status })}
                    onToggle={() => toggleExpanded(order.id)}
                    order={order}
                  />
                ))}

                {columnOrders.length === 0 ? <p className="muted-text">Nenhum pedido nesta etapa.</p> : null}
              </div>
            </section>
          );
        })}
      </div>

      {selectedOrderId ? (
        <OrderDetailsModal
          isLoading={isFetchingDetails}
          isUpdating={updateStatus.isPending}
          onAdvance={(status) => selectedOrder && updateStatus.mutate({ orderId: selectedOrder.id, status })}
          onClose={() => setSelectedOrderId(null)}
          onRevert={(status) => selectedOrder && updateStatus.mutate({ orderId: selectedOrder.id, status })}
          order={selectedOrder}
        />
      ) : null}
    </section>
  );
}

function KitchenOrderCard({
  order,
  expanded,
  isUpdating,
  onToggle,
  onAdvance,
  onRevert,
  onDetails
}: {
  order: Order;
  expanded: boolean;
  isUpdating: boolean;
  onToggle: () => void;
  onAdvance: (status: OrderStatus) => void;
  onRevert: (status: OrderStatus) => void;
  onDetails: () => void;
}) {
  const action = nextStatus[order.status];
  const backAction = previousStatus[order.status];
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <article className="kitchen-order-card">
      <button className="kitchen-order-summary" onClick={onToggle}>
        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <div>
          <span className="code">#{order.publicCode}</span>
          <strong>{order.customerName}</strong>
          <small>
            {itemCount} itens - {formatCurrency(order.total)}
          </small>
        </div>
        <StatusBadge status={order.status} />
      </button>

      {expanded ? (
        <div className="kitchen-order-details">
          <div className="ticket-meta">
            <span>Criado {formatTime(order.createdAt)}</span>
            <span>{order.type}</span>
          </div>

          <ul className="item-list">
            {order.items.map((item) => (
              <li key={item.id}>
                <strong>{item.quantity}x</strong>
                <span>
                  {item.productNameSnapshot}
                  {item.options.length > 0 ? ` + ${item.options.map((option) => option.optionNameSnapshot).join(", ")}` : ""}
                  {item.notes ? ` - ${item.notes}` : ""}
                </span>
              </li>
            ))}
          </ul>

          {order.notes ? <p className="muted-text">{order.notes}</p> : null}

          <div className="kitchen-card-actions">
            {backAction ? (
              <button disabled={isUpdating} onClick={() => onRevert(backAction.status)}>
                <ChevronLeft size={16} /> {backAction.label}
              </button>
            ) : null}
            <button onClick={onDetails}>
              <Eye size={16} /> Detalhes
            </button>
            {action ? (
              <button className="primary-button" disabled={isUpdating} onClick={() => onAdvance(action.status)}>
                {isUpdating ? "Atualizando..." : action.label}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function OrderDetailsModal({
  order,
  isLoading,
  isUpdating,
  onClose,
  onAdvance,
  onRevert
}: {
  order?: Order;
  isLoading: boolean;
  isUpdating: boolean;
  onClose: () => void;
  onAdvance: (status: OrderStatus) => void;
  onRevert: (status: OrderStatus) => void;
}) {
  const action = order ? nextStatus[order.status] : undefined;
  const backAction = order ? previousStatus[order.status] : undefined;
  const address = order?.deliveryAddress;

  return (
    <div className="modal-backdrop" role="presentation">
      <article className="modal-card order-details-modal" role="dialog" aria-modal="true" aria-label="Detalhes do pedido">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Pedido</span>
            <h2>{order ? `#${order.publicCode}` : "Carregando"}</h2>
          </div>
          <button aria-label="Fechar modal" className="ghost-icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {isLoading || !order ? <p className="muted-text">Carregando detalhes do pedido...</p> : null}

        {order ? (
          <div className="order-details-content">
            <section>
              <div className="order-detail-title">
                <h3>{order.customerName}</h3>
                <StatusBadge status={order.status} />
              </div>
              <p className="muted-text">
                {order.customerPhone || "Sem telefone"} - {order.type} - Criado {formatTime(order.createdAt)}
              </p>
              {order.notes ? <p className="muted-text">{order.notes}</p> : null}
            </section>

            {address ? (
              <section>
                <h3>Entrega</h3>
                <p className="muted-text">
                  {address.street}, {address.number}
                  {address.complement ? ` - ${address.complement}` : ""} - {address.district}, {address.city}/{address.state}
                </p>
                {address.reference ? <p className="muted-text">Referencia: {address.reference}</p> : null}
              </section>
            ) : null}

            <section>
              <h3>Itens</h3>
              <div className="order-detail-items">
                {order.items.map((item) => (
                  <article className="order-detail-item" key={item.id}>
                    <div>
                      <strong>
                        {item.quantity}x {item.productNameSnapshot}
                      </strong>
                      <span>{formatCurrency(item.totalPrice)}</span>
                    </div>
                    {item.options.length > 0 ? (
                      <ul>
                        {item.options.map((option) => (
                          <li key={option.id}>
                            {option.quantity}x {option.optionNameSnapshot} - {formatCurrency(option.totalPrice)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted-text">Ingredientes/complementos: sem adicionais selecionados.</p>
                    )}
                    {item.notes ? <p className="muted-text">Observacao: {item.notes}</p> : null}
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h3>Valores</h3>
              <div className="order-totals-grid">
                <span>Subtotal</span>
                <strong>{formatCurrency(order.subtotal)}</strong>
                <span>Entrega</span>
                <strong>{formatCurrency(order.deliveryFee)}</strong>
                <span>Desconto</span>
                <strong>-{formatCurrency(order.discountTotal)}</strong>
                <span>Total</span>
                <strong>{formatCurrency(order.total)}</strong>
              </div>
            </section>

            {order.history.length > 0 ? (
              <section>
                <h3>Historico</h3>
                <div className="status-list">
                  {order.history.map((entry) => (
                    <div key={entry.id}>
                      <span>{formatTime(entry.createdAt)}</span>
                      <StatusBadge status={entry.toStatus} />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="kitchen-card-actions">
              {backAction ? (
                <button disabled={isUpdating} onClick={() => onRevert(backAction.status)}>
                  <ChevronLeft size={16} /> {backAction.label}
                </button>
              ) : null}
              {action ? (
                <button className="primary-button" disabled={isUpdating} onClick={() => onAdvance(action.status)}>
                  {isUpdating ? "Atualizando..." : action.label}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </article>
    </div>
  );
}

