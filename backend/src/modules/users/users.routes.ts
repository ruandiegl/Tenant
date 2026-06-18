import { Router } from "express";
import { tenantMiddleware } from "../../shared/middlewares/tenant.middleware.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { authMiddleware, requirePermission } from "../auth/auth.middleware.js";
import * as controller from "./users.controller.js";
import { createTenantUserSchema, updateTenantUserSchema } from "./users.schemas.js";

export const usersRoutes = Router();

usersRoutes.use(authMiddleware, tenantMiddleware);
usersRoutes.get("/", requirePermission("tenant.users.read"), controller.list);
usersRoutes.post("/", requirePermission("tenant.users.write"), validate(createTenantUserSchema), controller.create);
usersRoutes.patch("/:id", requirePermission("tenant.users.write"), validate(updateTenantUserSchema), controller.update);
