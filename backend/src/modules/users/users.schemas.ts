import { z } from "zod";

export const createTenantUserSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6).optional(),
    phone: z.string().optional(),
    roleId: z.string().min(1),
    branchId: z.string().optional()
  })
});

export const updateTenantUserSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    roleId: z.string().min(1).optional(),
    branchId: z.string().optional(),
    status: z.enum(["ACTIVE", "INVITED", "SUSPENDED", "DISABLED"]).optional()
  })
});
