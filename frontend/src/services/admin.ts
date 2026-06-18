import { Branch, Coupon, ReportSummary } from "../types/database";
import { protectedApi } from "./api";

type BackendSummary = {
  ordersByStatus: Array<{ status: string; _count: { _all: number }; _sum: { total: string | number | null } }>;
  totals: {
    orders: number;
    revenue: string | number;
    averageTicket: string | number;
  };
  topProducts: Array<{
    productNameSnapshot: string;
    _sum: { quantity: number | null; totalPrice: string | number | null };
  }>;
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
  getSummary: async (): Promise<ReportSummary> => {
    const summary = await protectedApi<BackendSummary>("/tenant/reports/summary");
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
      averagePreparationMinutes: 0,
      ordersByStatus,
      topProducts: summary.topProducts.map((product) => ({
        productId: product.productNameSnapshot,
        name: product.productNameSnapshot,
        quantity: product._sum.quantity ?? 0,
        revenue: Number(product._sum.totalPrice ?? 0)
      }))
    };
  },
  getTenantAdminBundle: async () => {
    const [branches, coupons] = await Promise.all([
      protectedApi<Branch[]>("/tenant/branches"),
      protectedApi<Coupon[]>("/tenant/coupons")
    ]);

    return {
      branches,
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
