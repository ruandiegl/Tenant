import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";

export const tenantMiddleware: RequestHandler = (req, _res, next) => {
  const tenantId = req.header("x-tenant-id") ?? req.auth?.tenantId;

  if (!tenantId) {
    return next(new AppError("Tenant context is required", 400));
  }

  if (req.auth?.tenantId && req.auth.tenantId !== tenantId) {
    return next(new AppError("Tenant context does not match authenticated user", 403));
  }

  req.tenantId = tenantId;
  return next();
};
