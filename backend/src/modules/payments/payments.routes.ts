import { Router } from "express";
import * as controller from "./payments.controller.js";

export const publicPaymentsRoutes = Router();

publicPaymentsRoutes.post("/webhooks/asaas", controller.handleAsaasWebhook);
