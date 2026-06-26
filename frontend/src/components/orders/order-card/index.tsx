import "./styles.css";
import { Clock, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { Order, OrderStatus } from "../../../types/database";
import { formatCurrency, formatTime, minutesUntil } from "../../../utils/format";
import { ConfirmDialog } from "../../ui/confirm-dialog";
import { StatusBadge } from "../../ui/status-badge";

type OrderCardProps = {
  order: Order;
  compact?: boolean;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
  isUpdating?: boolean;
};

const nextStatusByCurrent: Partial<Record<OrderStatus, Array<{ label: string; status: OrderStatus }>>> = {
  PLACED: [
    { label: "Aceitar", status: "ACCEPTED" },
    { label: "Rejeitar", status: "REJECTED" }
  ],
  ACCEPTED: [{ label: "Preparar", status: "PREPARING" }],
  PREPARING: [{ label: "Pronto", status: "READY" }],
  READY: [{ label: "Despachar", status: "DISPATCHED" }],
  DISPATCHED: [{ label: "Entregar", status: "DELIVERED" }],
  DELIVERED: [{ label: "Concluir", status: "COMPLETED" }]
};

export function OrderCard({ order, compact = false, onStatusChange, isUpdating = false }: OrderCardProps) {
  const nextStatuses = nextStatusByCurrent[order.status] ?? [];
  const [pendingRejectedOrder, setPendingRejectedOrder] = useState(false);

  const handleStatusClick = (status: OrderStatus) => {
    if (status === "REJECTED") {
      setPendingRejectedOrder(true);
      return;
    }

    onStatusChange?.(order.id, status);
  };

  const confirmRejectOrder = () => {
    onStatusChange?.(order.id, "REJECTED");
    setPendingRejectedOrder(false);
  };

  return (
    <>
      <article className="order-card">
      <div className="order-card-header">
        <div>
          <span className="code">#{order.publicCode}</span>
          <h3>{order.customerName}</h3>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="meta-grid">
        <span>
          <Clock size={15} /> {minutesUntil(order.estimatedReadyAt)} min
        </span>
        <span>
          <Phone size={15} /> {order.customerPhone}
        </span>
        <span>
          <MapPin size={15} /> {order.type}
        </span>
      </div>

      {!compact ? (
        <ul className="item-list">
          {order.items.map((item) => (
            <li key={item.id}>
              <strong>{item.quantity}x</strong>
              <span>
                {item.productNameSnapshot}
                {item.options.length > 0 ? ` + ${item.options.map((option) => option.optionNameSnapshot).join(", ")}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <footer>
        <span>Criado {formatTime(order.createdAt)}</span>
        <strong>{formatCurrency(order.total)}</strong>
      </footer>

      {onStatusChange && nextStatuses.length > 0 ? (
        <div className="order-status-actions">
          {nextStatuses.map((action) => (
            <button
              className={action.status === "REJECTED" ? "danger-action-button" : undefined}
              disabled={isUpdating}
              key={action.status}
              onClick={() => handleStatusClick(action.status)}
            >
              {isUpdating ? "Atualizando..." : action.label}
            </button>
          ))}
        </div>
      ) : null}
      </article>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Rejeitar"
        description={`O pedido #${order.publicCode} sera marcado como rejeitado e nao seguira para a cozinha.`}
        isLoading={isUpdating}
        onCancel={() => setPendingRejectedOrder(false)}
        onConfirm={confirmRejectOrder}
        open={pendingRejectedOrder}
        title="Rejeitar pedido?"
        tone="danger"
      />
    </>
  );
}

