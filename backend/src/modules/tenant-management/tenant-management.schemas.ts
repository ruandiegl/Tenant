import { z } from "zod";

const tenantStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "CANCELLED", "TRIAL"]);

export const tenantListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(20),
    search: z.string().trim().optional(),
    status: tenantStatusSchema.optional(),
    plan: z.string().trim().optional()
  })
});

export const tenantIdSchema = z.object({
  params: z.object({ id: z.string().min(1) })
});

export const tenantCreateSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
    planId: z.string().optional(),
    planName: z.enum(["TRIAL", "BASIC", "PRO", "ENTERPRISE"]).default("TRIAL"),
    adminName: z.string().min(2).optional(),
    adminEmail: z.string().email(),
    document: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    status: tenantStatusSchema.default("TRIAL"),
    settings: z
      .object({
        brandName: z.string().optional(),
        logoUrl: z.string().url().optional(),
        primaryColor: z.string().optional(),
        allowGuestCheckout: z.boolean().optional(),
        autoAcceptOrders: z.boolean().optional(),
        defaultPreparationTime: z.number().int().positive().optional(),
        minimumOrderValue: z.number().nonnegative().optional()
      })
      .optional()
  })
});

export const tenantUpdateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).optional(),
    document: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    settings: z
      .object({
        brandName: z.string().optional(),
        logoUrl: z.string().url().nullable().optional(),
        primaryColor: z.string().optional(),
        allowGuestCheckout: z.boolean().optional(),
        autoAcceptOrders: z.boolean().optional(),
        defaultPreparationTime: z.number().int().positive().optional(),
        minimumOrderValue: z.number().nonnegative().optional()
      })
      .optional()
  })
});

export const tenantStatusUpdateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: tenantStatusSchema,
    reason: z.string().min(3).max(500)
  })
});

export const tenantPlanUpdateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    planId: z.string().nullable().optional(),
    planName: z.enum(["TRIAL", "BASIC", "PRO", "ENTERPRISE"]).optional(),
    reason: z.string().max(500).optional()
  })
});

export const auditListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(20),
    tenantId: z.string().optional(),
    action: z.string().optional(),
    entity: z.string().optional()
  })
});
