import { Order, OrderStatus } from "../types/database";
import { protectedApi, api, getApiBaseUrl } from "./api";

const TENANT_SLUG = import.meta.env.VITE_DEMO_TENANT_SLUG ?? "demo-burger";
const DEMO_BRANCH_ID = import.meta.env.VITE_DEMO_BRANCH_ID;

type BackendOrder = Omit<Order, "history" | "items" | "source"> & {
  source: Order["source"] | "API" | "KIOSK";
  histories?: Order["history"];
  history?: Order["history"];
  items: Order["items"];
  deliveryAddress?: Order["deliveryAddress"];
  payments?: unknown[];
};

type PublicTenantResponse = {
  branches?: Array<{ id: string; name: string; slug: string }>;
};

export type PublicOrderPayload = {
  type: "DELIVERY" | "PICKUP" | "DINE_IN";
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  deliveryFee?: number;
  deliveryAddress?: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    postalCode: string;
    reference?: string;
  };
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string;
    options?: Array<{ optionItemId: string; quantity: number }>;
  }>;
};

function mapOrder(order: BackendOrder): Order {
  return {
    ...order,
    source: order.source === "API" || order.source === "KIOSK" ? "WEB" : order.source,
    subtotal: Number(order.subtotal),
    discountTotal: Number(order.discountTotal),
    deliveryFee: Number(order.deliveryFee),
    serviceFee: Number(order.serviceFee),
    taxTotal: Number(order.taxTotal),
    total: Number(order.total),
    customerPhone: order.customerPhone ?? "",
    estimatedReadyAt: order.estimatedReadyAt ?? order.createdAt ?? new Date().toISOString(),
    items: order.items.map((item) => ({
      ...item,
      productId: item.productId ?? "",
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      options: item.options.map((option) => ({
        ...option,
        optionItemId: option.optionItemId ?? "",
        unitPrice: Number(option.unitPrice),
        totalPrice: Number(option.totalPrice)
      }))
    })),
    history: order.histories ?? order.history ?? []
  };
}

export const ordersService = {
  list: async () => (await protectedApi<BackendOrder[]>("/tenant/orders")).map(mapOrder),
  get: async (orderId: string) => mapOrder(await protectedApi<BackendOrder>(`/tenant/orders/${orderId}`)),
  getByPublicCode: async (publicCode: string) => mapOrder(await api<BackendOrder>(`/public/${TENANT_SLUG}/orders/${publicCode}`)),
  createPublicOrder: async (payload: PublicOrderPayload) => {
    const branchId = DEMO_BRANCH_ID ?? (await getDefaultPublicBranchId());
    const response = await fetch(`${getApiBaseUrl()}/public/${TENANT_SLUG}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        branchId
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Order create error ${response.status}`);
    }

    return mapOrder((await response.json()) as BackendOrder);
  },
  updateStatus: (orderId: string, status: OrderStatus) =>
    protectedApi<BackendOrder>(`/tenant/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }).then(mapOrder)
};

async function getDefaultPublicBranchId() {
  const tenant = await api<PublicTenantResponse>(`/tenants/${TENANT_SLUG}/public`);
  const branchId = tenant.branches?.[0]?.id;

  if (!branchId) {
    throw new Error("Nenhuma filial ativa encontrada para o tenant.");
  }

  return branchId;
}
