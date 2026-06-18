import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bike, CreditCard, MapPin } from "lucide-react";
import { PageHeader } from "../../components/ui/page-header";
import { mockApi } from "../../services/mock-api";
import { formatCurrency } from "../../utils/format";

export function CustomerCart() {
  const { data: cart } = useQuery({ queryKey: ["cart"], queryFn: mockApi.getCart });

  const subtotal =
    cart?.items.reduce(
      (sum, item) =>
        sum + item.quantity * item.unitPrice + item.options.reduce((optionSum, option) => optionSum + option.unitPrice, 0),
      0
    ) ?? 0;
  const deliveryFee = 8;
  const discount = 7;
  const total = subtotal + deliveryFee - discount;

  return (
    <section className="screen">
      <PageHeader eyebrow="Checkout" title="Revise o carrinho" description="Dados mockados com formato de Cart e CartItem do PRD." />

      <div className="checkout-grid">
        <article className="panel">
          <h2>Itens</h2>
          {cart?.items.map((item) => (
            <div className="cart-row" key={item.id}>
              <div>
                <strong>
                  {item.quantity}x {item.productName}
                </strong>
                <span>{item.options.map((option) => option.optionName).join(", ") || "Sem adicionais"}</span>
              </div>
              <strong>{formatCurrency(item.unitPrice)}</strong>
            </div>
          ))}
        </article>

        <article className="panel">
          <h2>Entrega e pagamento</h2>
          <div className="option-row selected">
            <Bike size={18} />
            <span>Entrega - 35 min</span>
          </div>
          <div className="option-row">
            <MapPin size={18} />
            <span>Rua Harmonia, 140</span>
          </div>
          <div className="option-row">
            <CreditCard size={18} />
            <span>PIX na finalizacao</span>
          </div>
        </article>

        <article className="panel total-panel">
          <div>
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <div>
            <span>Entrega</span>
            <strong>{formatCurrency(deliveryFee)}</strong>
          </div>
          <div>
            <span>Cupom BEMVINDO</span>
            <strong>-{formatCurrency(discount)}</strong>
          </div>
          <div className="grand-total">
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <Link className="primary-button" to="/cliente/pedido/CB1008">
            Finalizar pedido
          </Link>
        </article>
      </div>
    </section>
  );
}
