import { useQuery } from "@tanstack/react-query";
import { OrderCard } from "../../components/orders/order-card";
import { PageHeader } from "../../components/ui/page-header";
import { mockApi } from "../../services/mock-api";

export function AdminOrders() {
  const { data: orders } = useQuery({ queryKey: ["admin-orders"], queryFn: mockApi.getOrders });

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
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </section>
  );
}
