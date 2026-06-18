import { Clock, MapPin, Phone } from "lucide-react";
import { Order } from "../../types/database";
import { formatCurrency, formatTime, minutesUntil } from "../../utils/format";
import { StatusBadge } from "../ui/status-badge";

type OrderCardProps = {
  order: Order;
  compact?: boolean;
};

export function OrderCard({ order, compact = false }: OrderCardProps) {
  return (
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
    </article>
  );
}
