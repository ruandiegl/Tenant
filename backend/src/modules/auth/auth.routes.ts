import { Router } from "express";
import { validate } from "../../shared/middlewares/validate.middleware.js";
import { authMiddleware } from "./auth.middleware.js";
import { loginSchema } from "./auth.schemas.js";
import * as controller from "./auth.controller.js";

export const authRoutes = Router();

authRoutes.post("/login", validate(loginSchema), controller.login);
authRoutes.get("/me", authMiddleware, controller.me);
authRoutes.post("/logout", authMiddleware, controller.logout);
