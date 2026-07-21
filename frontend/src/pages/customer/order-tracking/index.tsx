import "./styles.css";
import { useQuery } from "@tanstack/react-query";
import { BellRing, Bike, ReceiptText, RefreshCcw, ShoppingBag } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useCustomerFlow } from "../../../app/providers/customer-flow-provider";
import { useSocket } from "../../../app/providers/socket-provider";
import { PageHeader } from "../../../components/ui/page-header";
import { StatusBadge } from "../../../components/ui/status-badge";
import { ordersService } from "../../../services/orders";
import { OrderStatus } from "../../../types/database";
import { formatCurrency } from "../../../utils/format";
import { DEFAULT_PUBLIC_TENANT_SLUG, publicTenantPath } from "../../../utils/public-tenant-route";

const trackingSteps: Array<{ status: OrderStatus; label: string; description: string }> = [
  { status: "PLACED", label: "Recebido", description: "Seu pedido chegou para a loja." },
  { status: "ACCEPTED", label: "Aceito", description: "A loja confirmou o pedido." },
  { status: "PREPARING", label: "Preparando", description: "A cozinha esta preparando tudo." },
  { status: "READY", label: "Pronto", description: "Pedido pronto para retirada ou despacho." },
  { status: "DISPATCHED", label: "Saiu", description: "Pedido saiu para entrega." },
  { status: "COMPLETED", label: "Concluido", description: "Pedido finalizado." }
];

function normalizeStatus(status: OrderStatus) {
  if (status === "DELIVERED") return "COMPLETED";
  return status;
}

export function OrderTracking({ publicCodeFallback = "" }: { publicCodeFallback?: string }) {
  const { tenantSlug = DEFAULT_PUBLIC_TENANT_SLUG, publicCode: publicCodeParam = "" } = useParams();
  const publicCode = publicCodeParam || publicCodeFallback;
  const socket = useSocket();
  const { recentOrders } = useCustomerFlow();
  const recentOrdersToShow = recentOrders.filter((recentOrder) => recentOrder.publicCode !== publicCode).slice(0, 6);
  const {
    data: order,
    isLoading,
    isError,
    refetch,
    isFetching
  } = useQuery({
    enabled: Boolean(publicCode),
    queryKey: ["order", tenantSlug, publicCode],
    queryFn: () => ordersService.getByPublicCode(publicCode, tenantSlug),
    refetchInterval: 12_000
  });

  const activeIndex = order ? trackingSteps.findIndex((step) => step.status === normalizeStatus(order.status)) : -1;
  const address = order?.deliveryAddress;

  const handleCopyPix = async () => {
    const payload = order?.payment?.pixCopyPaste;

    if (!payload) {
      toast.warning("Nenhum codigo Pix disponivel para este pedido.");
      return;
    }

    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Codigo Pix copiado.");
    } catch {
      toast.error("Nao foi possivel copiar o codigo Pix.");
    }
  };

  return (
    <section className="screen customer-screen">
      <PageHeader
        eyebrow="Acompanhamento"
        title={order ? `Pedido #${order.publicCode}` : "Acompanhe seu pedido"}
        description="Veja o andamento do preparo e entrega em tempo quase real."
        actions={
          <button className="pill-button" disabled={!publicCode} onClick={() => void refetch()}>
            <RefreshCcw size={16} /> {isFetching ? "Atualizando" : "Atualizar"}
          </button>
        }
      />

      {isLoading ? <p className="muted-text">Carregando pedido...</p> : null}
      {isError ? <p className="form-error">Nao encontramos esse pedido. Confira o codigo recebido na confirmacao.</p> : null}

      {!publicCode ? (
        <article className="panel empty-state">
          <ReceiptText size={28} />
          <strong>Nenhum pedido em andamento</strong>
          <span>Quando voce finalizar um pedido, o acompanhamento aparece aqui automaticamente.</span>
          <Link className="wide-link" to={publicTenantPath(tenantSlug, "/menu")}>
            <ShoppingBag size={18} /> Ver menu
          </Link>
        </article>
      ) : null}

      {recentOrdersToShow.length > 0 ? (
        <article className="panel recent-orders-panel">
          <h2>Pedidos recentes</h2>
          <div className="recent-orders-list">
            {recentOrdersToShow.map((recentOrder) => (
              <Link
                className="recent-order-card"
                key={recentOrder.publicCode}
                to={publicTenantPath(tenantSlug, `/pedido/${recentOrder.publicCode}`)}
              >
                <div>
                  <strong>Pedido #{recentOrder.publicCode}</strong>
                  <small>{formatCurrency(recentOrder.total)}</small>
                </div>
                <StatusBadge status={recentOrder.status} />
              </Link>
            ))}
          </div>
        </article>
      ) : null}

      {order ? (
        <>
          <article className="panel tracking-summary">
            <div>
              <StatusBadge status={order.status} />
              <h2>{trackingSteps[Math.max(activeIndex, 0)]?.label ?? "Pedido em andamento"}</h2>
              <p className="muted-text">{trackingSteps[Math.max(activeIndex, 0)]?.description}</p>
            </div>
          </article>

          <article className="panel payment-summary-panel">
            <h2>Pagamento</h2>
            <StatusBadge status={order.paymentStatus} />
            <p className="muted-text">
              {order.paymentStatus === "PAID"
                ? "Pagamento confirmado."
                : order.payment?.paymentType === "PIX"
                  ? "Finalize o Pix para concluir a confirmacao financeira."
                  : "Pagamento sera confirmado pela loja."}
            </p>
            {order.payment?.expiresAt ? <small>Expira em {new Date(order.payment.expiresAt).toLocaleString("pt-BR")}</small> : null}
            {order.payment?.pixQrCode ? (
              <img
                alt="QR Code Pix"
                className="tracking-pix-qr"
                src={`data:image/png;base64,${order.payment.pixQrCode}`}
              />
            ) : null}
            {order.payment?.pixCopyPaste ? (
              <>
                <code className="tracking-pix-copy">{order.payment.pixCopyPaste}</code>
                <button className="secondary-button" onClick={() => void handleCopyPix()} type="button">
                  Copiar codigo Pix
                </button>
              </>
            ) : null}
          </article>

          <article className="panel">
            <h2>Status do pedido</h2>
            <div className="tracking-steps">
              {trackingSteps.map((step, index) => (
                <div className={index <= activeIndex ? "active" : ""} key={step.status}>
                  <span />
                  <div>
                    <strong>{step.label}</strong>
                    <small>{step.description}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <div className="checkout-grid">
            <article className="panel">
              <h2>Itens</h2>
              <div className="order-detail-items">
                {order.items.map((item) => (
                  <article className="order-detail-item" key={item.id}>
                    <div>
                      <strong>
                        {item.quantity}x {item.productNameSnapshot}
                      </strong>
                      <span>{formatCurrency(item.totalPrice)}</span>
                    </div>
                    {item.options.length > 0 ? (
                      <ul>
                        {item.options.map((option) => (
                          <li key={option.id}>
                            {option.quantity}x {option.optionNameSnapshot} - {formatCurrency(option.totalPrice)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted-text">Sem complementos selecionados.</p>
                    )}
                    {item.notes ? <p className="muted-text">Observacao: {item.notes}</p> : null}
                  </article>
                ))}
              </div>
            </article>

            <article className="panel">
              <h2>{order.type === "PICKUP" ? "Retirada" : "Entrega"}</h2>
              {address ? (
                <p className="muted-text">
                  <Bike size={16} /> {address.street}, {address.number} - {address.district}
                </p>
              ) : order.type === "PICKUP" ? (
                <p className="muted-text">Pedido marcado para retirada na loja.</p>
              ) : (
                <p className="muted-text">Pedido sem endereco de entrega.</p>
              )}
              <div className="connection">
                <BellRing size={16} /> {socket.connected ? "Atualizacoes conectadas" : "Atualizacao por consulta automatica"}
              </div>
            </article>

            <article className="panel total-panel">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(order.subtotal)}</strong>
              </div>
              <div>
                <span>{order.type === "PICKUP" ? "Retirada" : "Entrega"}</span>
                <strong>{formatCurrency(order.deliveryFee)}</strong>
              </div>
              <div>
                <span>Desconto</span>
                <strong>-{formatCurrency(order.discountTotal)}</strong>
              </div>
              <div className="grand-total">
                <span>Total</span>
                <strong>{formatCurrency(order.total)}</strong>
              </div>
            </article>
          </div>

          <Link className="wide-link" to={publicTenantPath(tenantSlug, "/menu")}>
            <ReceiptText size={18} /> Voltar ao menu
          </Link>
        </>
      ) : null}
    </section>
  );
}

