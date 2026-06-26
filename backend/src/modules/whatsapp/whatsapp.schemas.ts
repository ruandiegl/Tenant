import { z } from "zod";

export const whatsappSettingsSchema = z.object({
  body: z.object({
    autoReplyEnabled: z.boolean().optional(),
    notifyOrderStatus: z.boolean().optional(),
    welcomeMessage: z.string().nullable().optional()
  })
});

export const whatsappTestMessageSchema = z.object({
  body: z.object({
    phone: z.string().min(8),
    message: z.string().min(1).max(1200)
  })
});
