import { Router } from "express";
import { tenantMiddleware } from "../../shared/middlewares/tenant.middleware.js";
import { authMiddleware, requirePermission } from "../auth/auth.middleware.js";
import * as controller from "./audit.controller.js";

export const auditRoutes = Router();

auditRoutes.use(authMiddleware, tenantMiddleware);
auditRoutes.get("/", requirePermission("tenant.audit.read"), controller.list);
