import { Router } from "express";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { authMiddleware, requirePermission, requirePlatformAdmin } from "../auth/auth.middleware.js";
import * as controller from "./tenant-management.controller.js";
import {
  auditListSchema,
  planCreateSchema,
  planIdSchema,
  planUpdateSchema,
  tenantCreateSchema,
  tenantIdSchema,
  tenantInviteLinkSchema,
  tenantListSchema,
  tenantPlanUpdateSchema,
  tenantStatusUpdateSchema,
  tenantUpdateSchema
} from "./tenant-management.schemas.js";

export const tenantManagementRoutes = Router();
export const platformAuditRoutes = Router();

tenantManagementRoutes.use(authMiddleware);
tenantManagementRoutes.use(requirePlatformAdmin);
tenantManagementRoutes.get("/plans", requirePermission("platform.tenants.read"), controller.plans);
tenantManagementRoutes.post("/plans", requirePermission("platform.tenants.write"), validate(planCreateSchema), controller.createPlan);
tenantManagementRoutes.patch("/plans/:planId", requirePermission("platform.tenants.write"), validate(planUpdateSchema), controller.updatePlanConfig);
tenantManagementRoutes.delete("/plans/:planId", requirePermission("platform.tenants.write"), validate(planIdSchema), controller.removePlan);
tenantManagementRoutes.get("/", requirePermission("platform.tenants.read"), validate(tenantListSchema), controller.list);
tenantManagementRoutes.post("/", requirePermission("platform.tenants.write"), validate(tenantCreateSchema), controller.create);
tenantManagementRoutes.get("/:id", requirePermission("platform.tenants.read"), validate(tenantIdSchema), controller.detail);
tenantManagementRoutes.patch("/:id", requirePermission("platform.tenants.write"), validate(tenantUpdateSchema), controller.update);
tenantManagementRoutes.delete("/:id", requirePermission("platform.tenants.write"), validate(tenantIdSchema), controller.remove);
tenantManagementRoutes.patch(
  "/:id/status",
  requirePermission("platform.tenants.write"),
  validate(tenantStatusUpdateSchema),
  controller.updateStatus
);
tenantManagementRoutes.patch("/:id/plan", requirePermission("platform.tenants.write"), validate(tenantPlanUpdateSchema), controller.updatePlan);
tenantManagementRoutes.post(
  "/:id/users/:tenantUserId/invite-link",
  requirePermission("platform.tenants.write"),
  validate(tenantInviteLinkSchema),
  controller.inviteLink
);
tenantManagementRoutes.get("/:id/usage", requirePermission("platform.tenants.read"), validate(tenantIdSchema), controller.usage);

platformAuditRoutes.use(authMiddleware);
platformAuditRoutes.use(requirePlatformAdmin);
platformAuditRoutes.get("/", requirePermission("platform.tenants.read"), validate(auditListSchema), controller.auditLogs);
