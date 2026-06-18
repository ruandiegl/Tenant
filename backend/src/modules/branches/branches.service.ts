import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

type BranchInput = {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  acceptsDelivery?: boolean;
  acceptsPickup?: boolean;
  acceptsDineIn?: boolean;
  status?: "ACTIVE" | "INACTIVE" | "CLOSED_TEMPORARILY";
  address?: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    postalCode: string;
    reference?: string;
  };
};

export const createBranch = (tenantId: string, data: BranchInput) => {
  return prisma.branch.create({
    data: {
      tenant: { connect: { id: tenantId } },
      name: data.name,
      slug: data.slug,
      email: data.email,
      phone: data.phone,
      acceptsDelivery: data.acceptsDelivery ?? true,
      acceptsPickup: data.acceptsPickup ?? true,
      acceptsDineIn: data.acceptsDineIn ?? false,
      address: data.address ? { create: { tenantId, ...data.address } } : undefined
    },
    include: { address: true }
  });
};

export const listBranches = (tenantId: string) => {
  return prisma.branch.findMany({
    where: { tenantId, deletedAt: null },
    include: { address: true },
    orderBy: { createdAt: "desc" }
  });
};

export const updateBranch = async (tenantId: string, id: string, data: Partial<BranchInput>) => {
  const branch = await prisma.branch.findFirst({ where: { id, tenantId } });

  if (!branch) {
    throw new AppError("Branch not found", 404);
  }

  return prisma.branch.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      email: data.email,
      phone: data.phone,
      status: data.status,
      acceptsDelivery: data.acceptsDelivery,
      acceptsPickup: data.acceptsPickup,
      acceptsDineIn: data.acceptsDineIn,
      address: data.address
        ? branch.addressId
          ? { update: data.address }
          : { create: { tenantId, ...data.address } }
        : undefined
    },
    include: { address: true }
  });
};
