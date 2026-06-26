import { z } from "zod";

const deliveryZoneBodySchema = z.object({
  branchId: z.string().min(1),
  name: z.string().min(2),
  type: z.enum(["POSTAL_CODE", "RADIUS"]),
  postalCodeStart: z.string().optional(),
  postalCodeEnd: z.string().optional(),
  radiusKm: z.number().nonnegative().optional(),
  fee: z.number().nonnegative(),
  minimumOrderValue: z.number().nonnegative().default(0),
  estimatedMinutes: z.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
});

export const createDeliveryZoneSchema = z.object({
  body: deliveryZoneBodySchema
});

export const updateDeliveryZoneSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: deliveryZoneBodySchema
});

export const deleteDeliveryZoneSchema = z.object({
  params: z.object({ id: z.string().min(1) })
});

export const publicDeliveryZonesSchema = z.object({
  params: z.object({ tenantSlug: z.string().min(1) })
});
