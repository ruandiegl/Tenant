import { Router } from "express";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { authMiddleware, requirePermission } from "../auth/auth.middleware.js";
import * as controller from "./tenant-management.controller.js";
import {
  auditListSchema,
  tenantCreateSchema,
  tenantIdSchema,
  tenantListSchema,
  tenantPlanUpdateSchema,
  tenantStatusUpdateSchema,
  tenantUpdateSchema
} from "./tenant-management.schemas.js";

export const tenantManagementRoutes = Router();
export const platformAuditRoutes = Router();

tenantManagementRoutes.use(authMiddleware);
tenantManagementRoutes.get("/plans", requirePermission("platform.tenants.read"), controller.plans);
tenantManagementRoutes.get("/", requirePermission("platform.tenants.read"), validate(tenantListSchema), controller.list);
tenantManagementRoutes.post("/", requirePermission("platform.tenants.write"), validate(tenantCreateSchema), controller.create);
tenantManagementRoutes.get("/:id", requirePermission("platform.tenants.read"), validate(tenantIdSchema), controller.detail);
tenantManagementRoutes.patch("/:id", requirePermission("platform.tenants.write"), validate(tenantUpdateSchema), controller.update);
tenantManagementRoutes.patch(
  "/:id/status",
  requirePermission("platform.tenants.write"),
  validate(tenantStatusUpdateSchema),
  controller.updateStatus
);
tenantManagementRoutes.patch("/:id/plan", requirePermission("platform.tenants.write"), validate(tenantPlanUpdateSchema), controller.updatePlan);
tenantManagementRoutes.get("/:id/usage", requirePermission("platform.tenants.read"), validate(tenantIdSchema), controller.usage);

platformAuditRoutes.use(authMiddleware);
platformAuditRoutes.get("/", requirePermission("platform.tenants.read"), validate(auditListSchema), controller.auditLogs);
