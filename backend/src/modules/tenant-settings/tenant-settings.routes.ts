import { Router } from "express";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { tenantMiddleware } from "../../shared/middlewares/tenant.middleware.js";
import { authMiddleware, requirePermission } from "../auth/auth.middleware.js";
import * as controller from "./tenant-settings.controller.js";
import { tenantSettingsUpdateSchema } from "./tenant-settings.schemas.js";

export const tenantSettingsRoutes = Router();

tenantSettingsRoutes.use(authMiddleware, tenantMiddleware);
tenantSettingsRoutes.get("/", requirePermission("tenant.settings.read"), controller.get);
tenantSettingsRoutes.patch("/", requirePermission("tenant.settings.write"), validate(tenantSettingsUpdateSchema), controller.update);
