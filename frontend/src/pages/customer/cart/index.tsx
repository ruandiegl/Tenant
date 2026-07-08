import "./styles.css";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bike, ChevronLeft, CreditCard, MapPin, Minus, Phone, Plus, ReceiptText, ShoppingBag, Store, Trash2, UserRound, WalletCards } from "lucide-react";
import { toast } from "react-toastify";
import { useCustomerFlow } from "../../../app/providers/customer-flow-provider";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { PageHeader } from "../../../components/ui/page-header";
import { StatusBadge } from "../../../components/ui/status-badge";
import { deliveryZonesService } from "../../../services/delivery-zones";
import { DeliveryZone } from "../../../types/database";
import { formatCurrency } from "../../../utils/format";
import { formatCep, formatPhone, onlyDigits } from "../../../utils/input-masks";
import { DEFAULT_PUBLIC_TENANT_SLUG, getPublicTenantSlug, publicTenantPath } from "../../../utils/public-tenant-route";

type CheckoutStep = "cart" | "address" | "payment" | "done";
type GeoPoint = { lat: number; lng: number };
type ZoneDistanceMap = Record<string, number>;

const geocodeCache = new Map<string, GeoPoint | null>();
const routeDistanceCache = new Map<string, number | null>();

function normalizeZoneText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function deliveryDistanceLabel(zone: DeliveryZone) {
  return (zone.distanceMode ?? "ROUTE") === "STRAIGHT_LINE" ? "em linha reta" : "de trajeto";
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInKm(origin: GeoPoint, destination: GeoPoint) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeCacheKey(origin: GeoPoint, destination: GeoPoint) {
  return [
    origin.lng.toFixed(6),
    origin.lat.toFixed(6),
    destination.lng.toFixed(6),
    destination.lat.toFixed(6)
  ].join(",");
}

async function routeDistanceInKm(origin: GeoPoint, destination: GeoPoint, signal?: AbortSignal) {
  const key = routeCacheKey(origin, destination);
  const cached = routeDistanceCache.get(key);

  if (cached !== undefined) return cached;

  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    alternatives: "false",
    overview: "false",
    steps: "false"
  });
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    routeDistanceCache.set(key, null);
    return null;
  }

  const result = (await response.json()) as { code?: string; routes?: Array<{ distance?: number }> };
  const distanceMeters = result.code === "Ok" ? result.routes?.[0]?.distance : undefined;
  const distanceKm = typeof distanceMeters === "number" ? distanceMeters / 1000 : null;

  routeDistanceCache.set(key, distanceKm);
  return distanceKm;
}

function addressToQuery(address: {
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}) {
  return [address.street, address.number, address.district, address.city, address.state, address.postalCode, "Brasil"]
    .filter(Boolean)
    .join(", ");
}

async function geocodeAddress(query: string, signal?: AbortSignal) {
  const normalized = normalizeZoneText(query);
  const cached = geocodeCache.get(normalized);

  if (cached !== undefined) return cached;

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "br"
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    geocodeCache.set(normalized, null);
    return null;
  }

  const [result] = (await response.json()) as Array<{ lat: string; lon: string }>;
  const point = result ? { lat: Number(result.lat), lng: Number(result.lon) } : null;
  geocodeCache.set(normalized, point);
  return point;
}

function findDeliveryZone(
  zones: DeliveryZone[],
  address: { district: string; postalCode: string },
  subtotal: number,
  zoneDistances: ZoneDistanceMap
) {
  const eligibleZones = zones.filter((zone) => zone.status === "ACTIVE" && subtotal >= zone.minimumOrderValue);
  const district = normalizeZoneText(address.district);
  const neighborhoodZone = eligibleZones.find(
    (zone) => zone.type === "NEIGHBORHOOD" && normalizeZoneText(zone.neighborhood ?? "") === district
  );

  if (neighborhoodZone) return neighborhoodZone;

  const cep = Number(onlyDigits(address.postalCode));
  const postalCodeZone = eligibleZones.find((zone) => {
    if (zone.type !== "POSTAL_CODE") return false;

    const start = Number(onlyDigits(zone.postalCodeStart ?? ""));
    const end = Number(onlyDigits(zone.postalCodeEnd ?? ""));
    return Boolean(cep && start && end && cep >= start && cep <= end);
  });

  if (postalCodeZone) return postalCodeZone;

  const radiusZones = eligibleZones
    .filter((zone) => zone.type === "RADIUS")
    .filter((zone) => {
      const distance = zoneDistances[zone.id];
      return distance !== undefined && zone.radiusKm !== undefined && distance <= zone.radiusKm;
    })
    .sort((a, b) => (a.radiusKm ?? 9999) - (b.radiusKm ?? 9999));

  if (radiusZones[0]) return radiusZones[0];

  return eligibleZones
    .filter((zone) => zone.type === "RADIUS_OVERFLOW")
    .filter((zone) => {
      const distance = zoneDistances[zone.id];
      const mode = zone.distanceMode ?? "ROUTE";
      const largestRadiusKm = eligibleZones
        .filter((radiusZone) => radiusZone.type === "RADIUS" && (radiusZone.distanceMode ?? "ROUTE") === mode)
        .reduce((largest, radiusZone) => Math.max(largest, radiusZone.radiusKm ?? 0), 0);

      return distance !== undefined && distance > largestRadiusKm;
    })
    .sort((a, b) => (zoneDistances[a.id] ?? 9999) - (zoneDistances[b.id] ?? 9999))[0];
}

export function CustomerCart({ step }: { step: CheckoutStep }) {
  const navigate = useNavigate();
  const location = useLocation();
  const tenantSlug = getPublicTenantSlug(location.pathname) ?? DEFAULT_PUBLIC_TENANT_SLUG;
  const tenantPath = (path: string) => publicTenantPath(tenantSlug, path);
  const {
    items,
    address,
    fulfillment,
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
    updateFulfillment,
    updateAddress,
    updatePayment,
    updateProfile,
    placeOrder,
    resetOrder
  } = useCustomerFlow();
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isLookingUpCep, setIsLookingUpCep] = useState(false);
  const [cepLookupError, setCepLookupError] = useState<string | null>(null);
  const lastCepLookupRef = useRef("");
  const [cartItemPendingDelete, setCartItemPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [zoneDistances, setZoneDistances] = useState<ZoneDistanceMap>({});
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const { data: deliveryZones = [] } = useQuery({
    queryKey: ["public-delivery-zones", tenantSlug],
    queryFn: () => deliveryZonesService.listPublic(tenantSlug),
    staleTime: 60_000
  });

  const missingAddress = useMemo(
    () => !address.street || !address.number || !address.district || !address.postalCode,
    [address.district, address.number, address.postalCode, address.street]
  );

  const paymentLabel = payment.type === "PIX" ? "PIX" : payment.type === "CREDIT_CARD" ? "Cartao de credito" : "Dinheiro";
  const selectedZone = useMemo(
    () => findDeliveryZone(deliveryZones, address, subtotal, zoneDistances),
    [address, deliveryZones, subtotal, zoneDistances]
  );
  const pageTitle =
    step === "cart" ? "Revise seu pedido" : step === "address" ? "Endereco de entrega" : step === "payment" ? "Pagamento" : "Pedido confirmado";
  const pageDescription =
    step === "cart"
      ? "Confira os itens antes de continuar."
      : step === "address"
        ? "Informe onde deseja receber o pedido."
        : step === "payment"
          ? "Escolha a forma de pagamento para confirmar."
          : "Seu pedido foi recebido pela loja.";

  useEffect(() => {
    const cep = onlyDigits(address.postalCode);

    if (cep.length < 8) {
      setCepLookupError(null);
      setIsLookingUpCep(false);
      return;
    }

    if (lastCepLookupRef.current === cep) return;

    lastCepLookupRef.current = cep;
    const controller = new AbortController();
    setIsLookingUpCep(true);
    setCepLookupError(null);

    fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("CEP indisponivel");
        return response.json() as Promise<{
          erro?: boolean;
          logradouro?: string;
          bairro?: string;
          localidade?: string;
          uf?: string;
        }>;
      })
      .then((data) => {
        if (data.erro) {
          setCepLookupError("CEP nao encontrado.");
          return;
        }

        updateAddress({
          ...(data.logradouro ? { street: data.logradouro } : {}),
          ...(data.bairro ? { district: data.bairro } : {}),
          ...(data.localidade ? { city: data.localidade } : {}),
          ...(data.uf ? { state: data.uf } : {})
        });
      })
      .catch((lookupError) => {
        if ((lookupError as Error).name !== "AbortError") {
          setCepLookupError("Nao foi possivel buscar o CEP.");
        }
      })
      .finally(() => {
        setIsLookingUpCep(false);
      });

    return () => controller.abort();
  }, [address.postalCode, updateAddress]);

  useEffect(() => {
    const radiusZones = deliveryZones.filter(
      (zone) => (zone.type === "RADIUS" || zone.type === "RADIUS_OVERFLOW") && zone.status === "ACTIVE" && zone.branch?.address
    );
    const hasCustomerAddress = Boolean(address.street && address.number && address.district && address.city && address.state);

    if (fulfillment.type !== "DELIVERY" || radiusZones.length === 0 || !hasCustomerAddress) {
      setZoneDistances({});
      setIsCalculatingDistance(false);
      return;
    }

    const controller = new AbortController();
    setIsCalculatingDistance(true);

    void (async () => {
      try {
        const customerPoint = await geocodeAddress(addressToQuery(address), controller.signal);

        if (!customerPoint) {
          setZoneDistances({});
          return;
        }

        const nextDistances: ZoneDistanceMap = {};

        for (const zone of radiusZones) {
          const branchAddress = zone.branch?.address;
          if (!branchAddress) continue;

          const branchPoint =
            branchAddress.latitude !== undefined &&
            branchAddress.longitude !== undefined &&
            branchAddress.latitude !== null &&
            branchAddress.longitude !== null
              ? { lat: Number(branchAddress.latitude), lng: Number(branchAddress.longitude) }
              : await geocodeAddress(addressToQuery(branchAddress), controller.signal);

          if (branchPoint) {
            const straightLineDistance = distanceInKm(branchPoint, customerPoint);
            const routeDistance =
              (zone.distanceMode ?? "ROUTE") === "STRAIGHT_LINE"
                ? null
                : await routeDistanceInKm(branchPoint, customerPoint, controller.signal);
            const deliveryDistance = routeDistance ?? straightLineDistance;
            nextDistances[zone.id] = Number(deliveryDistance.toFixed(2));
          }
        }

        setZoneDistances(nextDistances);
      } catch (distanceError) {
        if ((distanceError as Error).name !== "AbortError") {
          setZoneDistances({});
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCalculatingDistance(false);
        }
      }
    })();

    return () => controller.abort();
  }, [address, deliveryZones, fulfillment.type]);

  useEffect(() => {
    if (fulfillment.type === "PICKUP") {
      if (fulfillment.deliveryFee !== 0) {
        updateFulfillment({ deliveryFee: 0, zoneId: undefined, zoneName: undefined, estimatedMinutes: undefined });
      }
      return;
    }

    if (selectedZone) {
      if (
        fulfillment.zoneId !== selectedZone.id ||
        fulfillment.deliveryFee !== selectedZone.fee ||
        fulfillment.estimatedMinutes !== selectedZone.estimatedMinutes
      ) {
        updateFulfillment({
          deliveryFee: selectedZone.fee,
          zoneId: selectedZone.id,
          zoneName: selectedZone.name,
          estimatedMinutes: selectedZone.estimatedMinutes
        });
      }
      return;
    }

    if ((address.district || onlyDigits(address.postalCode).length >= 8) && (fulfillment.deliveryFee !== 0 || fulfillment.zoneId)) {
      updateFulfillment({ deliveryFee: 0, zoneId: undefined, zoneName: undefined, estimatedMinutes: undefined });
    }
  }, [address.district, address.postalCode, fulfillment.deliveryFee, fulfillment.estimatedMinutes, fulfillment.type, fulfillment.zoneId, selectedZone, updateFulfillment]);

  const nextStep = () => {
    setError(null);

    if (step === "cart") {
      if (items.length === 0) {
        setError("Adicione pelo menos um item ao carrinho.");
        toast.info("Adicione pelo menos um item ao carrinho.");
        return;
      }

      navigate(tenantPath("/carrinho/endereco"));
      return;
    }

    if (step === "address") {
      if (items.length === 0) {
        toast.info("Escolha pelo menos um item antes de continuar.");
        navigate(tenantPath("/carrinho"));
        return;
      }

      if (fulfillment.type === "DELIVERY" && missingAddress) {
        setError("Preencha rua, numero, bairro e CEP para continuar.");
        toast.warning("Preencha rua, numero, bairro e CEP para continuar.");
        return;
      }

      if (fulfillment.type === "DELIVERY" && isCalculatingDistance) {
        setError("Aguarde o calculo automatico da entrega.");
        toast.info("Calculando a distancia da loja.");
        return;
      }

      if (fulfillment.type === "DELIVERY" && deliveryZones.length > 0 && !selectedZone) {
        setError("Este endereco ainda nao esta dentro de uma area de entrega ativa.");
        toast.warning("Este endereco ainda nao esta dentro de uma area de entrega ativa.");
        return;
      }

      navigate(tenantPath("/carrinho/pagamento"));
      return;
    }
  };

  const handlePaymentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (items.length === 0) {
      toast.info("Escolha pelo menos um item antes de finalizar.");
      navigate(tenantPath("/carrinho"));
      return;
    }

    if (!profile.name || profile.name.trim().length < 2) {
      setError("Informe o nome para contato antes de confirmar.");
      toast.warning("Informe o nome para contato antes de confirmar.");
      navigate(tenantPath("/carrinho/endereco"));
      return;
    }

    if (fulfillment.type === "DELIVERY" && missingAddress) {
      setError("Preencha rua, numero, bairro e CEP para salvar o pedido.");
      toast.warning("Preencha rua, numero, bairro e CEP para salvar o pedido.");
      navigate(tenantPath("/carrinho/endereco"));
      return;
    }

    if (fulfillment.type === "DELIVERY" && isCalculatingDistance) {
      setError("Aguarde o calculo automatico da entrega.");
      toast.info("Calculando a distancia da loja.");
      navigate(tenantPath("/carrinho/endereco"));
      return;
    }

    if (fulfillment.type === "DELIVERY" && deliveryZones.length > 0 && !selectedZone) {
      setError("Este endereco ainda nao esta dentro de uma area de entrega ativa.");
      toast.warning("Este endereco ainda nao esta dentro de uma area de entrega ativa.");
      navigate(tenantPath("/carrinho/endereco"));
      return;
    }

    if (payment.type === "CREDIT_CARD" && (!payment.cardName || !payment.cardNumber || !payment.cardExpiry || !payment.cardCvv)) {
      setError("Preencha os dados do cartao.");
      toast.warning("Preencha os dados do cartao.");
      return;
    }

    setIsSubmittingOrder(true);

    try {
      const created = await placeOrder();
      toast.success(`Pedido #${created.publicCode} confirmado.`);
      navigate(tenantPath("/carrinho/confirmacao"));
    } catch (orderError) {
      console.error(orderError);
      setError("Nao conseguimos confirmar seu pedido agora. Tente novamente em instantes.");
      toast.error("Nao conseguimos confirmar seu pedido agora.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleNewOrder = () => {
    resetOrder();
    navigate(tenantPath("/carrinho"));
    setError(null);
    toast.info("Carrinho liberado para um novo pedido.");
  };

  const confirmRemoveCartItem = () => {
    if (!cartItemPendingDelete) return;

    removeItem(cartItemPendingDelete.id);
    setCartItemPendingDelete(null);
  };

  const goBack = () => {
    setError(null);

    if (step === "address") {
      navigate(tenantPath("/carrinho"));
      return;
    }

    if (step === "payment") {
      navigate(tenantPath("/carrinho/endereco"));
      return;
    }

    if (step === "done") {
      navigate(tenantPath("/pedido"));
      return;
    }

    navigate(tenantPath("/menu"));
  };

  return (
    <section className="screen">
      <button className="checkout-back-button" onClick={goBack} type="button" aria-label="Voltar">
        <ChevronLeft size={24} />
      </button>

      <PageHeader
        eyebrow="Carrinho"
        title={pageTitle}
        description={pageDescription}
      />

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
                <Link className="wide-link" to={tenantPath("/menu")}>
                  Ver menu
                </Link>
              </div>
            ) : (
              <>
                <div className="fulfillment-switch" role="group" aria-label="Forma de recebimento">
                  <button
                    className={fulfillment.type === "DELIVERY" ? "selected" : ""}
                    onClick={() => updateFulfillment({ type: "DELIVERY", deliveryFee: selectedZone?.fee ?? (fulfillment.deliveryFee || 8) })}
                    type="button"
                  >
                    <Bike size={18} />
                    <span>Entrega</span>
                    <small>Receber no endereco</small>
                  </button>
                  <button
                    className={fulfillment.type === "PICKUP" ? "selected" : ""}
                    onClick={() => updateFulfillment({ type: "PICKUP", deliveryFee: 0, zoneId: undefined, zoneName: undefined })}
                    type="button"
                  >
                    <Store size={18} />
                    <span>Retirada</span>
                    <small>Buscar na loja</small>
                  </button>
                </div>

                {items.map((item) => (
                  <div className="cart-item-card" key={item.id}>
                    <img src={item.imageUrl} alt={item.productName} />
                    <div>
                      <strong>{item.productName}</strong>
                      <span>{formatCurrency(item.unitPrice)}</span>
                      {item.options.length > 0 ? (
                        <small className="muted-text">{item.options.map((option) => option.optionName).join(", ")}</small>
                      ) : null}
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
                      <button aria-label="Remover item" onClick={() => setCartItemPendingDelete({ id: item.id, name: item.productName })}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </article>

          <OrderTotals subtotal={subtotal} deliveryFee={deliveryFee} discountTotal={discountTotal} total={total} />
        </div>
      ) : null}

      {step === "address" && items.length === 0 ? (
        <article className="panel empty-state">
          <ReceiptText size={26} />
          <strong>Seu carrinho esta vazio</strong>
          <span>Escolha produtos no menu antes de informar a entrega.</span>
          <Link className="wide-link" to={tenantPath("/menu")}>
            Ver menu
          </Link>
        </article>
      ) : null}

      {step === "address" && items.length > 0 ? (
        <div className="checkout-grid">
          <article className="panel">
            <h2>{fulfillment.type === "DELIVERY" ? "Dados para entrega" : "Dados para retirada"}</h2>
            <div className="fulfillment-switch compact" role="group" aria-label="Forma de recebimento">
              <button
                className={fulfillment.type === "DELIVERY" ? "selected" : ""}
                onClick={() => updateFulfillment({ type: "DELIVERY", deliveryFee: selectedZone?.fee ?? 8 })}
                type="button"
              >
                <Bike size={18} />
                Entrega
              </button>
              <button
                className={fulfillment.type === "PICKUP" ? "selected" : ""}
                onClick={() => updateFulfillment({ type: "PICKUP", deliveryFee: 0, zoneId: undefined, zoneName: undefined })}
                type="button"
              >
                <Store size={18} />
                Retirada
              </button>
            </div>
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
                  <Phone size={18} />
                  <input
                    autoComplete="tel"
                    inputMode="tel"
                    value={profile.phone}
                    onChange={(event) => updateProfile({ phone: formatPhone(event.target.value) })}
                    placeholder="(11) 90000-0000"
                  />
                </div>
              </label>
              {fulfillment.type === "DELIVERY" ? (
                <>
                  <label className="field">
                    <span>CEP</span>
                    <div>
                      <MapPin size={18} />
                      <input
                        autoComplete="postal-code"
                        inputMode="numeric"
                        value={address.postalCode}
                        onChange={(event) => updateAddress({ postalCode: formatCep(event.target.value) })}
                        placeholder="00000-000"
                      />
                    </div>
                    {isLookingUpCep ? <small className="field-hint">Buscando endereco...</small> : null}
                    {cepLookupError ? <small className="field-hint field-hint-error">{cepLookupError}</small> : null}
                    {isCalculatingDistance ? <small className="field-hint">Calculando distancia da loja...</small> : null}
                    {selectedZone ? (
                      <small className="field-hint">
                        Area {selectedZone.name}: {formatCurrency(selectedZone.fee)}
                        {(selectedZone.type === "RADIUS" || selectedZone.type === "RADIUS_OVERFLOW") && zoneDistances[selectedZone.id] !== undefined
                          ? ` - ${zoneDistances[selectedZone.id].toFixed(2).replace(".", ",")} km ${deliveryDistanceLabel(selectedZone)}`
                          : ""}
                      </small>
                    ) : null}
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
                </>
              ) : (
                <div className="pickup-summary">
                  <ShoppingBag size={20} />
                  <div>
                    <strong>Retirada na loja selecionada</strong>
                    <span>Voce nao precisa cadastrar endereco. Avisaremos quando o pedido estiver pronto.</span>
                  </div>
                </div>
              )}
            </div>
          </article>

          <OrderTotals subtotal={subtotal} deliveryFee={deliveryFee} discountTotal={discountTotal} total={total} />
        </div>
      ) : null}

      {step === "payment" && items.length === 0 ? (
        <article className="panel empty-state">
          <ReceiptText size={26} />
          <strong>Seu carrinho esta vazio</strong>
          <span>Escolha produtos no menu antes de finalizar o pedido.</span>
          <Link className="wide-link" to={tenantPath("/menu")}>
            Ver menu
          </Link>
        </article>
      ) : null}

      {step === "payment" && items.length > 0 ? (
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

      {step === "done" && !order ? (
        <article className="panel empty-state">
          <ReceiptText size={26} />
          <strong>Nenhum pedido confirmado ainda</strong>
          <span>Finalize um pedido para ver a confirmacao por aqui.</span>
          <Link className="wide-link" to={tenantPath("/menu")}>
            Ver menu
          </Link>
        </article>
      ) : null}

      {step === "done" && order ? (
        <div className="checkout-grid">
          <article className="panel success-panel">
            <StatusBadge status={order.status} />
            <h2>Pedido #{order.publicCode}</h2>
            <p className="muted-text">Pagamento por {paymentLabel}. A loja recebeu seu pedido e vai atualizar o andamento.</p>
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
            <Link className="wide-link" to={tenantPath("/pedido")}>
              Acompanhar pedido
            </Link>
          </article>

          <article className="panel">
            <h2>{fulfillment.type === "DELIVERY" ? "Entrega" : "Retirada"}</h2>
            <p className="muted-text">
              {fulfillment.type === "DELIVERY" ? `${address.street}, ${address.number} - ${address.district}` : "Pedido marcado para retirada na loja."}
            </p>
            <Link className="wide-link" to={tenantPath("/perfil")}>
              Salvar dados no perfil
            </Link>
          </article>
        </div>
      ) : null}

      {step !== "done" ? (
        <div className="checkout-actions">
          {step !== "payment" ? <button onClick={nextStep}>Continuar</button> : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(cartItemPendingDelete)}
        title="Remover item"
        description={`Remover ${cartItemPendingDelete?.name ?? "este item"} do carrinho?`}
        confirmLabel="Remover item"
        onCancel={() => setCartItemPendingDelete(null)}
        onConfirm={confirmRemoveCartItem}
      />
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

