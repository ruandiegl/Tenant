import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

export const createTenant = async (data: {
  name: string;
  slug: string;
  document?: string;
  email?: string;
  phone?: string;
  status?: "ACTIVE" | "SUSPENDED" | "CANCELLED" | "TRIAL";
  settings?: {
    brandName?: string;
    primaryColor?: string;
    allowGuestCheckout?: boolean;
    autoAcceptOrders?: boolean;
    defaultPreparationTime?: number;
    minimumOrderValue?: number;
  };
}) => {
  return prisma.tenant.create({
    data: {
      name: data.name,
      slug: data.slug,
      document: data.document,
      email: data.email,
      phone: data.phone,
      status: data.status ?? "TRIAL",
      settings: {
        create: {
          brandName: data.settings?.brandName ?? data.name,
          primaryColor: data.settings?.primaryColor,
          allowGuestCheckout: data.settings?.allowGuestCheckout ?? true,
          autoAcceptOrders: data.settings?.autoAcceptOrders ?? false,
          defaultPreparationTime: data.settings?.defaultPreparationTime ?? 30,
          minimumOrderValue: new Prisma.Decimal(data.settings?.minimumOrderValue ?? 0)
        }
      }
    },
    include: { settings: true }
  });
};

export const listTenants = () => {
  return prisma.tenant.findMany({
    where: { deletedAt: null },
    include: { settings: true, plan: true },
    orderBy: { createdAt: "desc" }
  });
};

export const updateTenant = async (id: string, data: Partial<Parameters<typeof createTenant>[0]>) => {
  const tenant = await prisma.tenant.findUnique({ where: { id } });

  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  return prisma.tenant.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      document: data.document,
      email: data.email,
      phone: data.phone,
      status: data.status,
      settings: data.settings
        ? {
            upsert: {
              create: {
                brandName: data.settings.brandName ?? data.name ?? tenant.name,
                primaryColor: data.settings.primaryColor,
                allowGuestCheckout: data.settings.allowGuestCheckout ?? true,
                autoAcceptOrders: data.settings.autoAcceptOrders ?? false,
                defaultPreparationTime: data.settings.defaultPreparationTime ?? 30,
                minimumOrderValue: new Prisma.Decimal(data.settings.minimumOrderValue ?? 0)
              },
              update: {
                brandName: data.settings.brandName,
                primaryColor: data.settings.primaryColor,
                allowGuestCheckout: data.settings.allowGuestCheckout,
                autoAcceptOrders: data.settings.autoAcceptOrders,
                defaultPreparationTime: data.settings.defaultPreparationTime,
                minimumOrderValue:
                  data.settings.minimumOrderValue === undefined
                    ? undefined
                    : new Prisma.Decimal(data.settings.minimumOrderValue)
              }
            }
          }
        : undefined
    },
    include: { settings: true }
  });
};

export const getPublicTenant = async (slug: string) => {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { settings: true, branches: { where: { status: "ACTIVE" } } }
  });

  if (!tenant || tenant.status !== "ACTIVE") {
    throw new AppError("Tenant not found or unavailable", 404);
  }

  return tenant;
};
