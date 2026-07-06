import { z } from "zod";

const deliveryZoneBodySchema = z
  .object({
    branchId: z.string().min(1),
    name: z.string().min(2),
    type: z.enum(["NEIGHBORHOOD", "POSTAL_CODE", "RADIUS", "RADIUS_OVERFLOW"]),
    neighborhood: z.string().optional(),
    postalCodeStart: z.string().optional(),
    postalCodeEnd: z.string().optional(),
    radiusKm: z.number().nonnegative().optional(),
    fee: z.number().nonnegative(),
    minimumOrderValue: z.number().nonnegative().default(0),
    estimatedMinutes: z.number().int().positive().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE")
  })
  .superRefine((data, ctx) => {
    if (data.type === "NEIGHBORHOOD" && !data.neighborhood?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["neighborhood"], message: "Neighborhood is required" });
    }

    if (data.type === "POSTAL_CODE" && (!data.postalCodeStart || !data.postalCodeEnd)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["postalCodeStart"], message: "Postal code range is required" });
    }

    if (data.type === "RADIUS" && !data.radiusKm) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["radiusKm"], message: "Radius is required" });
    }
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
