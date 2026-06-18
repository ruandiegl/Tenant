import { Router } from "express";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { authMiddleware, requirePermission } from "../auth/auth.middleware.js";
import * as controller from "./tenants.controller.js";
import { publicTenantSchema, tenantCreateSchema, tenantUpdateSchema } from "./tenants.schemas.js";

export const adminTenantRoutes = Router();
export const publicTenantRoutes = Router();

adminTenantRoutes.use(authMiddleware);
adminTenantRoutes.get("/", requirePermission("platform.tenants.read"), controller.list);
adminTenantRoutes.post("/", requirePermission("platform.tenants.write"), validate(tenantCreateSchema), controller.create);
adminTenantRoutes.patch("/:id", requirePermission("platform.tenants.write"), validate(tenantUpdateSchema), controller.update);

publicTenantRoutes.get("/:slug/public", validate(publicTenantSchema), controller.publicBySlug);
