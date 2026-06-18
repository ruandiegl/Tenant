import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

export const createCoupon = (tenantId: string, data: {
  code: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_DELIVERY";
  discountValue: number;
  maxDiscountValue?: number;
  minimumOrderValue?: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  usageLimitPerCustomer?: number;
}) => {
  return prisma.coupon.create({
    data: {
      tenantId,
      code: data.code.toUpperCase(),
      description: data.description,
      discountType: data.discountType,
      discountValue: new Prisma.Decimal(data.discountValue),
      maxDiscountValue: data.maxDiscountValue === undefined ? undefined : new Prisma.Decimal(data.maxDiscountValue),
      minimumOrderValue: new Prisma.Decimal(data.minimumOrderValue ?? 0),
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      usageLimit: data.usageLimit,
      usageLimitPerCustomer: data.usageLimitPerCustomer
    }
  });
};

export const listCoupons = (tenantId: string) => {
  return prisma.coupon.findMany({
    where: { tenantId },
    include: { redemptions: true },
    orderBy: { createdAt: "desc" }
  });
};
