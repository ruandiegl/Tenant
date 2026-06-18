import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCatalog } from "../../app/providers/catalog-provider";
import { useCustomerFlow } from "../../app/providers/customer-flow-provider";
import { useTenant } from "../../app/providers/tenant-provider";
import { ProductCard } from "../../components/menu/product-card";
import { PageHeader } from "../../components/ui/page-header";

export function CustomerMenu() {
  const { settings } = useTenant();
  const { addProduct, items } = useCustomerFlow();
  const { publicCategories, publicProducts, getProductStock, loading, error } = useCatalog();

  const featured = publicProducts.filter((product) => product.isFeatured);
  const cartQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="screen customer-screen">
      <div className="brand-hero" style={{ backgroundImage: `url(${settings.logoUrl})` }}>
        <div>
          <span>Aberto para entrega e retirada</span>
          <h1>{settings.brandName}</h1>
          <p>Escolha, pague e acompanhe sem precisar criar uma conta.</p>
        </div>
      </div>

      <PageHeader
        eyebrow="Cliente"
        title="Escolha seu pedido"
        description={`Pedido minimo ${settings.currency} ${settings.minimumOrderValue.toFixed(2)}`}
        actions={
          <Link className="pill-button" to="/cliente/carrinho">
            <ShoppingCart size={17} /> Carrinho {cartQuantity > 0 ? `(${cartQuantity})` : ""}
          </Link>
        }
      />

      <div className="category-strip" aria-label="Categorias">
        {publicCategories.map((category) => (
          <button key={category.id}>{category.name}</button>
        ))}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="muted-text">Carregando cardapio...</p> : null}

      <section className="section-block">
        <h2>Destaques</h2>
        <div className="product-grid">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} stockQuantity={getProductStock(product.id)} onAdd={addProduct} />
          ))}
        </div>
      </section>

      <section className="section-block">
        <h2>Cardapio completo</h2>
        <div className="product-grid">
          {publicProducts.map((product) => (
            <ProductCard key={product.id} product={product} stockQuantity={getProductStock(product.id)} onAdd={addProduct} />
          ))}
        </div>
        {!loading && publicProducts.length === 0 ? <p className="muted-text">Nenhum produto ativo no cardapio.</p> : null}
      </section>
    </section>
  );
}
