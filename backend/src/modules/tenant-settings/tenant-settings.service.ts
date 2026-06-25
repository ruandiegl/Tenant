import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

type SettingsUpdateInput = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  settings?: {
    brandName?: string;
    description?: string | null;
    slogan?: string | null;
    businessType?: string | null;
    cuisineCategory?: string | null;
    websiteUrl?: string | null;
    instagramUrl?: string | null;
    whatsapp?: string | null;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    themeFontFamily?: string | null;
    welcomeMessage?: string | null;
    allowGuestCheckout?: boolean;
    autoAcceptOrders?: boolean;
    defaultPreparationTime?: number;
    minimumOrderValue?: number;
  };
};

function mapTenantSettings(tenant: NonNullable<Awaited<ReturnType<typeof findTenant>>>) {
  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      legalName: tenant.legalName,
      document: tenant.document,
      email: tenant.email,
      phone: tenant.phone,
      status: tenant.status,
      planId: tenant.planId,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt
    },
    settings: tenant.settings
      ? {
          ...tenant.settings,
          minimumOrderValue: Number(tenant.settings.minimumOrderValue)
        }
      : null
  };
}

function findTenant(tenantId: string) {
  return prisma.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
    include: { settings: true }
  });
}

export const getSettings = async (tenantId: string) => {
  const tenant = await findTenant(tenantId);

  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  return mapTenantSettings(tenant);
};

export const updateSettings = async (tenantId: string, data: SettingsUpdateInput, userId?: string) => {
  const tenant = await findTenant(tenantId);

  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      settings: data.settings
        ? {
            upsert: {
              create: {
                brandName: data.settings.brandName ?? data.name ?? tenant.name,
                legalName: tenant.legalName,
                description: data.settings.description,
                slogan: data.settings.slogan,
                businessType: data.settings.businessType,
                cuisineCategory: data.settings.cuisineCategory,
                websiteUrl: data.settings.websiteUrl,
                instagramUrl: data.settings.instagramUrl,
                whatsapp: data.settings.whatsapp,
                logoUrl: data.settings.logoUrl,
                coverImageUrl: data.settings.coverImageUrl,
                primaryColor: data.settings.primaryColor ?? "#1a6b3b",
                secondaryColor: data.settings.secondaryColor ?? "#27ae51",
                themeFontFamily: data.settings.themeFontFamily ?? "Inter",
                welcomeMessage: data.settings.welcomeMessage,
                allowGuestCheckout: data.settings.allowGuestCheckout ?? true,
                autoAcceptOrders: data.settings.autoAcceptOrders ?? false,
                defaultPreparationTime: data.settings.defaultPreparationTime ?? 30,
                minimumOrderValue: new Prisma.Decimal(data.settings.minimumOrderValue ?? 0)
              },
              update: {
                brandName: data.settings.brandName,
                legalName: undefined,
                description: data.settings.description,
                slogan: data.settings.slogan,
                businessType: data.settings.businessType,
                cuisineCategory: data.settings.cuisineCategory,
                websiteUrl: data.settings.websiteUrl,
                instagramUrl: data.settings.instagramUrl,
                whatsapp: data.settings.whatsapp,
                logoUrl: data.settings.logoUrl,
                coverImageUrl: data.settings.coverImageUrl,
                primaryColor: data.settings.primaryColor,
                secondaryColor: data.settings.secondaryColor,
                themeFontFamily: data.settings.themeFontFamily,
                welcomeMessage: data.settings.welcomeMessage,
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

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "tenant.settings_updated",
      entity: "TenantSettings",
      entityId: updated.settings?.id,
      before: {
        name: tenant.name,
        legalName: tenant.legalName,
        document: tenant.document,
        settings: tenant.settings
      },
      after: data as Prisma.InputJsonObject
    }
  });

  return mapTenantSettings(updated);
};
