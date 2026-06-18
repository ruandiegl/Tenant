import { Router } from "express";
import { tenantMiddleware } from "../../shared/middlewares/tenant.middleware.js";
import { authMiddleware, requirePermission } from "../auth/auth.middleware.js";
import * as controller from "./reports.controller.js";

export const reportsRoutes = Router();

reportsRoutes.use(authMiddleware, tenantMiddleware);
reportsRoutes.get("/summary", requirePermission("tenant.reports.read"), controller.summary);
