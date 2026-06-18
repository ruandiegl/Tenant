import type { RequestHandler } from "express";
import { prisma } from "../../config/prisma.js";
import { verifyAccessToken } from "../../config/jwt.js";
import { AppError } from "../../shared/errors/app-error.js";

export const authMiddleware: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new AppError("Missing bearer token", 401);
    }

    const token = header.replace("Bearer ", "");
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        tenantUsers: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user || user.status !== "ACTIVE") {
      throw new AppError("Invalid authenticated user", 401);
    }

    const membership = payload.tenantId
      ? user.tenantUsers.find((item) => item.tenantId === payload.tenantId && item.status === "ACTIVE")
      : user.tenantUsers.find((item) => item.status === "ACTIVE");

    req.auth = {
      userId: user.id,
      tenantId: membership?.tenantId,
      tenantUserId: membership?.id,
      role: membership?.role.name,
      branchId: membership?.branchId ?? undefined,
      permissions: membership?.role.permissions.map((item) => item.permission.key) ?? payload.permissions ?? []
    };

    return next();
  } catch (error) {
    return next(error instanceof AppError ? error : new AppError("Invalid bearer token", 401));
  }
};

export const requirePermission =
  (...permissions: string[]): RequestHandler =>
  (req, _res, next) => {
    const hasPermission = permissions.some((permission) => req.auth?.permissions.includes(permission));

    if (!hasPermission) {
      return next(new AppError("Insufficient permission", 403, { permissions }));
    }

    return next();
  };
