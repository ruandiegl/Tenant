import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bike, CreditCard, Minus, Plus, ReceiptText, Trash2, UserRound, WalletCards } from "lucide-react";
import { useCustomerFlow } from "../../app/providers/customer-flow-provider";
import { PageHeader } from "../../components/ui/page-header";
import { StatusBadge } from "../../components/ui/status-badge";
import { formatCurrency, formatTime } from "../../utils/format";

type CheckoutStep = "cart" | "address" | "payment" | "done";

export function CustomerCart() {
  const {
    items,
    address,
    payment,
    profile,
    order,
    subtotal,
    deliveryFee,
    discountTotal,
    total,
    incrementItem,
    decrementItem,
    removeItem,
    updateItemNotes,
    updateAddress,
    updatePayment,
    updateProfile,
    placeOrder,
    resetOrder
  } = useCustomerFlow();
  const [step, setStep] = useState<CheckoutStep>(order ? "done" : "cart");
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const missingAddress = useMemo(
    () => !address.street || !address.number || !address.district || !address.postalCode,
    [address.district, address.number, address.postalCode, address.street]
  );

  const paymentLabel = payment.type === "PIX" ? "PIX" : payment.type === "CREDIT_CARD" ? "Cartao de credito" : "Dinheiro";

  const nextStep = () => {
    setError(null);

    if (step === "cart") {
      if (items.length === 0) {
        setError("Adicione pelo menos um item ao carrinho.");
        return;
      }

      setStep("address");
      return;
    }

    if (step === "address") {
      if (missingAddress) {
        setError("Preencha rua, numero, bairro e CEP para continuar.");
        return;
      }

      setStep("payment");
      return;
    }
  };

  const handlePaymentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!profile.name || profile.name.trim().length < 2) {
      setError("Informe o nome para contato antes de confirmar.");
      setStep("address");
      return;
    }

    if (missingAddress) {
      setError("Preencha rua, numero, bairro e CEP para salvar o pedido.");
      setStep("address");
      return;
    }

    if (payment.type === "CREDIT_CARD" && (!payment.cardName || !payment.cardNumber || !payment.cardExpiry || !payment.cardCvv)) {
      setError("Preencha os dados do cartao.");
      return;
    }

    setIsSubmittingOrder(true);

    try {
      await placeOrder();
      setStep("done");
    } catch (orderError) {
      console.error(orderError);
      setError("Nao foi possivel salvar o pedido no backend. Confira se a API esta rodando e se os produtos existem no banco.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleNewOrder = () => {
    resetOrder();
    setStep("cart");
    setError(null);
  };

  return (
    <section className="screen">
      <PageHeader
        eyebrow="Carrinho"
        title={step === "done" ? "Pedido confirmado" : "Finalize como convidado"}
        description="Fluxo publico: adicionar itens, cadastrar endereco e pagar sem obrigar criacao de conta."
      />

      <div className="checkout-steps" aria-label="Etapas do checkout">
        {["cart", "address", "payment", "done"].map((item) => (
          <button className={step === item ? "active" : ""} key={item} onClick={() => item !== "done" && setStep(item as CheckoutStep)}>
            {item === "cart" ? "Itens" : item === "address" ? "Endereco" : item === "payment" ? "Pagamento" : "Pedido"}
          </button>
        ))}
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {step === "cart" ? (
        <div className="checkout-grid">
          <article className="panel">
            <h2>Itens do pedido</h2>
            {items.length === 0 ? (
              <div className="empty-state">
                <ReceiptText size={26} />
                <strong>Seu carrinho esta vazio</strong>
                <span>Escolha produtos no menu para continuar.</span>
                <Link className="wide-link" to="/cliente/menu">
                  Ver menu
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div className="cart-item-card" key={item.id}>
                  <img src={item.imageUrl} alt={item.productName} />
                  <div>
                    <strong>{item.productName}</strong>
                    <span>{formatCurrency(item.unitPrice)}</span>
                    <textarea
                      aria-label={`Observacoes para ${item.productName}`}
                      onChange={(event) => updateItemNotes(item.id, event.target.value)}
                      placeholder="Observacoes do item"
                      value={item.notes}
                    />
                  </div>
                  <div className="quantity-control">
                    <button aria-label="Diminuir item" onClick={() => decrementItem(item.id)}>
                      <Minus size={16} />
                    </button>
                    <strong>{item.quantity}</strong>
                    <button aria-label="Aumentar item" onClick={() => incrementItem(item.id)}>
                      <Plus size={16} />
                    </button>
                    <button aria-label="Remover item" onClick={() => removeItem(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </article>

          <OrderTotals subtotal={subtotal} deliveryFee={deliveryFee} discountTotal={discountTotal} total={total} />
        </div>
      ) : null}

      {step === "address" ? (
        <div className="checkout-grid">
          <article className="panel">
            <h2>Dados para entrega</h2>
            <div className="form-grid two-columns">
              <label className="field">
                <span>Nome para contato</span>
                <div>
                  <UserRound size={18} />
                  <input value={profile.name} onChange={(event) => updateProfile({ name: event.target.value })} placeholder="Seu nome" />
                </div>
              </label>
              <label className="field">
                <span>WhatsApp</span>
                <div>
                  <UserRound size={18} />
                  <input value={profile.phone} onChange={(event) => updateProfile({ phone: event.target.value })} placeholder="(11) 90000-0000" />
                </div>
              </label>
              <label className="field">
                <span>Rua</span>
                <div>
                  <Bike size={18} />
                  <input value={address.street} onChange={(event) => updateAddress({ street: event.target.value })} placeholder="Rua" />
                </div>
              </label>
              <label className="field">
                <span>Numero</span>
                <div>
                  <Bike size={18} />
                  <input value={address.number} onChange={(event) => updateAddress({ number: event.target.value })} placeholder="123" />
                </div>
              </label>
              <label className="field">
                <span>Complemento</span>
                <div>
                  <Bike size={18} />
                  <input
                    value={address.complement}
                    onChange={(event) => updateAddress({ complement: event.target.value })}
                    placeholder="Apto, bloco"
                  />
                </div>
              </label>
              <label className="field">
                <span>Bairro</span>
                <div>
                  <Bike size={18} />
                  <input value={address.district} onChange={(event) => updateAddress({ district: event.target.value })} placeholder="Bairro" />
                </div>
              </label>
              <label className="field">
                <span>CEP</span>
                <div>
                  <Bike size={18} />
                  <input value={address.postalCode} onChange={(event) => updateAddress({ postalCode: event.target.value })} placeholder="00000-000" />
                </div>
              </label>
              <label className="field">
                <span>Referencia</span>
                <div>
                  <Bike size={18} />
                  <input
                    value={address.reference}
                    onChange={(event) => updateAddress({ reference: event.target.value })}
                    placeholder="Ponto de referencia"
                  />
                </div>
              </label>
            </div>
          </article>

          <OrderTotals subtotal={subtotal} deliveryFee={deliveryFee} discountTotal={discountTotal} total={total} />
        </div>
      ) : null}

      {step === "payment" ? (
        <form className="checkout-grid" onSubmit={handlePaymentSubmit}>
          <article className="panel">
            <h2>Pagamento</h2>
            <div className="payment-options">
              <button className={payment.type === "PIX" ? "selected" : ""} type="button" onClick={() => updatePayment({ type: "PIX" })}>
                <WalletCards size={18} /> PIX
              </button>
              <button
                className={payment.type === "CREDIT_CARD" ? "selected" : ""}
                type="button"
                onClick={() => updatePayment({ type: "CREDIT_CARD" })}
              >
                <CreditCard size={18} /> Cartao
              </button>
              <button className={payment.type === "CASH" ? "selected" : ""} type="button" onClick={() => updatePayment({ type: "CASH" })}>
                <ReceiptText size={18} /> Dinheiro
              </button>
            </div>

            {payment.type === "CREDIT_CARD" ? (
              <div className="form-grid two-columns">
                <label className="field">
                  <span>Nome no cartao</span>
                  <div>
                    <CreditCard size={18} />
                    <input value={payment.cardName} onChange={(event) => updatePayment({ cardName: event.target.value })} />
                  </div>
                </label>
                <label className="field">
                  <span>Numero</span>
                  <div>
                    <CreditCard size={18} />
                    <input value={payment.cardNumber} onChange={(event) => updatePayment({ cardNumber: event.target.value })} />
                  </div>
                </label>
                <label className="field">
                  <span>Validade</span>
                  <div>
                    <CreditCard size={18} />
                    <input value={payment.cardExpiry} onChange={(event) => updatePayment({ cardExpiry: event.target.value })} placeholder="MM/AA" />
                  </div>
                </label>
                <label className="field">
                  <span>CVV</span>
                  <div>
                    <CreditCard size={18} />
                    <input value={payment.cardCvv} onChange={(event) => updatePayment({ cardCvv: event.target.value })} />
                  </div>
                </label>
              </div>
            ) : null}

            {payment.type === "CASH" ? (
              <label className="field">
                <span>Troco para</span>
                <div>
                  <ReceiptText size={18} />
                  <input value={payment.changeFor} onChange={(event) => updatePayment({ changeFor: event.target.value })} placeholder="Opcional" />
                </div>
              </label>
            ) : null}
          </article>

          <OrderTotals
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            discountTotal={discountTotal}
            total={total}
            submitLabel={isSubmittingOrder ? "Salvando pedido..." : "Confirmar pedido"}
            disabled={isSubmittingOrder}
          />
        </form>
      ) : null}

      {step === "done" && order ? (
        <div className="checkout-grid">
          <article className="panel success-panel">
            <StatusBadge status={order.status} />
            <h2>Pedido #{order.publicCode}</h2>
            <p className="muted-text">
              Pagamento por {paymentLabel}. Previsao de preparo: {formatTime(order.estimatedReadyAt)}.
            </p>
            <div className="timeline">
              {["PLACED", "ACCEPTED", "PREPARING"].map((status) => (
                <div className="active" key={status}>
                  <span />
                  <StatusBadge status={status} />
                </div>
              ))}
            </div>
            <button className="primary-button" onClick={handleNewOrder}>
              Fazer outro pedido
            </button>
          </article>

          <article className="panel">
            <h2>Entrega</h2>
            <p className="muted-text">
              {address.street}, {address.number} - {address.district}
            </p>
            <Link className="wide-link" to="/cliente/perfil">
              Salvar dados no perfil
            </Link>
          </article>
        </div>
      ) : null}

      {step !== "done" && items.length > 0 ? (
        <div className="checkout-actions">
          {step !== "cart" ? <button onClick={() => setStep(step === "payment" ? "address" : "cart")}>Voltar</button> : null}
          {step !== "payment" ? <button onClick={nextStep}>Continuar</button> : null}
        </div>
      ) : null}
    </section>
  );
}

function OrderTotals({
  subtotal,
  deliveryFee,
  discountTotal,
  total,
  submitLabel,
  disabled = false
}: {
  subtotal: number;
  deliveryFee: number;
  discountTotal: number;
  total: number;
  submitLabel?: string;
  disabled?: boolean;
}) {
  return (
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
        <span>Desconto automatico</span>
        <strong>-{formatCurrency(discountTotal)}</strong>
      </div>
      <div className="grand-total">
        <span>Total</span>
        <strong>{formatCurrency(total)}</strong>
      </div>
      {submitLabel ? (
        <button className="primary-button" disabled={disabled} type="submit">
          {submitLabel}
        </button>
      ) : null}
    </article>
  );
}
