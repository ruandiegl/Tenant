import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma.js";
import { signAccessToken } from "../../config/jwt.js";
import { AppError } from "../../shared/errors/app-error.js";

export const login = async (email: string, password: string, tenantSlug?: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      tenantUsers: {
        include: {
          tenant: true,
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

  if (!user?.passwordHash || user.status !== "ACTIVE") {
    throw new AppError("Invalid credentials", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid credentials", 401);
  }

  const membership = tenantSlug
    ? user.tenantUsers.find((item) => item.tenant.slug === tenantSlug && item.status === "ACTIVE")
    : user.tenantUsers.find((item) => item.status === "ACTIVE");

  if (!membership) {
    throw new AppError("User does not have an active tenant membership", 403);
  }

  const permissions = membership.role.permissions.map((item) => item.permission.key);
  const token = signAccessToken({
    userId: user.id,
    tenantId: membership.tenantId,
    tenantUserId: membership.id,
    role: membership.role.name,
    branchId: membership.branchId ?? undefined,
    permissions
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    tenant: {
      id: membership.tenant.id,
      name: membership.tenant.name,
      slug: membership.tenant.slug
    },
    role: membership.role.name,
    permissions
  };
};

export const getMe = async (userId: string, tenantId?: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenantUsers: {
        where: tenantId ? { tenantId } : undefined,
        include: {
          tenant: true,
          role: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          },
          branch: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError("Authenticated user not found", 404);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    memberships: user.tenantUsers.map((membership) => ({
      tenant: membership.tenant,
      role: membership.role.name,
      branch: membership.branch,
      permissions: membership.role.permissions.map((item) => item.permission.key)
    }))
  };
};
