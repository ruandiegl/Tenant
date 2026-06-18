import { Router } from "express";
import { tenantMiddleware } from "../../shared/middlewares/tenant.middleware.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { authMiddleware, requirePermission } from "../auth/auth.middleware.js";
import * as controller from "./branches.controller.js";
import { createBranchSchema, updateBranchSchema } from "./branches.schemas.js";

export const branchesRoutes = Router();

branchesRoutes.use(authMiddleware, tenantMiddleware);
branchesRoutes.get("/", requirePermission("tenant.branches.read"), controller.list);
branchesRoutes.post("/", requirePermission("tenant.branches.write"), validate(createBranchSchema), controller.create);
branchesRoutes.patch("/:id", requirePermission("tenant.branches.write"), validate(updateBranchSchema), controller.update);
