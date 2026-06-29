import { Router } from "express";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { tenantMiddleware } from "../../shared/middlewares/tenant.middleware.js";
import { authMiddleware, requirePermission } from "../auth/auth.middleware.js";
import * as controller from "./whatsapp.controller.js";
import {
  whatsappSettingsSchema,
  whatsappTemplateDeleteSchema,
  whatsappTemplateUpdateSchema,
  whatsappTestMessageSchema
} from "./whatsapp.schemas.js";

export const tenantWhatsappRoutes = Router();
export const publicWhatsappRoutes = Router();

tenantWhatsappRoutes.use(authMiddleware, tenantMiddleware);
tenantWhatsappRoutes.get("/session", requirePermission("tenant.settings.read"), controller.getSession);
tenantWhatsappRoutes.post("/session", requirePermission("tenant.settings.write"), controller.createOrStartSession);
tenantWhatsappRoutes.post("/session/qr", requirePermission("tenant.settings.write"), controller.refreshQr);
tenantWhatsappRoutes.post("/session/stop", requirePermission("tenant.settings.write"), controller.stopSession);
tenantWhatsappRoutes.patch("/session/settings", requirePermission("tenant.settings.write"), validate(whatsappSettingsSchema), controller.updateSettings);
tenantWhatsappRoutes.post("/messages/test", requirePermission("tenant.settings.write"), validate(whatsappTestMessageSchema), controller.sendTestMessage);
tenantWhatsappRoutes.get("/templates", requirePermission("tenant.settings.read"), controller.listTemplates);
tenantWhatsappRoutes.patch("/templates/:id", requirePermission("tenant.settings.write"), validate(whatsappTemplateUpdateSchema), controller.updateTemplate);
tenantWhatsappRoutes.delete("/templates/:id", requirePermission("tenant.settings.write"), validate(whatsappTemplateDeleteSchema), controller.deleteTemplate);

publicWhatsappRoutes.post("/webhooks/waha", controller.webhook);
