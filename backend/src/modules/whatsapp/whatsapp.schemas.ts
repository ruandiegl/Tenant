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

export const whatsappTemplateUpdateSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    title: z.string().min(2).max(80).optional(),
    body: z.string().min(1).max(1600).optional(),
    enabled: z.boolean().optional()
  })
});

export const whatsappTemplateDeleteSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});
