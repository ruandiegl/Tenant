import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  options: z
    .array(
      z.object({
        optionItemId: z.string().min(1),
        quantity: z.number().int().positive().default(1)
      })
    )
    .optional()
});

export const createPublicOrderSchema = z.object({
  params: z.object({ tenantSlug: z.string().min(1) }),
  body: z.object({
    branchId: z.string().min(1),
    type: z.enum(["DELIVERY", "PICKUP", "DINE_IN"]),
    customerName: z.string().min(2),
    customerPhone: z.string().optional(),
    customerEmail: z.string().email().optional(),
    notes: z.string().optional(),
    couponCode: z.string().optional(),
    deliveryFee: z.number().nonnegative().optional(),
    deliveryZoneId: z.string().optional(),
    deliveryAddress: z
      .object({
        street: z.string().min(1),
        number: z.string().min(1),
        complement: z.string().optional(),
        district: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(2),
        postalCode: z.string().optional().default(""),
        reference: z.string().optional()
      })
      .optional(),
    items: z.array(orderItemSchema).min(1)
  })
});

export const publicOrderLookupSchema = z.object({
  params: z.object({
    tenantSlug: z.string().min(1),
    publicCode: z.string().min(1)
  })
});

export const orderStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(["PLACED", "ACCEPTED", "REJECTED", "PREPARING", "READY", "DISPATCHED", "DELIVERED", "COMPLETED", "CANCELLED"]),
    reason: z.string().optional()
  })
});

export const cancelOrderSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ reason: z.string().min(3).optional() })
});
