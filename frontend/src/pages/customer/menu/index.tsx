import "./styles.css";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { toast } from "react-toastify";
import { useCatalog } from "../../../app/providers/catalog-provider";
import type { CustomerRemovedIngredient, CustomerSelectedOption } from "../../../app/providers/customer-flow-provider";
import { useCustomerFlow } from "../../../app/providers/customer-flow-provider";
import { useTenant } from "../../../app/providers/tenant-provider";
import { ProductCard } from "../../../components/menu/product-card";
import { ProductCustomizerSheet } from "../../../components/menu/product-customizer-sheet";
import { PageHeader } from "../../../components/ui/page-header";
import { Product } from "../../../types/database";
import { useState } from "react";
import { DEFAULT_PUBLIC_TENANT_SLUG, getPublicTenantSlug, publicTenantPath } from "../../../utils/public-tenant-route";

export function CustomerMenu() {
  const location = useLocation();
  const tenantSlug = getPublicTenantSlug(location.pathname) ?? DEFAULT_PUBLIC_TENANT_SLUG;
  const { settings } = useTenant();
  const { addProduct, items } = useCustomerFlow();
  const { publicCategories, publicProducts, getProductStock, loading, error } = useCatalog();
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);

  const featured = publicProducts.filter((product) => product.isFeatured);
  const cartQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const categoriesWithProducts = publicCategories.map((category) => ({
    ...category,
    products: publicProducts.filter((product) => product.categoryId === category.id)
  }));

  const scrollToCategory = (categoryId: string) => {
    document.getElementById(`customer-category-${categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleAddProduct = (product: Product) => {
    const hasCustomization = product.optionGroups.some((group) => group.items.length > 0);

    if (hasCustomization) {
      setCustomizingProduct(product);
      return;
    }

    addProduct(product);
    toast.success(`${product.name} adicionado ao carrinho.`);
  };

  const addCustomizedProduct = (
    product: Product,
    options: CustomerSelectedOption[],
    notes: string,
    removedIngredients: CustomerRemovedIngredient[]
  ) => {
    addProduct(product, options, notes, removedIngredients);
    toast.success(`${product.name} adicionado ao carrinho.`);
    setCustomizingProduct(null);
  };

  return (
    <section className="screen customer-screen">
      <div className="brand-hero" style={{ backgroundImage: `url(${settings.coverImageUrl || settings.logoUrl})` }}>
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
          <Link className="pill-button" to={publicTenantPath(tenantSlug, "/carrinho")}>
            <ShoppingCart size={17} /> Carrinho {cartQuantity > 0 ? `(${cartQuantity})` : ""}
          </Link>
        }
      />

      <div className="category-strip" aria-label="Categorias">
        {categoriesWithProducts.map((category) => (
          <button key={category.id} onClick={() => scrollToCategory(category.id)}>
            {category.name}
          </button>
        ))}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="muted-text">Carregando cardapio...</p> : null}

      <section className="section-block">
        <h2>Destaques</h2>
        <div className="product-grid">
          {featured.map((product) => (
            <ProductCard key={product.id} onAdd={handleAddProduct} product={product} stockQuantity={getProductStock(product.id)} />
          ))}
        </div>
      </section>

      <section className="section-block">
        <h2>Cardapio completo</h2>
        <div className="category-product-sections">
          {categoriesWithProducts.map((category) => (
            <section className="category-product-section" id={`customer-category-${category.id}`} key={category.id}>
              <div className="category-section-header">
                <h3>{category.name}</h3>
                {category.description ? <span>{category.description}</span> : null}
              </div>
              <div className="product-grid">
                {category.products.map((product) => (
                  <ProductCard key={product.id} onAdd={handleAddProduct} product={product} stockQuantity={getProductStock(product.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
        {!loading && publicProducts.length === 0 ? <p className="muted-text">Nenhum produto ativo no cardapio.</p> : null}
      </section>
      {customizingProduct ? (
        <ProductCustomizerSheet
          key={customizingProduct.id}
          onAdd={addCustomizedProduct}
          onClose={() => setCustomizingProduct(null)}
          product={customizingProduct}
        />
      ) : null}
    </section>
  );
}

