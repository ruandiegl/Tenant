import "./styles.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { OrderCard } from "../../../components/orders/order-card";
import { PageHeader } from "../../../components/ui/page-header";
import { ordersService } from "../../../services/orders";
import { OrderStatus } from "../../../types/database";

export function AdminOrders() {
  const queryClient = useQueryClient();
  const { data: orders } = useQuery({ queryKey: ["admin-orders"], queryFn: ordersService.list });
  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) => ordersService.updateStatus(orderId, status),
    onSuccess: (order) => {
      toast.success(`Pedido #${order.publicCode} atualizado para ${order.status}.`);
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
    },
    onError: () => {
      toast.error("Nao foi possivel atualizar o status do pedido.");
    }
  });

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Pedidos"
        title="Gestao de pedidos"
        description="Filtros por status, filial, pagamento e tipo de entrega entram aqui no backend."
      />

      <div className="filter-row">
        <button className="active">Todos</button>
        <button>Novo</button>
        <button>Preparo</button>
        <button>Pago</button>
      </div>

      <div className="list-stack">
        {orders?.map((order) => (
          <OrderCard
            isUpdating={updateStatus.isPending}
            key={order.id}
            onStatusChange={(orderId, status) => updateStatus.mutate({ orderId, status })}
            order={order}
          />
        ))}
      </div>
    </section>
  );
}

