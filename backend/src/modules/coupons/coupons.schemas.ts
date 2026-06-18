import { z } from "zod";

export const createCouponSchema = z.object({
  body: z.object({
    code: z.string().min(2),
    description: z.string().optional(),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_DELIVERY"]),
    discountValue: z.number().nonnegative(),
    maxDiscountValue: z.number().nonnegative().optional(),
    minimumOrderValue: z.number().nonnegative().optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    usageLimit: z.number().int().positive().optional(),
    usageLimitPerCustomer: z.number().int().positive().optional()
  })
});
