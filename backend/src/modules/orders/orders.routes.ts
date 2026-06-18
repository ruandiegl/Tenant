import { Router } from "express";
import { publicRateLimit } from "../../shared/middlewares/rate-limit.middleware.js";
import { tenantMiddleware } from "../../shared/middlewares/tenant.middleware.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { authMiddleware, requirePermission } from "../auth/auth.middleware.js";
import * as controller from "./orders.controller.js";
import { cancelOrderSchema, createPublicOrderSchema, orderStatusSchema, publicOrderLookupSchema } from "./orders.schemas.js";

export const tenantOrdersRoutes = Router();
export const publicOrdersRoutes = Router();

publicOrdersRoutes.post("/:tenantSlug/orders", publicRateLimit, validate(createPublicOrderSchema), controller.createPublic);
publicOrdersRoutes.get("/:tenantSlug/orders/:publicCode", publicRateLimit, validate(publicOrderLookupSchema), controller.getPublic);

tenantOrdersRoutes.use(authMiddleware, tenantMiddleware);
tenantOrdersRoutes.get("/", requirePermission("tenant.orders.read"), controller.list);
tenantOrdersRoutes.get("/:id", requirePermission("tenant.orders.read"), controller.getOne);
tenantOrdersRoutes.patch("/:id/status", requirePermission("tenant.orders.write"), validate(orderStatusSchema), controller.updateStatus);
tenantOrdersRoutes.post("/:id/cancel", requirePermission("tenant.orders.write"), validate(cancelOrderSchema), controller.cancel);
