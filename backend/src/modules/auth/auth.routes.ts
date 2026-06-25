import { Router } from "express";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { authMiddleware } from "./auth.middleware.js";
import { acceptInviteSchema, inviteTokenSchema, loginSchema, profileUpdateSchema } from "./auth.schemas.js";
import * as controller from "./auth.controller.js";

export const authRoutes = Router();

authRoutes.post("/login", validate(loginSchema), controller.login);
authRoutes.get("/invite/:token", validate(inviteTokenSchema), controller.invite);
authRoutes.post("/accept-invite", validate(acceptInviteSchema), controller.acceptInvite);
authRoutes.get("/me", authMiddleware, controller.me);
authRoutes.patch("/me", authMiddleware, validate(profileUpdateSchema), controller.updateProfile);
authRoutes.post("/logout", authMiddleware, controller.logout);
