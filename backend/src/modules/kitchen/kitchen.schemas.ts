import { z } from "zod";

export const kitchenStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(["STARTED", "READY", "DELAYED", "CANCELLED"]),
    reason: z.string().optional()
  })
});
