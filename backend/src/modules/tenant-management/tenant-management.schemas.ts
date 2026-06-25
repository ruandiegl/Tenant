import { z } from "zod";

const tenantStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "CANCELLED", "TRIAL"]);
const recordStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);
const planLimitsSchema = z.object({
  products: z.number().int().positive().nullable().optional(),
  coupons: z.number().int().positive().nullable().optional(),
  ordersPerMonth: z.number().int().positive().nullable().optional()
});
const planCapabilitiesSchema = z.object({
  onlineOrders: z.boolean().optional(),
  menuBuilder: z.boolean().optional(),
  kitchen: z.boolean().optional(),
  coupons: z.boolean().optional(),
  reports: z.boolean().optional(),
  stockControl: z.boolean().optional(),
  customBranding: z.boolean().optional(),
  multiBranch: z.boolean().optional(),
  apiAccess: z.boolean().optional(),
  prioritySupport: z.boolean().optional()
});

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
    legalName: z.string().min(2).optional(),
    planId: z.string().optional(),
    planName: z.enum(["TRIAL", "BASIC", "PRO", "ENTERPRISE"]).default("TRIAL"),
    adminName: z.string().min(2).optional(),
    adminEmail: z.string().email(),
    document: z.string().min(11).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    status: tenantStatusSchema.default("TRIAL"),
    branch: z
      .object({
        name: z.string().min(2).default("Matriz"),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.object({
          street: z.string().min(2),
          number: z.string().min(1),
          complement: z.string().optional(),
          district: z.string().min(2),
          city: z.string().min(2),
          state: z.string().min(2).max(2),
          postalCode: z.string().min(8),
          reference: z.string().optional()
        })
      })
      .optional(),
    settings: z
      .object({
        brandName: z.string().optional(),
        legalName: z.string().optional(),
        description: z.string().optional(),
        slogan: z.string().optional(),
        businessType: z.string().optional(),
        cuisineCategory: z.string().optional(),
        websiteUrl: z.string().url().optional(),
        instagramUrl: z.string().optional(),
        whatsapp: z.string().optional(),
        logoUrl: z.string().url().optional(),
        coverImageUrl: z.string().url().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        themeFontFamily: z.string().optional(),
        welcomeMessage: z.string().optional(),
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
    legalName: z.string().nullable().optional(),
    document: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    settings: z
      .object({
        brandName: z.string().optional(),
        legalName: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        slogan: z.string().nullable().optional(),
        businessType: z.string().nullable().optional(),
        cuisineCategory: z.string().nullable().optional(),
        websiteUrl: z.string().url().nullable().optional(),
        instagramUrl: z.string().nullable().optional(),
        whatsapp: z.string().nullable().optional(),
        logoUrl: z.string().url().nullable().optional(),
        coverImageUrl: z.string().url().nullable().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        themeFontFamily: z.string().nullable().optional(),
        welcomeMessage: z.string().nullable().optional(),
        allowGuestCheckout: z.boolean().optional(),
        autoAcceptOrders: z.boolean().optional(),
        defaultPreparationTime: z.number().int().positive().optional(),
        minimumOrderValue: z.number().nonnegative().optional()
      })
      .optional()
  })
});

export const tenantInviteLinkSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    tenantUserId: z.string().min(1)
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

export const planIdSchema = z.object({
  params: z.object({ planId: z.string().min(1) })
});

export const planCreateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).regex(/^[A-Za-z0-9_-]+$/),
    description: z.string().trim().nullable().optional(),
    price: z.number().nonnegative().default(0),
    maxUsers: z.number().int().positive().nullable().optional(),
    maxBranches: z.number().int().positive().nullable().optional(),
    limits: planLimitsSchema.optional(),
    capabilities: planCapabilitiesSchema.optional(),
    status: recordStatusSchema.default("ACTIVE")
  })
});

export const planUpdateSchema = z.object({
  params: z.object({ planId: z.string().min(1) }),
  body: z.object({
    name: z.string().trim().min(2).regex(/^[A-Za-z0-9_-]+$/).optional(),
    description: z.string().trim().nullable().optional(),
    price: z.number().nonnegative().optional(),
    maxUsers: z.number().int().positive().nullable().optional(),
    maxBranches: z.number().int().positive().nullable().optional(),
    limits: planLimitsSchema.optional(),
    capabilities: planCapabilitiesSchema.optional(),
    status: recordStatusSchema.optional()
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
