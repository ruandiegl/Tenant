import { Order, OrderStatus } from "../types/database";
import { protectedApi, api, getApiBaseUrl } from "./api";
import { DEFAULT_PUBLIC_TENANT_SLUG } from "../utils/public-tenant-route";
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
  deliveryZoneId?: string;
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
  list: async (params?: { from?: string; to?: string }) => {
    const searchParams = new URLSearchParams();

    if (params?.from) searchParams.set("from", params.from);
    if (params?.to) searchParams.set("to", params.to);

    const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
    return (await protectedApi<BackendOrder[]>(`/tenant/orders${suffix}`)).map(mapOrder);
  },
  get: async (orderId: string) => mapOrder(await protectedApi<BackendOrder>(`/tenant/orders/${orderId}`)),
  getByPublicCode: async (publicCode: string, tenantSlug = DEFAULT_PUBLIC_TENANT_SLUG) =>
    mapOrder(await api<BackendOrder>(`/public/${tenantSlug}/orders/${publicCode}`)),
  createPublicOrder: async (payload: PublicOrderPayload, tenantSlug = DEFAULT_PUBLIC_TENANT_SLUG) => {
    const branchId = DEMO_BRANCH_ID ?? (await getDefaultPublicBranchId(tenantSlug));
    const response = await fetch(`${getApiBaseUrl()}/public/${tenantSlug}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        branchId
      })
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") ?? "";
      const message = contentType.includes("application/json")
        ? ((await response.json()) as { message?: string; error?: string }).message ?? "Nao foi possivel criar o pedido."
        : await response.text();
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

async function getDefaultPublicBranchId(tenantSlug = DEFAULT_PUBLIC_TENANT_SLUG) {
  const tenant = await api<PublicTenantResponse>(`/tenants/${tenantSlug}/public`);
  const branchId = tenant.branches?.[0]?.id;

  if (!branchId) {
    throw new Error("Nenhuma filial ativa encontrada para o tenant.");
  }

  return branchId;
}
