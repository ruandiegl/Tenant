import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";
import { useCatalog } from "./catalog-provider";
import { ordersService } from "../../services/orders";
import { Product } from "../../types/database";

export type CustomerCartItem = {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
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
  payment: CustomerPaymentDraft;
  profile: CustomerProfileDraft;
  order: PlacedCustomerOrder | null;
  subtotal: number;
  deliveryFee: number;
  discountTotal: number;
  total: number;
  addProduct: (product: Product) => void;
  incrementItem: (itemId: string) => void;
  decrementItem: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  updateItemNotes: (itemId: string, notes: string) => void;
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

const emptyProfile: CustomerProfileDraft = {
  name: "",
  email: "",
  phone: "",
  wantsAccount: false
};

const CustomerFlowContext = createContext<CustomerFlowContextValue | null>(null);

function createCartItem(product: Product): CustomerCartItem {
  return {
    id: `cart_${product.id}_${Date.now()}`,
    productId: product.id,
    productName: product.name,
    imageUrl: product.imageUrl,
    quantity: 1,
    unitPrice: product.promotionalPrice ?? product.basePrice,
    notes: ""
  };
}

export function CustomerFlowProvider({ children }: PropsWithChildren) {
  const { decrementStock } = useCatalog();
  const [items, setItems] = useState<CustomerCartItem[]>([]);
  const [address, setAddress] = useState<CustomerAddressDraft>(emptyAddress);
  const [payment, setPayment] = useState<CustomerPaymentDraft>(emptyPayment);
  const [profile, setProfile] = useState<CustomerProfileDraft>(emptyProfile);
  const [order, setOrder] = useState<PlacedCustomerOrder | null>(null);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const deliveryFee = subtotal > 0 ? 8 : 0;
    const discountTotal = subtotal >= 45 ? 7 : 0;

    return {
      subtotal,
      deliveryFee,
      discountTotal,
      total: Math.max(0, subtotal + deliveryFee - discountTotal)
    };
  }, [items]);

  const value = useMemo<CustomerFlowContextValue>(
    () => ({
      items,
      address,
      payment,
      profile,
      order,
      ...totals,
      addProduct: (product) => {
        setOrder(null);
        setItems((current) => {
          const existing = current.find((item) => item.productId === product.id && item.notes === "");

          if (existing) {
            return current.map((item) => (item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item));
          }

          return [...current, createCartItem(product)];
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
        const createdOrder = await ordersService.createPublicOrder({
          type: "DELIVERY",
          customerName: profile.name,
          customerPhone: profile.phone || undefined,
          customerEmail: profile.email || undefined,
          deliveryFee: totals.deliveryFee,
          notes: `Pagamento selecionado: ${payment.type}`,
          deliveryAddress: {
            street: address.street,
            number: address.number,
            complement: address.complement || undefined,
            district: address.district,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            reference: address.reference || undefined
          },
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes || undefined,
            options: []
          }))
        });

        const nextOrder: PlacedCustomerOrder = {
          publicCode: createdOrder.publicCode,
          status: createdOrder.status === "ACCEPTED" || createdOrder.status === "PREPARING" ? createdOrder.status : "PLACED",
          total: createdOrder.total,
          paymentType: payment.type,
          estimatedReadyAt: createdOrder.estimatedReadyAt
        };

        items.forEach((item) => decrementStock(item.productId, item.quantity));
        setOrder(nextOrder);
        setItems([]);

        return nextOrder;
      },
      resetOrder: () => {
        setOrder(null);
      }
    }),
    [address, decrementStock, items, order, payment, profile, totals]
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
