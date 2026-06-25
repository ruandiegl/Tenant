import { z } from "zod";

export const tenantSettingsUpdateSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    settings: z
      .object({
        brandName: z.string().min(2).optional(),
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
