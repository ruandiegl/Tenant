import { Router } from "express";
import { tenantMiddleware } from "../../shared/middlewares/tenant.middleware.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { authMiddleware, requirePermission } from "../auth/auth.middleware.js";
import * as controller from "./kitchen.controller.js";
import { kitchenStatusSchema } from "./kitchen.schemas.js";

export const kitchenRoutes = Router();

kitchenRoutes.use(authMiddleware, tenantMiddleware);
kitchenRoutes.get("/orders", requirePermission("tenant.kitchen.read"), controller.list);
kitchenRoutes.patch("/orders/:id/status", requirePermission("tenant.kitchen.write"), validate(kitchenStatusSchema), controller.updateStatus);
