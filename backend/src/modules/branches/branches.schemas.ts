import { z } from "zod";

export const createBranchSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "CLOSED_TEMPORARILY"]).optional(),
    acceptsDelivery: z.boolean().optional(),
    acceptsPickup: z.boolean().optional(),
    acceptsDineIn: z.boolean().optional(),
    address: z
      .object({
        street: z.string().min(1),
        number: z.string().min(1),
        complement: z.string().optional(),
        district: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(2),
        postalCode: z.string().min(3),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        reference: z.string().optional()
      })
      .optional()
  })
});

export const updateBranchSchema = createBranchSchema.deepPartial().extend({
  params: z.object({ id: z.string().min(1) }),
  body: createBranchSchema.shape.body.partial()
});

export const deleteBranchSchema = z.object({
  params: z.object({ id: z.string().min(1) })
});
