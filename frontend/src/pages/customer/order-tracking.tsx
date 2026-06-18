import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { BellRing } from "lucide-react";
import { useSocket } from "../../app/providers/socket-provider";
import { OrderCard } from "../../components/orders/order-card";
import { PageHeader } from "../../components/ui/page-header";
import { StatusBadge } from "../../components/ui/status-badge";
import { mockApi } from "../../services/mock-api";
import { formatTime } from "../../utils/format";

const timeline = ["PLACED", "ACCEPTED", "PREPARING", "READY", "DISPATCHED", "COMPLETED"];

export function OrderTracking() {
  const { publicCode = "CB1008" } = useParams();
  const socket = useSocket();
  const { data: order } = useQuery({
    queryKey: ["order", publicCode],
    queryFn: () => mockApi.getOrderByPublicCode(publicCode)
  });

  if (!order) {
    return null;
  }

  const activeIndex = timeline.indexOf(order.status);

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Tempo real"
        title={`Pedido #${order.publicCode}`}
        description="Tela preparada para assinar a room order:{orderId} via Socket.IO."
        actions={
          <span className="connection">
            <BellRing size={16} /> {socket.connected ? "Socket mock online" : "Offline"}
          </span>
        }
      />

      <OrderCard order={order} />

      <article className="panel">
        <h2>Status do pedido</h2>
        <div className="timeline">
          {timeline.map((status, index) => (
            <div className={index <= activeIndex ? "active" : ""} key={status}>
              <span />
              <StatusBadge status={status} />
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2>Historico</h2>
        {order.history.map((history) => (
          <div className="history-row" key={history.id}>
            <StatusBadge status={history.toStatus} />
            <span>{formatTime(history.createdAt)}</span>
          </div>
        ))}
      </article>
    </section>
  );
}
