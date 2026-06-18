import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

export const summary = async (tenantId: string, from?: string, to?: string) => {
  const createdAt = from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined;

  const [ordersByStatus, paidTotals, topProducts] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      where: { tenantId, createdAt },
      _count: { _all: true },
      _sum: { total: true }
    }),
    prisma.order.aggregate({
      where: { tenantId, createdAt, status: { notIn: ["CANCELLED", "REJECTED"] } },
      _count: { _all: true },
      _sum: { total: true },
      _avg: { total: true }
    }),
    prisma.orderItem.groupBy({
      by: ["productNameSnapshot"],
      where: { tenantId, order: { createdAt } },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10
    })
  ]);

  return {
    ordersByStatus,
    totals: {
      orders: paidTotals._count._all,
      revenue: paidTotals._sum.total ?? new Prisma.Decimal(0),
      averageTicket: paidTotals._avg.total ?? new Prisma.Decimal(0)
    },
    topProducts
  };
};
