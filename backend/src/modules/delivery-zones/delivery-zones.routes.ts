import { Router } from "express";
import { tenantMiddleware } from "../../shared/middlewares/tenant.middleware.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { authMiddleware, requirePermission } from "../auth/auth.middleware.js";
import * as controller from "./delivery-zones.controller.js";
import {
  createDeliveryZoneSchema,
  deleteDeliveryZoneSchema,
  publicDeliveryZonesSchema,
  updateDeliveryZoneSchema
} from "./delivery-zones.schemas.js";

export const deliveryZonesRoutes = Router();
export const publicDeliveryZonesRoutes = Router();

deliveryZonesRoutes.use(authMiddleware, tenantMiddleware);
deliveryZonesRoutes.get("/", requirePermission("tenant.branches.read"), controller.list);
deliveryZonesRoutes.post("/", requirePermission("tenant.branches.write"), validate(createDeliveryZoneSchema), controller.create);
deliveryZonesRoutes.patch("/:id", requirePermission("tenant.branches.write"), validate(updateDeliveryZoneSchema), controller.update);
deliveryZonesRoutes.delete("/:id", requirePermission("tenant.branches.write"), validate(deleteDeliveryZoneSchema), controller.remove);

publicDeliveryZonesRoutes.get("/:tenantSlug/delivery-zones", validate(publicDeliveryZonesSchema), controller.listPublic);
