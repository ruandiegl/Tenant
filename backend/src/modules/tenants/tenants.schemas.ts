import { z } from "zod";

export const tenantCreateSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
    document: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED", "TRIAL"]).default("TRIAL"),
    settings: z
      .object({
        brandName: z.string().optional(),
        primaryColor: z.string().optional(),
        allowGuestCheckout: z.boolean().optional(),
        autoAcceptOrders: z.boolean().optional(),
        defaultPreparationTime: z.number().int().positive().optional(),
        minimumOrderValue: z.number().nonnegative().optional()
      })
      .optional()
  })
});

export const tenantUpdateSchema = tenantCreateSchema.deepPartial().extend({
  params: z.object({ id: z.string().min(1) })
});

export const publicTenantSchema = z.object({
  params: z.object({ slug: z.string().min(1) })
});
