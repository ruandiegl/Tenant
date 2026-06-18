import { useQuery } from "@tanstack/react-query";
import { PackageCheck, Plus } from "lucide-react";
import { ProductCard } from "../../components/menu/product-card";
import { PageHeader } from "../../components/ui/page-header";
import { StatusBadge } from "../../components/ui/status-badge";
import { mockApi } from "../../services/mock-api";

export function AdminMenu() {
  const { data } = useQuery({ queryKey: ["admin-menu"], queryFn: mockApi.getPublicMenu });

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Cardapio"
        title="Categorias e produtos"
        description="Mock com MenuCategory, Product, OptionGroup, OptionItem e ProductAvailability."
        actions={
          <button className="pill-button">
            <Plus size={17} /> Produto
          </button>
        }
      />

      <div className="admin-grid">
        <article className="panel">
          <h2>Categorias</h2>
          {data?.categories.map((category) => (
            <div className="rank-row" key={category.id}>
              <div>
                <strong>{category.name}</strong>
                <span>{category.description}</span>
              </div>
              <StatusBadge status={category.status} />
            </div>
          ))}
        </article>

        <article className="panel">
          <h2>Disponibilidade</h2>
          {data?.productAvailability.map((availability) => {
            const product = data.products.find((item) => item.id === availability.productId);
            return (
              <div className="rank-row" key={availability.id}>
                <div>
                  <strong>{product?.name}</strong>
                  <span>Estoque {availability.stockQuantity ?? "sem limite"}</span>
                </div>
                <PackageCheck size={18} />
              </div>
            );
          })}
        </article>
      </div>

      <div className="product-grid">
        {data?.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
