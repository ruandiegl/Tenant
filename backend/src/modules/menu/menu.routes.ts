import { Router } from "express";
import { publicRateLimit } from "../../shared/middlewares/rate-limit.middleware.js";
import { tenantMiddleware } from "../../shared/middlewares/tenant.middleware.js";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { authMiddleware, requirePermission } from "../auth/auth.middleware.js";
import * as controller from "./menu.controller.js";
import {
  createCategorySchema,
  createProductSchema,
  createTemplateSchema,
  deleteCategorySchema,
  deleteProductSchema,
  deleteTemplateSchema,
  publicMenuSchema,
  updateCategorySchema,
  updateProductSchema,
  updateTemplateSchema
} from "./menu.schemas.js";

export const tenantMenuRoutes = Router();
export const publicMenuRoutes = Router();

tenantMenuRoutes.use(authMiddleware, tenantMiddleware);
tenantMenuRoutes.get("/categories", requirePermission("tenant.menu.read"), controller.listCategories);
tenantMenuRoutes.post("/categories", requirePermission("tenant.menu.write"), validate(createCategorySchema), controller.createCategory);
tenantMenuRoutes.patch("/categories/:id", requirePermission("tenant.menu.write"), validate(updateCategorySchema), controller.updateCategory);
tenantMenuRoutes.delete("/categories/:id", requirePermission("tenant.menu.write"), validate(deleteCategorySchema), controller.deleteCategory);
tenantMenuRoutes.get("/templates", requirePermission("tenant.menu.read"), controller.listTemplates);
tenantMenuRoutes.post("/templates", requirePermission("tenant.menu.write"), validate(createTemplateSchema), controller.createTemplate);
tenantMenuRoutes.patch("/templates/:id", requirePermission("tenant.menu.write"), validate(updateTemplateSchema), controller.updateTemplate);
tenantMenuRoutes.delete("/templates/:id", requirePermission("tenant.menu.write"), validate(deleteTemplateSchema), controller.deleteTemplate);
tenantMenuRoutes.get("/products", requirePermission("tenant.menu.read"), controller.listProducts);
tenantMenuRoutes.post("/products", requirePermission("tenant.menu.write"), validate(createProductSchema), controller.createProduct);
tenantMenuRoutes.patch("/products/:id", requirePermission("tenant.menu.write"), validate(updateProductSchema), controller.updateProduct);
tenantMenuRoutes.delete("/products/:id", requirePermission("tenant.menu.write"), validate(deleteProductSchema), controller.deleteProduct);

publicMenuRoutes.get("/:tenantSlug/menu", publicRateLimit, validate(publicMenuSchema), controller.publicMenu);
