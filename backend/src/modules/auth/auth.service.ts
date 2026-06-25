import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { signAccessToken } from "../../config/jwt.js";
import { AppError } from "../../shared/errors/app-error.js";

const platformPermissions = ["platform.tenants.read", "platform.tenants.write"];

const hashInviteToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

const defaultPlanCapabilities = {
  onlineOrders: true,
  menuBuilder: true,
  kitchen: true,
  coupons: true,
  reports: true,
  stockControl: true,
  customBranding: true,
  multiBranch: false,
  apiAccess: false,
  prioritySupport: false
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mapPlanCapabilities(features: unknown) {
  const root = isObject(features) ? features : {};
  const capabilities = isObject(root.capabilities) ? root.capabilities : {};

  return {
    onlineOrders: typeof capabilities.onlineOrders === "boolean" ? capabilities.onlineOrders : defaultPlanCapabilities.onlineOrders,
    menuBuilder: typeof capabilities.menuBuilder === "boolean" ? capabilities.menuBuilder : defaultPlanCapabilities.menuBuilder,
    kitchen: typeof capabilities.kitchen === "boolean" ? capabilities.kitchen : defaultPlanCapabilities.kitchen,
    coupons: typeof capabilities.coupons === "boolean" ? capabilities.coupons : defaultPlanCapabilities.coupons,
    reports: typeof capabilities.reports === "boolean" ? capabilities.reports : defaultPlanCapabilities.reports,
    stockControl: typeof capabilities.stockControl === "boolean" ? capabilities.stockControl : defaultPlanCapabilities.stockControl,
    customBranding: typeof capabilities.customBranding === "boolean" ? capabilities.customBranding : defaultPlanCapabilities.customBranding,
    multiBranch: typeof capabilities.multiBranch === "boolean" ? capabilities.multiBranch : defaultPlanCapabilities.multiBranch,
    apiAccess: typeof capabilities.apiAccess === "boolean" ? capabilities.apiAccess : defaultPlanCapabilities.apiAccess,
    prioritySupport: typeof capabilities.prioritySupport === "boolean" ? capabilities.prioritySupport : defaultPlanCapabilities.prioritySupport
  };
}

export const login = async (email: string, password: string, tenantSlug?: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      tenantUsers: {
        include: {
          tenant: { include: { plan: true } },
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

  if (!tenantSlug) {
    if (!user.isPlatformAdmin) {
      throw new AppError("Tenant slug is required for tenant users", 400);
    }

    const token = signAccessToken({
      userId: user.id,
      permissions: platformPermissions,
      role: "superadmin",
      isPlatformAdmin: true
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
      role: "superadmin",
      permissions: platformPermissions,
      isPlatformAdmin: true
    };
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
      slug: membership.tenant.slug,
      plan: membership.tenant.plan
        ? {
            id: membership.tenant.plan.id,
            name: membership.tenant.plan.name,
            capabilities: mapPlanCapabilities(membership.tenant.plan.features)
          }
        : null
    },
    role: membership.role.name,
    permissions,
    isPlatformAdmin: false
  };
};

export const getMe = async (userId: string, tenantId?: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenantUsers: {
        where: tenantId ? { tenantId } : undefined,
        include: {
          tenant: { include: { plan: true } },
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

  if (user.isPlatformAdmin && !tenantId) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isPlatformAdmin: true,
      platform: {
        role: "superadmin",
        permissions: platformPermissions
      },
      memberships: []
    };
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isPlatformAdmin: false,
    memberships: user.tenantUsers.map((membership) => ({
      tenant: {
        ...membership.tenant,
        plan: membership.tenant.plan
          ? {
              id: membership.tenant.plan.id,
              name: membership.tenant.plan.name,
              capabilities: mapPlanCapabilities(membership.tenant.plan.features)
            }
          : null
      },
      role: membership.role.name,
      branch: membership.branch,
      permissions: membership.role.permissions.map((item) => item.permission.key)
    }))
  };
};

export const updateProfile = async (
  userId: string,
  data: { name?: string; email?: string; phone?: string | null; currentPassword?: string; password?: string }
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError("Authenticated user not found", 404);
  }

  if (data.email && data.email !== user.email) {
    const emailOwner = await prisma.user.findUnique({ where: { email: data.email } });

    if (emailOwner && emailOwner.id !== userId) {
      throw new AppError("Email already in use", 409);
    }
  }

  let passwordHash: string | undefined;

  if (data.password) {
    if (!user.passwordHash || !data.currentPassword) {
      throw new AppError("Current password is required", 400);
    }

    const passwordMatches = await bcrypt.compare(data.currentPassword, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Current password does not match", 403);
    }

    passwordHash = await bcrypt.hash(data.password, 12);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash
    }
  });

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    avatarUrl: updated.avatarUrl
  };
};

export const getInvite = async (token: string) => {
  const invite = await prisma.tenantInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { tenant: { include: { settings: true } } }
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new AppError("Invite not found or expired", 404);
  }

  return {
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
    tenant: {
      id: invite.tenant.id,
      name: invite.tenant.name,
      slug: invite.tenant.slug,
      brandName: invite.tenant.settings?.brandName ?? invite.tenant.name,
      primaryColor: invite.tenant.settings?.primaryColor ?? "#1a6b3b",
      secondaryColor: invite.tenant.settings?.secondaryColor ?? "#27ae51"
    }
  };
};

export const acceptInvite = async (data: { token: string; password: string; name?: string }) => {
  const invite = await prisma.tenantInvite.findUnique({
    where: { tokenHash: hashInviteToken(data.token) },
    include: {
      tenant: true
    }
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new AppError("Invite not found or expired", 404);
  }

  const membership = await prisma.tenantUser.findFirst({
    where: {
      tenantId: invite.tenantId,
      user: { email: invite.email }
    },
    include: {
      user: true,
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  });

  if (!membership) {
    throw new AppError("Invite membership not found", 404);
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: membership.userId },
      data: {
        name: data.name ?? membership.user.name,
        passwordHash,
        status: "ACTIVE",
        lastLoginAt: new Date()
      }
    }),
    prisma.tenantUser.update({
      where: { id: membership.id },
      data: { status: "ACTIVE" }
    }),
    prisma.tenantInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() }
    }),
    prisma.auditLog.create({
      data: {
        tenantId: invite.tenantId,
        userId: membership.userId,
        action: "tenant.invite_accepted",
        entity: "TenantInvite",
        entityId: invite.id,
        after: { email: invite.email, role: invite.role }
      }
    })
  ]);

  const permissions = membership.role.permissions.map((item) => item.permission.key);
  const token = signAccessToken({
    userId: membership.userId,
    tenantId: invite.tenantId,
    tenantUserId: membership.id,
    role: membership.role.name,
    branchId: membership.branchId ?? undefined,
    permissions,
    isPlatformAdmin: false
  });

  return {
    token,
    user: {
      id: membership.userId,
      name: data.name ?? membership.user.name,
      email: membership.user.email
    },
    tenant: {
      id: invite.tenant.id,
      name: invite.tenant.name,
      slug: invite.tenant.slug
    },
    role: membership.role.name,
    permissions,
    isPlatformAdmin: false
  };
};
