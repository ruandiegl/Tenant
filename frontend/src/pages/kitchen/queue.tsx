import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, PlayCircle } from "lucide-react";
import { useSocket } from "../../app/providers/socket-provider";
import { OrderCard } from "../../components/orders/order-card";
import { PageHeader } from "../../components/ui/page-header";
import { StatusBadge } from "../../components/ui/status-badge";
import { kitchenService } from "../../services/kitchen";
import { formatTime } from "../../utils/format";

export function KitchenQueue() {
  const socket = useSocket();
  const { data: queue } = useQuery({ queryKey: ["kitchen-queue"], queryFn: kitchenService.getQueue });

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Cozinha"
        title="Fila de preparo"
        description="Tickets seguem KitchenTicket e podem evoluir para estacoes por filial."
        actions={<span className="connection">{socket.lastEvent}</span>}
      />

      <div className="filter-row">
        <button className="active">Todos</button>
        <button>Novos</button>
        <button>Preparo</button>
        <button>Atrasados</button>
      </div>

      <div className="kitchen-grid">
        {queue?.map(({ ticket, order }) => (
          <article className="kitchen-ticket" key={ticket.id}>
            <header>
              <div>
                <span className="code">{ticket.station}</span>
                <h2>#{order.publicCode}</h2>
              </div>
              <StatusBadge status={ticket.status} />
            </header>
            <OrderCard order={order} compact />
            <div className="ticket-meta">
              <span>Prioridade {ticket.priority}</span>
              <span>Fila {formatTime(ticket.queuedAt)}</span>
            </div>
            <div className="action-grid">
              <button onClick={() => socket.emit("kitchen.order_started", { ticketId: ticket.id })}>
                <PlayCircle size={17} /> Iniciar
              </button>
              <button onClick={() => socket.emit("kitchen.order_ready", { ticketId: ticket.id })}>
                <CheckCircle2 size={17} /> Pronto
              </button>
              <button onClick={() => socket.emit("notification.created", { ticketId: ticket.id })}>
                <AlertTriangle size={17} /> Atraso
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
