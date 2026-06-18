import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

export const createCategory = (tenantId: string, data: {
  branchId?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  availableFrom?: string;
  availableUntil?: string;
}) => {
  return prisma.menuCategory.create({
    data: {
      tenantId,
      branchId: data.branchId,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      sortOrder: data.sortOrder ?? 0,
      availableFrom: data.availableFrom,
      availableUntil: data.availableUntil
    }
  });
};

export const listCategories = (tenantId: string) => {
  return prisma.menuCategory.findMany({
    where: { tenantId, deletedAt: null },
    include: { products: true, branch: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
};

export const createProduct = async (tenantId: string, data: {
  categoryId: string;
  name: string;
  description?: string;
  sku?: string;
  imageUrl?: string;
  basePrice: number;
  promotionalPrice?: number;
  costPrice?: number;
  preparationTime?: number;
  isFeatured?: boolean;
  sortOrder?: number;
  optionGroups?: Array<{
    name: string;
    minSelection?: number;
    maxSelection?: number;
    required?: boolean;
    sortOrder?: number;
    options?: Array<{ name: string; description?: string; price?: number; sortOrder?: number }>;
  }>;
}) => {
  const category = await prisma.menuCategory.findFirst({
    where: { id: data.categoryId, tenantId, deletedAt: null }
  });

  if (!category) {
    throw new AppError("Category not found for tenant", 404);
  }

  return prisma.product.create({
    data: {
      tenantId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      sku: data.sku,
      imageUrl: data.imageUrl,
      basePrice: new Prisma.Decimal(data.basePrice),
      promotionalPrice: data.promotionalPrice === undefined ? undefined : new Prisma.Decimal(data.promotionalPrice),
      costPrice: data.costPrice === undefined ? undefined : new Prisma.Decimal(data.costPrice),
      preparationTime: data.preparationTime,
      isFeatured: data.isFeatured ?? false,
      sortOrder: data.sortOrder ?? 0,
      optionGroups: data.optionGroups
        ? {
            create: data.optionGroups.map((group) => ({
              tenantId,
              name: group.name,
              minSelection: group.minSelection ?? 0,
              maxSelection: group.maxSelection ?? 1,
              required: group.required ?? false,
              sortOrder: group.sortOrder ?? 0,
              options: group.options
                ? {
                    create: group.options.map((option) => ({
                      tenantId,
                      name: option.name,
                      description: option.description,
                      price: new Prisma.Decimal(option.price ?? 0),
                      sortOrder: option.sortOrder ?? 0
                    }))
                  }
                : undefined
            }))
          }
        : undefined
    },
    include: { optionGroups: { include: { options: true } }, category: true }
  });
};

export const listProducts = (tenantId: string) => {
  return prisma.product.findMany({
    where: { tenantId, deletedAt: null },
    include: { category: true, optionGroups: { include: { options: true } }, availability: true, images: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
};

export const updateProduct = async (tenantId: string, id: string, data: Partial<{
  categoryId: string;
  name: string;
  description: string;
  sku: string;
  imageUrl: string;
  basePrice: number;
  promotionalPrice: number;
  costPrice: number;
  preparationTime: number;
  status: "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";
  isFeatured: boolean;
  sortOrder: number;
}>) => {
  const product = await prisma.product.findFirst({ where: { id, tenantId } });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return prisma.product.update({
    where: { id },
    data: {
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      sku: data.sku,
      imageUrl: data.imageUrl,
      basePrice: data.basePrice === undefined ? undefined : new Prisma.Decimal(data.basePrice),
      promotionalPrice: data.promotionalPrice === undefined ? undefined : new Prisma.Decimal(data.promotionalPrice),
      costPrice: data.costPrice === undefined ? undefined : new Prisma.Decimal(data.costPrice),
      preparationTime: data.preparationTime,
      status: data.status,
      isFeatured: data.isFeatured,
      sortOrder: data.sortOrder
    },
    include: { optionGroups: { include: { options: true } }, category: true }
  });
};

export const getPublicMenu = async (tenantSlug: string, branchId?: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, include: { settings: true } });

  if (!tenant || tenant.status !== "ACTIVE") {
    throw new AppError("Tenant not found or unavailable", 404);
  }

  const categories = await prisma.menuCategory.findMany({
    where: {
      tenantId: tenant.id,
      status: "ACTIVE",
      deletedAt: null,
      OR: branchId ? [{ branchId }, { branchId: null }] : undefined
    },
    include: {
      products: {
        where: { status: "ACTIVE", deletedAt: null },
        include: {
          optionGroups: {
            where: { status: "ACTIVE" },
            include: { options: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } } },
            orderBy: { sortOrder: "asc" }
          },
          images: { orderBy: { sortOrder: "asc" } }
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      }
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  return { tenant, categories };
};
