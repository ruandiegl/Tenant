import { Plus } from "lucide-react";
import { Product } from "../../types/database";
import { formatCurrency } from "../../utils/format";
import { StatusBadge } from "../ui/status-badge";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const price = product.promotionalPrice ?? product.basePrice;
  const disabled = product.status !== "ACTIVE";

  return (
    <article className="product-card">
      <img src={product.imageUrl} alt={product.name} />
      <div className="product-copy">
        <div>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
        </div>
        <div className="product-footer">
          <div>
            <strong>{formatCurrency(price)}</strong>
            {product.promotionalPrice ? <small>{formatCurrency(product.basePrice)}</small> : null}
          </div>
          {disabled ? (
            <StatusBadge status={product.status} />
          ) : (
            <button className="icon-button" aria-label={`Adicionar ${product.name}`}>
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
