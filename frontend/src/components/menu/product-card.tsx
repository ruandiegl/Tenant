import { Plus } from "lucide-react";
import { Product } from "../../types/database";
import { formatCurrency } from "../../utils/format";
import { StatusBadge } from "../ui/status-badge";

type ProductCardProps = {
  product: Product;
  onAdd?: (product: Product) => void;
  stockQuantity?: number;
};

export function ProductCard({ product, onAdd, stockQuantity }: ProductCardProps) {
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
          {disabled ? (
            <StatusBadge status={hasNoStock ? "OUT_OF_STOCK" : product.status} />
          ) : (
            <button className="icon-button" aria-label={`Adicionar ${product.name}`} onClick={() => onAdd?.(product)}>
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
