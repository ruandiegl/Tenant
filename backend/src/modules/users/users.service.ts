import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

export const createTenantUser = async (
  tenantId: string,
  data: { name: string; email: string; password?: string; phone?: string; roleId: string; branchId?: string }
) => {
  const role = await prisma.role.findFirst({ where: { id: data.roleId, OR: [{ tenantId }, { tenantId: null }] } });

  if (!role) {
    throw new AppError("Role not found for tenant", 404);
  }

  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;

  const user = await prisma.user.upsert({
    where: { email: data.email },
    create: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
      status: passwordHash ? "ACTIVE" : "INVITED"
    },
    update: {
      name: data.name,
      phone: data.phone,
      passwordHash
    }
  });

  return prisma.tenantUser.create({
    data: {
      tenantId,
      userId: user.id,
      roleId: role.id,
      branchId: data.branchId,
      status: passwordHash ? "ACTIVE" : "INVITED"
    },
    include: { user: true, role: true, branch: true }
  });
};

export const listTenantUsers = (tenantId: string) => {
  return prisma.tenantUser.findMany({
    where: { tenantId },
    include: { user: true, role: true, branch: true },
    orderBy: { createdAt: "desc" }
  });
};

export const updateTenantUser = async (
  tenantId: string,
  id: string,
  data: { name?: string; phone?: string; roleId?: string; branchId?: string; status?: "ACTIVE" | "INVITED" | "SUSPENDED" | "DISABLED" }
) => {
  const membership = await prisma.tenantUser.findFirst({ where: { id, tenantId } });

  if (!membership) {
    throw new AppError("Tenant user not found", 404);
  }

  if (data.name || data.phone) {
    await prisma.user.update({
      where: { id: membership.userId },
      data: { name: data.name, phone: data.phone }
    });
  }

  return prisma.tenantUser.update({
    where: { id },
    data: {
      roleId: data.roleId,
      branchId: data.branchId,
      status: data.status
    },
    include: { user: true, role: true, branch: true }
  });
};
