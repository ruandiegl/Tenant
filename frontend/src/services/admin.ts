import { Branch, Coupon, DeliveryZone, ReportSummary } from "../types/database";
import { protectedApi } from "./api";
import { deliveryZonesService } from "./delivery-zones";

type BackendSummary = {
  ordersByStatus: Array<{ status: string; _count: { _all: number }; _sum: { total: string | number | null } }>;
  ordersByType: Array<{ type: string; _count: { _all: number }; _sum: { total: string | number | null } }>;
  totals: {
    orders: number;
    revenue: string | number;
    averageTicket: string | number;
    openOrders: number;
    cancelledOrders: number;
    cancellationRate: number;
    averagePreparationMinutes: number;
  };
  topProducts: Array<{
    productNameSnapshot: string;
    _sum: { quantity: number | null; totalPrice: string | number | null };
  }>;
  paymentsByMethod: Array<{ method: string; count: number; revenue: string | number }>;
  hourlySales: Array<{ hour: number; orders: number; revenue: string | number }>;
};

const emptyStatus = {
  DRAFT: 0,
  PLACED: 0,
  ACCEPTED: 0,
  REJECTED: 0,
  PREPARING: 0,
  READY: 0,
  DISPATCHED: 0,
  DELIVERED: 0,
  COMPLETED: 0,
  CANCELLED: 0
};

export const adminService = {
  getSummary: async (params?: { from?: string; to?: string }): Promise<ReportSummary> => {
    const searchParams = new URLSearchParams();

    if (params?.from) searchParams.set("from", params.from);
    if (params?.to) searchParams.set("to", params.to);

    const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
    const summary = await protectedApi<BackendSummary>(`/tenant/reports/summary${suffix}`);
    const ordersByStatus = { ...emptyStatus };

    for (const item of summary.ordersByStatus) {
      ordersByStatus[item.status as keyof typeof ordersByStatus] = item._count._all;
    }

    return {
      tenantId: "",
      branchId: "",
      ordersToday: summary.totals.orders,
      revenueToday: Number(summary.totals.revenue),
      averageTicket: Number(summary.totals.averageTicket),
      averagePreparationMinutes: summary.totals.averagePreparationMinutes,
      openOrders: summary.totals.openOrders,
      cancelledOrders: summary.totals.cancelledOrders,
      cancellationRate: summary.totals.cancellationRate,
      ordersByStatus,
      topProducts: summary.topProducts.map((product) => ({
        productId: product.productNameSnapshot,
        name: product.productNameSnapshot,
        quantity: product._sum.quantity ?? 0,
        revenue: Number(product._sum.totalPrice ?? 0)
      })),
      ordersByType: summary.ordersByType.map((item) => ({
        type: item.type,
        orders: item._count._all,
        revenue: Number(item._sum.total ?? 0)
      })),
      paymentsByMethod: summary.paymentsByMethod.map((item) => ({
        method: item.method,
        count: item.count,
        revenue: Number(item.revenue)
      })),
      hourlySales: summary.hourlySales.map((item) => ({
        hour: item.hour,
        orders: item.orders,
        revenue: Number(item.revenue)
      }))
    };
  },
  getTenantAdminBundle: async () => {
    const [branches, coupons, deliveryZones] = await Promise.all([
      protectedApi<Branch[]>("/tenant/branches"),
      protectedApi<Coupon[]>("/tenant/coupons"),
      deliveryZonesService.list()
    ]);

    return {
      branches,
      deliveryZones: deliveryZones as DeliveryZone[],
      coupons: coupons.map((coupon) => {
        const status = coupon.status as Coupon["status"] | "ARCHIVED";

        return {
        ...coupon,
        discountValue: Number(coupon.discountValue),
        maxDiscountValue: coupon.maxDiscountValue === undefined ? undefined : Number(coupon.maxDiscountValue),
        minimumOrderValue: Number(coupon.minimumOrderValue),
        description: coupon.description ?? "",
        startsAt: coupon.startsAt ?? "",
        endsAt: coupon.endsAt ?? "",
        usageLimit: coupon.usageLimit ?? 0,
        usageLimitPerCustomer: coupon.usageLimitPerCustomer ?? 0,
        status: status === "ARCHIVED" ? "INACTIVE" : status
      };
      })
    };
  }
};
