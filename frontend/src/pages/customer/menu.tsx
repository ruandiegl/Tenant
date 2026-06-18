import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useTenant } from "../../app/providers/tenant-provider";
import { ProductCard } from "../../components/menu/product-card";
import { PageHeader } from "../../components/ui/page-header";
import { mockApi } from "../../services/mock-api";

export function CustomerMenu() {
  const { settings } = useTenant();
  const { data } = useQuery({ queryKey: ["public-menu"], queryFn: mockApi.getPublicMenu });

  const featured = data?.products.filter((product) => product.isFeatured) ?? [];

  return (
    <section className="screen customer-screen">
      <div className="brand-hero" style={{ backgroundImage: `url(${settings.logoUrl})` }}>
        <div>
          <span>Aberto para entrega e retirada</span>
          <h1>{settings.brandName}</h1>
          <p>Cardapio publico por tenant com checkout convidado habilitado.</p>
        </div>
      </div>

      <PageHeader
        eyebrow="Cliente"
        title="Escolha seu pedido"
        description={`Pedido minimo ${settings.currency} ${settings.minimumOrderValue.toFixed(2)}`}
        actions={
          <Link className="pill-button" to="/cliente/carrinho">
            <ShoppingCart size={17} /> Carrinho
          </Link>
        }
      />

      <div className="category-strip" aria-label="Categorias">
        {data?.categories.map((category) => (
          <button key={category.id}>{category.name}</button>
        ))}
      </div>

      <section className="section-block">
        <h2>Destaques</h2>
        <div className="product-grid">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="section-block">
        <h2>Cardapio completo</h2>
        <div className="product-grid">
          {data?.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </section>
  );
}
