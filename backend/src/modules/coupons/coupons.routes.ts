import { Router } from "express";
import { tenantMiddleware } from "../../shared/middlewares/tenant.middleware.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { authMiddleware, requirePermission } from "../auth/auth.middleware.js";
import * as controller from "./coupons.controller.js";
import { createCouponSchema } from "./coupons.schemas.js";

export const couponsRoutes = Router();

couponsRoutes.use(authMiddleware, tenantMiddleware);
couponsRoutes.get("/", requirePermission("tenant.coupons.read"), controller.list);
couponsRoutes.post("/", requirePermission("tenant.coupons.write"), validate(createCouponSchema), controller.create);
