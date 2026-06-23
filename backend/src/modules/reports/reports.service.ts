import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

export const summary = async (tenantId: string, from?: string, to?: string) => {
  const createdAt = from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined;

  const [ordersByStatus, paidTotals, topProducts, ordersByType, payments, periodOrders] = await Promise.all([
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
      where: { tenantId, order: { createdAt, status: { notIn: ["CANCELLED", "REJECTED"] } } },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10
    }),
    prisma.order.groupBy({
      by: ["type"],
      where: { tenantId, createdAt },
      _count: { _all: true },
      _sum: { total: true }
    }),
    prisma.payment.findMany({
      where: { tenantId, order: { createdAt } },
      include: { method: true }
    }),
    prisma.order.findMany({
      where: { tenantId, createdAt },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        readyAt: true,
        completedAt: true,
        cancelledAt: true
      }
    })
  ]);

  const paymentMap = new Map<string, { method: string; count: number; revenue: Prisma.Decimal }>();

  for (const payment of payments) {
    const method = payment.method?.type ?? "UNKNOWN";
    const current = paymentMap.get(method) ?? { method, count: 0, revenue: new Prisma.Decimal(0) };
    current.count += 1;
    current.revenue = current.revenue.add(payment.amount);
    paymentMap.set(method, current);
  }

  const hourlyMap = new Map<number, { hour: number; orders: number; revenue: Prisma.Decimal }>();

  for (const order of periodOrders) {
    const hour = order.createdAt.getHours();
    const current = hourlyMap.get(hour) ?? { hour, orders: 0, revenue: new Prisma.Decimal(0) };
    current.orders += 1;
    current.revenue = current.revenue.add(order.total);
    hourlyMap.set(hour, current);
  }

  const preparationTimes = periodOrders
    .map((order) => {
      const end = order.completedAt ?? order.readyAt;
      if (!end) return null;

      return Math.max(0, Math.round((end.getTime() - order.createdAt.getTime()) / 60000));
    })
    .filter((value): value is number => value !== null);

  const finalStatuses = ["CANCELLED", "REJECTED", "DELIVERED", "COMPLETED"];
  const cancelledCount = periodOrders.filter((order) => order.status === "CANCELLED" || order.status === "REJECTED").length;
  const openOrders = periodOrders.filter((order) => !finalStatuses.includes(order.status)).length;

  return {
    ordersByStatus,
    ordersByType,
    totals: {
      orders: paidTotals._count._all,
      revenue: paidTotals._sum.total ?? new Prisma.Decimal(0),
      averageTicket: paidTotals._avg.total ?? new Prisma.Decimal(0),
      openOrders,
      cancelledOrders: cancelledCount,
      cancellationRate: periodOrders.length > 0 ? cancelledCount / periodOrders.length : 0,
      averagePreparationMinutes:
        preparationTimes.length > 0 ? Math.round(preparationTimes.reduce((sum, value) => sum + value, 0) / preparationTimes.length) : 0
    },
    topProducts,
    paymentsByMethod: Array.from(paymentMap.values()).sort((a, b) => Number(b.revenue) - Number(a.revenue)),
    hourlySales: Array.from(hourlyMap.values()).sort((a, b) => a.hour - b.hour)
  };
};
