import "./styles.css";
import { Link, useLocation } from "react-router-dom";
import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import { toast } from "react-toastify";
import { useCatalog } from "../../../app/providers/catalog-provider";
import { CustomerSelectedOption, useCustomerFlow } from "../../../app/providers/customer-flow-provider";
import { useTenant } from "../../../app/providers/tenant-provider";
import { ProductCard } from "../../../components/menu/product-card";
import { PageHeader } from "../../../components/ui/page-header";
import { Product } from "../../../types/database";
import { formatCurrency } from "../../../utils/format";
import { useState } from "react";
import { DEFAULT_PUBLIC_TENANT_SLUG, getPublicTenantSlug, publicTenantPath } from "../../../utils/public-tenant-route";

export function CustomerMenu() {
  const location = useLocation();
  const tenantSlug = getPublicTenantSlug(location.pathname) ?? DEFAULT_PUBLIC_TENANT_SLUG;
  const { settings } = useTenant();
  const { addProduct, items } = useCustomerFlow();
  const { publicCategories, publicProducts, getProductStock, loading, error } = useCatalog();
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, CustomerSelectedOption>>({});
  const [customizationNotes, setCustomizationNotes] = useState("");

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
    if (product.optionGroups.some((group) => group.items.length > 0)) {
      setSelectedOptions({});
      setCustomizationNotes("");
      setCustomizingProduct(product);
      return;
    }

    addProduct(product, []);
    toast.success(`${product.name} adicionado ao carrinho.`);
  };

  const toggleOption = (option: { id: string; name: string; price: number }) => {
    setSelectedOptions((current) => {
      if (current[option.id]) {
        const next = { ...current };
        delete next[option.id];
        return next;
      }

      return {
        ...current,
        [option.id]: {
          optionItemId: option.id,
          optionName: option.name,
          quantity: 1,
          unitPrice: option.price
        }
      };
    });
  };

  const addCustomizedProduct = () => {
    if (!customizingProduct) return;

    const options = Object.values(selectedOptions);
    const hasIngredients = customizingProduct.optionGroups.some((group) => group.name.toLowerCase() === "ingredientes" && group.items.length > 0);
    const notes = hasIngredients
      ? customizationNotes.trim()
        ? `Lanche completo. Obs: ${customizationNotes.trim()}`
        : "Lanche completo"
      : customizationNotes.trim();
    addProduct(customizingProduct, options, notes);
    toast.success(`${customizingProduct.name} adicionado ao carrinho.`);
    setCustomizingProduct(null);
    setSelectedOptions({});
    setCustomizationNotes("");
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
            <ProductCard key={product.id} product={product} stockQuantity={getProductStock(product.id)} onAdd={handleAddProduct} />
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
                  <ProductCard key={product.id} product={product} stockQuantity={getProductStock(product.id)} onAdd={handleAddProduct} />
                ))}
              </div>
            </section>
          ))}
        </div>
        {!loading && publicProducts.length === 0 ? <p className="muted-text">Nenhum produto ativo no cardapio.</p> : null}
      </section>
      {customizingProduct ? (
        <div className="modal-backdrop" role="presentation">
          <article className="modal-card product-customizer-modal" role="dialog" aria-modal="true" aria-label="Personalizar produto">
            <div className="modal-header">
              <div>
                <span className="eyebrow">{customizingProduct.name}</span>
                <h2>Como deseja seu pedido?</h2>
              </div>
              <button className="ghost-icon-button" onClick={() => setCustomizingProduct(null)} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="customizer-groups">
              {customizingProduct.optionGroups
                .filter((group) => group.name.toLowerCase() === "ingredientes" && group.items.length > 0)
                .map((group) => (
                  <section className="customizer-group" key={group.id}>
                    <div className="category-section-header">
                      <div>
                        <h3>Lanche completo</h3>
                        <span>Ingredientes padrao inclusos</span>
                      </div>
                    </div>
                    <div className="complete-sandwich-box">
                      <strong>{group.items.map((item) => item.name).join(", ")}</strong>
                      <span>Use as observacoes para pedir retirada ou troca de algum item.</span>
                    </div>
                  </section>
                ))}

              <label className="field">
                <span>Observacoes</span>
                <div>
                  <textarea
                    
                    maxLength={180}
                    onChange={(event) => setCustomizationNotes(event.target.value)}
                    placeholder="Ex: retirar cebola, molho separado..."
                    value={customizationNotes}
                  />
                </div>
                <small className="muted-text">{customizationNotes.length}/180 caracteres</small>
              </label>

              {customizingProduct.optionGroups.filter((group) => group.name.toLowerCase() !== "ingredientes").map((group) => (
                <section className="customizer-group" key={group.id}>
                  <div className="category-section-header">
                    <div>
                      <h3>{group.name}</h3>
                      <span>
                        Min: {group.minSelection} | Max: {group.maxSelection}
                      </span>
                    </div>
                  </div>
                  {group.items.map((option) => {
                    const selected = Boolean(selectedOptions[option.id]);

                    return (
                      <button className={`customizer-option ${selected ? "selected" : ""}`} key={option.id} onClick={() => toggleOption(option)}>
                        <div>
                          <strong>{option.name}</strong>
                          {option.description ? <span>{option.description}</span> : null}
                          {option.price > 0 ? <small>{formatCurrency(option.price)}</small> : <small>Sem custo adicional</small>}
                        </div>
                        {selected ? <Minus size={18} /> : <Plus size={18} />}
                      </button>
                    );
                  })}
                </section>
              ))}
            </div>

            <button className="primary-button" onClick={addCustomizedProduct}>
              Adicionar {formatCurrency((customizingProduct.promotionalPrice ?? customizingProduct.basePrice) + Object.values(selectedOptions).reduce((sum, option) => sum + option.unitPrice, 0))}
            </button>
          </article>
        </div>
      ) : null}
    </section>
  );
}

