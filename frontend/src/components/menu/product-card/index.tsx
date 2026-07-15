import "./styles.css";
import { Plus } from "lucide-react";
import { Product } from "../../../types/database";
import { formatCurrency } from "../../../utils/format";
import { StatusBadge } from "../../ui/status-badge";

type ProductCardProps = {
  product: Product;
  stockQuantity?: number;
  onAdd?: (product: Product) => void;
};

export function ProductCard({ product, stockQuantity, onAdd }: ProductCardProps) {
  const price = product.promotionalPrice ?? product.basePrice;
  const hasNoStock = stockQuantity !== undefined && stockQuantity <= 0;
  const disabled = product.status !== "ACTIVE" || hasNoStock;

  return (
    <article className="product-card">
      <img src={product.imageUrl} alt={product.name} />
      <div className="product-copy">
        <div>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          {stockQuantity !== undefined ? <span className="stock-hint">Estoque {stockQuantity}</span> : null}
        </div>
        <div className="product-footer">
          <div>
            <strong>{formatCurrency(price)}</strong>
            {product.promotionalPrice ? <small>{formatCurrency(product.basePrice)}</small> : null}
          </div>
          {onAdd && !disabled ? (
            <button
              aria-label={`Adicionar ${product.name} ao carrinho`}
              className="product-add-button"
              onClick={() => onAdd(product)}
              title="Adicionar ao carrinho"
              type="button"
            >
              <Plus size={20} aria-hidden="true" />
            </button>
          ) : (
            <StatusBadge status={hasNoStock ? "OUT_OF_STOCK" : product.status} />
          )}
        </div>
      </div>
    </article>
  );
}

