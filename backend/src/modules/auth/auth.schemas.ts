import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    tenantSlug: z.string().optional()
  })
});

export const inviteTokenSchema = z.object({
  params: z.object({
    token: z.string().min(20)
  })
});

export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(20),
    password: z.string().min(8),
    name: z.string().min(2).optional()
  })
});

export const profileUpdateSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      phone: z.string().nullable().optional(),
      currentPassword: z.string().min(6).optional(),
      password: z.string().min(8).optional()
    })
    .refine((data) => !data.password || Boolean(data.currentPassword), {
      message: "Current password is required",
      path: ["currentPassword"]
    })
});
