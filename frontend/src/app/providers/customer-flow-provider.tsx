import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useCatalog } from "./catalog-provider";
import { ordersService } from "../../services/orders";
import { Product } from "../../types/database";
import { DEFAULT_PUBLIC_TENANT_SLUG, getPublicTenantSlug } from "../../utils/public-tenant-route";

export type CustomerSelectedOption = {
  optionItemId: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
};

export type CustomerCartItem = {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  options: CustomerSelectedOption[];
  notes: string;
};

export type CustomerAddressDraft = {
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  reference: string;
};

export type CustomerPaymentDraft = {
  type: "PIX" | "CREDIT_CARD" | "CASH";
  cardName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  changeFor: string;
};

export type CustomerFulfillmentDraft = {
  type: "DELIVERY" | "PICKUP";
  deliveryFee: number;
  zoneId?: string;
  zoneName?: string;
  estimatedMinutes?: number;
};

export type CustomerProfileDraft = {
  name: string;
  email: string;
  phone: string;
  wantsAccount: boolean;
};

export type PlacedCustomerOrder = {
  publicCode: string;
  status: "PLACED" | "ACCEPTED" | "PREPARING";
  total: number;
  paymentType: CustomerPaymentDraft["type"];
  estimatedReadyAt: string;
};

type CustomerFlowContextValue = {
  items: CustomerCartItem[];
  address: CustomerAddressDraft;
  fulfillment: CustomerFulfillmentDraft;
  payment: CustomerPaymentDraft;
  profile: CustomerProfileDraft;
  order: PlacedCustomerOrder | null;
  recentOrders: PlacedCustomerOrder[];
  subtotal: number;
  deliveryFee: number;
  discountTotal: number;
  total: number;
  addProduct: (product: Product, options?: CustomerSelectedOption[], notes?: string) => void;
  incrementItem: (itemId: string) => void;
  decrementItem: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
  updateFulfillment: (fulfillment: Partial<CustomerFulfillmentDraft>) => void;
  updateAddress: (address: Partial<CustomerAddressDraft>) => void;
  updatePayment: (payment: Partial<CustomerPaymentDraft>) => void;
  updateProfile: (profile: Partial<CustomerProfileDraft>) => void;
  placeOrder: () => Promise<PlacedCustomerOrder>;
  resetOrder: () => void;
};

const emptyAddress: CustomerAddressDraft = {
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "Sao Paulo",
  state: "SP",
  postalCode: "",
  reference: ""
};

const emptyPayment: CustomerPaymentDraft = {
  type: "PIX",
  cardName: "",
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",
  changeFor: ""
};

const emptyFulfillment: CustomerFulfillmentDraft = {
  type: "DELIVERY",
  deliveryFee: 8
};

const emptyProfile: CustomerProfileDraft = {
  name: "",
  email: "",
  phone: "",
  wantsAccount: false
};

const CustomerFlowContext = createContext<CustomerFlowContextValue | null>(null);

type StoredCustomerFlow = {
  items?: CustomerCartItem[];
  address?: CustomerAddressDraft;
  fulfillment?: CustomerFulfillmentDraft;
  payment?: CustomerPaymentDraft;
  profile?: CustomerProfileDraft;
  order?: PlacedCustomerOrder | null;
  recentOrders?: PlacedCustomerOrder[];
};

function getStorageKey(tenantSlug: string) {
  return `podepedir.customerFlow.${tenantSlug}.v1`;
}

function readStoredFlow(tenantSlug: string): StoredCustomerFlow {
  try {
    const raw = window.localStorage.getItem(getStorageKey(tenantSlug));
    return raw ? (JSON.parse(raw) as StoredCustomerFlow) : {};
  } catch {
    return {};
  }
}

function writeStoredFlow(tenantSlug: string, flow: StoredCustomerFlow) {
  try {
    window.localStorage.setItem(getStorageKey(tenantSlug), JSON.stringify(flow));
  } catch {
    // Storage can fail in private mode or full devices; the checkout still works in memory.
  }
}

function createCartItem(product: Product, options: CustomerSelectedOption[] = [], notes = ""): CustomerCartItem {
  const optionsTotal = options.reduce((sum, option) => sum + option.unitPrice * option.quantity, 0);

  return {
    id: `cart_${product.id}_${Date.now()}_${options.map((option) => option.optionItemId).join("_")}`,
    productId: product.id,
    productName: product.name,
    imageUrl: product.imageUrl,
    quantity: 1,
    unitPrice: (product.promotionalPrice ?? product.basePrice) + optionsTotal,
    options,
    notes
  };
}

export function CustomerFlowProvider({ children }: PropsWithChildren) {
  const location = useLocation();
  const publicTenantSlug = getPublicTenantSlug(location.pathname) ?? DEFAULT_PUBLIC_TENANT_SLUG;
  const { decrementStock } = useCatalog();
  const initialFlow = useMemo(() => readStoredFlow(publicTenantSlug), []);
  const skipNextPersistRef = useRef(true);
  const [items, setItems] = useState<CustomerCartItem[]>(initialFlow.items ?? []);
  const [address, setAddress] = useState<CustomerAddressDraft>({ ...emptyAddress, ...initialFlow.address });
  const [fulfillment, setFulfillment] = useState<CustomerFulfillmentDraft>({ ...emptyFulfillment, ...initialFlow.fulfillment });
  const [payment, setPayment] = useState<CustomerPaymentDraft>({ ...emptyPayment, ...initialFlow.payment });
  const [profile, setProfile] = useState<CustomerProfileDraft>({ ...emptyProfile, ...initialFlow.profile });
  const [order, setOrder] = useState<PlacedCustomerOrder | null>(initialFlow.order ?? null);
  const [recentOrders, setRecentOrders] = useState<PlacedCustomerOrder[]>(initialFlow.recentOrders ?? []);

  useEffect(() => {
    const storedFlow = readStoredFlow(publicTenantSlug);
    skipNextPersistRef.current = true;
    setItems(storedFlow.items ?? []);
    setAddress({ ...emptyAddress, ...storedFlow.address });
    setFulfillment({ ...emptyFulfillment, ...storedFlow.fulfillment });
    setPayment({ ...emptyPayment, ...storedFlow.payment });
    setProfile({ ...emptyProfile, ...storedFlow.profile });
    setOrder(storedFlow.order ?? null);
    setRecentOrders(storedFlow.recentOrders ?? []);
  }, [publicTenantSlug]);

  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }

    writeStoredFlow(publicTenantSlug, {
      items,
      address,
      fulfillment,
      payment,
      profile,
      order,
      recentOrders
    });
  }, [address, fulfillment, items, order, payment, profile, publicTenantSlug, recentOrders]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const deliveryFee = subtotal > 0 && fulfillment.type === "DELIVERY" ? fulfillment.deliveryFee : 0;
    const discountTotal = subtotal >= 45 ? 7 : 0;

    return {
      subtotal,
      deliveryFee,
      discountTotal,
      total: Math.max(0, subtotal + deliveryFee - discountTotal)
    };
  }, [fulfillment.deliveryFee, fulfillment.type, items]);

  const value = useMemo<CustomerFlowContextValue>(
    () => ({
      items,
      address,
      fulfillment,
      payment,
      profile,
      order,
      recentOrders,
      ...totals,
      addProduct: (product, options = [], notes = "") => {
        setOrder(null);
        setItems((current) => {
          const optionKey = options.map((option) => option.optionItemId).sort().join("|");
          const existing = current.find(
            (item) =>
              item.productId === product.id &&
              item.notes === notes &&
              item.options.map((option) => option.optionItemId).sort().join("|") === optionKey
          );

          if (existing) {
            return current.map((item) => (item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item));
          }

          return [...current, createCartItem(product, options, notes)];
        });
      },
      incrementItem: (itemId) => {
        setItems((current) => current.map((item) => (item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item)));
      },
      decrementItem: (itemId) => {
        setItems((current) =>
          current
            .map((item) => (item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item))
            .filter((item) => item.quantity > 0)
        );
      },
      removeItem: (itemId) => {
        setItems((current) => current.filter((item) => item.id !== itemId));
      },
      updateItemNotes: (itemId, notes) => {
        setItems((current) => current.map((item) => (item.id === itemId ? { ...item, notes } : item)));
      },
      updateFulfillment: (nextFulfillment) => {
        setFulfillment((current) => ({ ...current, ...nextFulfillment }));
      },
      updateAddress: (nextAddress) => {
        setAddress((current) => ({ ...current, ...nextAddress }));
      },
      updatePayment: (nextPayment) => {
        setPayment((current) => ({ ...current, ...nextPayment }));
      },
      updateProfile: (nextProfile) => {
        setProfile((current) => ({ ...current, ...nextProfile }));
      },
      placeOrder: async () => {
        const createdOrder = await ordersService.createPublicOrder(
          {
            type: fulfillment.type,
            customerName: profile.name,
            customerPhone: profile.phone || undefined,
            customerEmail: profile.email || undefined,
            deliveryFee: totals.deliveryFee,
            notes: `Pagamento selecionado: ${payment.type}${fulfillment.type === "PICKUP" ? " | Retirada na loja" : fulfillment.zoneName ? ` | Entrega: ${fulfillment.zoneName}` : ""}`,
            deliveryAddress:
              fulfillment.type === "DELIVERY"
                ? {
                    street: address.street,
                    number: address.number,
                    complement: address.complement || undefined,
                    district: address.district,
                    city: address.city,
                    state: address.state,
                    postalCode: address.postalCode,
                    reference: address.reference || undefined
                  }
                : undefined,
            items: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              notes: item.notes || undefined,
              options: item.options.map((option) => ({
                optionItemId: option.optionItemId,
                quantity: option.quantity
              }))
            }))
          },
          publicTenantSlug
        );

        const nextOrder: PlacedCustomerOrder = {
          publicCode: createdOrder.publicCode,
          status: createdOrder.status === "ACCEPTED" || createdOrder.status === "PREPARING" ? createdOrder.status : "PLACED",
          total: createdOrder.total,
          paymentType: payment.type,
          estimatedReadyAt: createdOrder.estimatedReadyAt
        };

        items.forEach((item) => decrementStock(item.productId, item.quantity));
        setOrder(nextOrder);
        setRecentOrders((current) => [
          nextOrder,
          ...current.filter((storedOrder) => storedOrder.publicCode !== nextOrder.publicCode)
        ].slice(0, 8));
        setItems([]);

        return nextOrder;
      },
      resetOrder: () => {
        setOrder(null);
      }
    }),
    [address, decrementStock, fulfillment, items, order, payment, profile, publicTenantSlug, recentOrders, totals]
  );

  return <CustomerFlowContext.Provider value={value}>{children}</CustomerFlowContext.Provider>;
}

export function useCustomerFlow() {
  const context = useContext(CustomerFlowContext);

  if (!context) {
    throw new Error("useCustomerFlow must be used inside CustomerFlowProvider");
  }

  return context;
}
