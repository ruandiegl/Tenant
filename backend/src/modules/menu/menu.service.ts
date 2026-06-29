import { Prisma, ProductStatus, RecordStatus } from "@prisma/client";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { resolveTenantSlugAlias } from "../../shared/tenant-slug-aliases.js";

type CategoryInput = {
  branchId?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  status?: RecordStatus;
  availableFrom?: string;
  availableUntil?: string;
};

type OptionGroupInput = {
  name: string;
  minSelection?: number;
  maxSelection?: number;
  required?: boolean;
  sortOrder?: number;
  options?: Array<{ name: string; description?: string; price?: number; sortOrder?: number }>;
};

type ProductInput = {
  branchId?: string;
  categoryId?: string;
  name?: string;
  description?: string;
  sku?: string;
  imageUrl?: string;
  basePrice?: number;
  promotionalPrice?: number;
  costPrice?: number;
  preparationTime?: number;
  status?: ProductStatus;
  isFeatured?: boolean;
  sortOrder?: number;
  stockQuantity?: number;
  imageUpload?: ImageUploadInput;
  optionGroups?: OptionGroupInput[];
};

type ImageUploadInput = {
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  dataBase64: string;
};

type TemplateInput = {
  name?: string;
  description?: string;
  status?: RecordStatus;
  sortOrder?: number;
  items?: Array<{
    type: "INGREDIENT" | "COMPLEMENT";
    name: string;
    description?: string;
    price?: number;
    sortOrder?: number;
    status?: RecordStatus;
  }>;
};

const productInclude = {
  category: true,
  optionGroups: {
    include: { options: { orderBy: { sortOrder: "asc" as const } } },
    orderBy: { sortOrder: "asc" as const }
  },
  availability: true,
  images: true
};

const templateInclude = {
  items: { orderBy: [{ type: "asc" as const }, { sortOrder: "asc" as const }, { name: "asc" as const }] }
};

const defaultTemplates: Array<Required<Pick<TemplateInput, "name" | "items">> & Pick<TemplateInput, "description" | "sortOrder">> = [
  {
    name: "Hamburguer classico",
    description: "Base comum para lanches artesanais.",
    sortOrder: 1,
    items: [
      { type: "INGREDIENT", name: "Pao", sortOrder: 1 },
      { type: "INGREDIENT", name: "Carne", sortOrder: 2 },
      { type: "INGREDIENT", name: "Queijo", sortOrder: 3 },
      { type: "INGREDIENT", name: "Molho da casa", sortOrder: 4 },
      { type: "COMPLEMENT", name: "Bacon", price: 8, sortOrder: 1 },
      { type: "COMPLEMENT", name: "Cheddar", price: 2.5, sortOrder: 2 },
      { type: "COMPLEMENT", name: "Ovo frito", price: 3, sortOrder: 3 }
    ]
  },
  {
    name: "Bebida lata",
    description: "Modelo simples para bebidas prontas.",
    sortOrder: 2,
    items: [{ type: "INGREDIENT", name: "Lata gelada", sortOrder: 1 }]
  }
];

const normalizeProductStatus = (status: ProductStatus | undefined, stockQuantity: number | undefined) => {
  if (status === "ARCHIVED" || status === "INACTIVE") return status;
  if (stockQuantity !== undefined && stockQuantity <= 0) return "OUT_OF_STOCK";
  return status;
};

const validateBranch = async (tenantId: string, branchId?: string | null) => {
  if (!branchId) return null;

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, tenantId, deletedAt: null }
  });

  if (!branch) {
    throw new AppError("Branch not found for tenant", 404);
  }

  return branch;
};

const getDefaultBranchId = async (tenantId: string, preferredBranchId?: string | null) => {
  if (preferredBranchId) {
    await validateBranch(tenantId, preferredBranchId);
    return preferredBranchId;
  }

  const branch = await prisma.branch.findFirst({
    where: { tenantId, deletedAt: null },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }]
  });

  if (!branch) {
    throw new AppError("Create a branch before managing product stock", 400);
  }

  return branch.id;
};

const validateCategory = async (tenantId: string, categoryId: string) => {
  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, tenantId, deletedAt: null }
  });

  if (!category) {
    throw new AppError("Category not found for tenant", 404);
  }

  return category;
};

const createOptionGroups = (tenantId: string, groups: OptionGroupInput[]) => ({
  create: groups.map((group) => ({
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
});

const imageExtensions: Record<ImageUploadInput["mimeType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const saveProductUpload = async (tenantId: string, productId: string, upload?: ImageUploadInput) => {
  if (!upload) return null;

  const buffer = Buffer.from(upload.dataBase64, "base64");
  const maxBytes = 5 * 1024 * 1024;

  if (buffer.byteLength > maxBytes) {
    throw new AppError("Image must be up to 5MB", 400);
  }

  const extension = imageExtensions[upload.mimeType];
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const relativePath = path.join("products", tenantId, productId);
  const uploadDir = path.resolve(process.cwd(), "uploads", relativePath);

  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), buffer);

  const url = `/uploads/${relativePath.replace(/\\/g, "/")}/${fileName}`;

  await prisma.productImage.create({
    data: {
      tenantId,
      productId,
      url,
      alt: upload.fileName,
      sortOrder: 0
    }
  });

  await prisma.product.update({
    where: { id: productId },
    data: { imageUrl: url }
  });

  return url;
};

const createTemplateItems = (tenantId: string, items: NonNullable<TemplateInput["items"]>) => ({
  create: items.map((item, index) => ({
    tenantId,
    type: item.type,
    name: item.name,
    description: item.description,
    price: new Prisma.Decimal(item.price ?? 0),
    sortOrder: item.sortOrder ?? index + 1,
    status: item.status ?? "ACTIVE"
  }))
});

const ensureDefaultTemplates = async (tenantId: string) => {
  const existing = await prisma.productTemplate.count({ where: { tenantId, deletedAt: null } });

  if (existing > 0) return;

  await prisma.productTemplate.createMany({
    data: defaultTemplates.map((template) => ({
      tenantId,
      name: template.name,
      description: template.description,
      sortOrder: template.sortOrder ?? 0
    }))
  });

  const created = await prisma.productTemplate.findMany({ where: { tenantId, deletedAt: null } });

  for (const template of defaultTemplates) {
    const createdTemplate = created.find((entry) => entry.name === template.name);
    if (!createdTemplate) continue;

    await prisma.productTemplateItem.createMany({
      data: template.items.map((item, index) => ({
        tenantId,
        templateId: createdTemplate.id,
        type: item.type,
        name: item.name,
        description: item.description,
        price: new Prisma.Decimal(item.price ?? 0),
        sortOrder: item.sortOrder ?? index + 1
      }))
    });
  }
};

export const createCategory = async (tenantId: string, data: CategoryInput & { name: string }) => {
  await validateBranch(tenantId, data.branchId);

  return prisma.menuCategory.create({
    data: {
      tenantId,
      branchId: data.branchId,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      sortOrder: data.sortOrder ?? 0,
      status: data.status ?? "ACTIVE",
      availableFrom: data.availableFrom,
      availableUntil: data.availableUntil
    }
  });
};

export const listCategories = (tenantId: string) => {
  return prisma.menuCategory.findMany({
    where: { tenantId, deletedAt: null },
    include: { products: { where: { deletedAt: null } }, branch: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
};

export const updateCategory = async (tenantId: string, id: string, data: CategoryInput) => {
  const category = await prisma.menuCategory.findFirst({ where: { id, tenantId, deletedAt: null } });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  await validateBranch(tenantId, data.branchId);

  return prisma.menuCategory.update({
    where: { id },
    data: {
      branchId: data.branchId,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      sortOrder: data.sortOrder,
      status: data.status,
      availableFrom: data.availableFrom,
      availableUntil: data.availableUntil
    }
  });
};

export const deleteCategory = async (tenantId: string, id: string) => {
  const category = await prisma.menuCategory.findFirst({ where: { id, tenantId, deletedAt: null } });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  return prisma.$transaction(async (tx) => {
    await tx.product.updateMany({
      where: { tenantId, categoryId: id, deletedAt: null },
      data: { status: "ARCHIVED", deletedAt: new Date() }
    });

    return tx.menuCategory.update({
      where: { id },
      data: { status: "ARCHIVED", deletedAt: new Date() }
    });
  });
};

export const createProduct = async (tenantId: string, data: ProductInput & { categoryId: string; name: string; basePrice: number }) => {
  const category = await validateCategory(tenantId, data.categoryId);
  const branchId = await getDefaultBranchId(tenantId, data.branchId ?? category.branchId);
  const status = normalizeProductStatus(data.status ?? "ACTIVE", data.stockQuantity);

  const product = await prisma.product.create({
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
      status,
      isFeatured: data.isFeatured ?? false,
      sortOrder: data.sortOrder ?? 0,
      availability: {
        create: {
          tenantId,
          branchId,
          isAvailable: status === "ACTIVE" && (data.stockQuantity ?? 0) > 0,
          stockQuantity: data.stockQuantity ?? 0
        }
      },
      optionGroups: data.optionGroups ? createOptionGroups(tenantId, data.optionGroups) : undefined
    },
    include: productInclude
  });

  await saveProductUpload(tenantId, product.id, data.imageUpload);

  return prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    include: productInclude
  });
};

export const listProducts = (tenantId: string) => {
  return prisma.product.findMany({
    where: { tenantId, deletedAt: null },
    include: productInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
};

export const updateProduct = async (tenantId: string, id: string, data: ProductInput) => {
  const product = await prisma.product.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: { category: true, availability: true }
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const category = data.categoryId ? await validateCategory(tenantId, data.categoryId) : product.category;
  const branchId = await getDefaultBranchId(tenantId, data.branchId ?? category.branchId ?? product.availability[0]?.branchId);
  const status = normalizeProductStatus(data.status, data.stockQuantity);

  await prisma.$transaction(async (tx) => {
    if (data.optionGroups !== undefined) {
      const groups = await tx.optionGroup.findMany({
        where: { tenantId, productId: id },
        select: { id: true }
      });
      const groupIds = groups.map((group) => group.id);

      if (groupIds.length > 0) {
        await tx.optionItem.deleteMany({ where: { tenantId, optionGroupId: { in: groupIds } } });
      }

      await tx.optionGroup.deleteMany({ where: { tenantId, productId: id } });
    }

    await tx.product.update({
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
        status,
        isFeatured: data.isFeatured,
        sortOrder: data.sortOrder,
        optionGroups: data.optionGroups ? createOptionGroups(tenantId, data.optionGroups) : undefined
      }
    });

    if (data.stockQuantity !== undefined || data.status !== undefined || data.branchId !== undefined || data.categoryId !== undefined) {
      await tx.productAvailability.upsert({
        where: { tenantId_productId_branchId: { tenantId, productId: id, branchId } },
        create: {
          tenantId,
          productId: id,
          branchId,
          isAvailable: (status ?? product.status) === "ACTIVE" && (data.stockQuantity ?? product.availability[0]?.stockQuantity ?? 0) > 0,
          stockQuantity: data.stockQuantity ?? product.availability[0]?.stockQuantity ?? 0
        },
        update: {
          isAvailable: (status ?? product.status) === "ACTIVE" && (data.stockQuantity ?? product.availability[0]?.stockQuantity ?? 0) > 0,
          stockQuantity: data.stockQuantity
        }
      });
    }

  });

  await saveProductUpload(tenantId, id, data.imageUpload);

  return prisma.product.findUniqueOrThrow({
    where: { id },
    include: productInclude
  });
};

export const deleteProduct = async (tenantId: string, id: string) => {
  const product = await prisma.product.findFirst({ where: { id, tenantId, deletedAt: null } });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return prisma.product.update({
    where: { id },
    data: { status: "ARCHIVED", deletedAt: new Date() },
    include: productInclude
  });
};

export const listProductTemplates = async (tenantId: string) => {
  await ensureDefaultTemplates(tenantId);

  return prisma.productTemplate.findMany({
    where: { tenantId, deletedAt: null },
    include: templateInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
};

export const createProductTemplate = async (tenantId: string, data: TemplateInput & { name: string }) => {
  return prisma.productTemplate.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      status: data.status ?? "ACTIVE",
      sortOrder: data.sortOrder ?? 0,
      items: data.items ? createTemplateItems(tenantId, data.items) : undefined
    },
    include: templateInclude
  });
};

export const updateProductTemplate = async (tenantId: string, id: string, data: TemplateInput) => {
  const template = await prisma.productTemplate.findFirst({ where: { id, tenantId, deletedAt: null } });

  if (!template) {
    throw new AppError("Template not found", 404);
  }

  return prisma.$transaction(async (tx) => {
    if (data.items !== undefined) {
      await tx.productTemplateItem.deleteMany({ where: { tenantId, templateId: id } });
    }

    await tx.productTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        sortOrder: data.sortOrder,
        items: data.items ? createTemplateItems(tenantId, data.items) : undefined
      }
    });

    return tx.productTemplate.findUniqueOrThrow({ where: { id }, include: templateInclude });
  });
};

export const deleteProductTemplate = async (tenantId: string, id: string) => {
  const template = await prisma.productTemplate.findFirst({ where: { id, tenantId, deletedAt: null } });

  if (!template) {
    throw new AppError("Template not found", 404);
  }

  return prisma.productTemplate.update({
    where: { id },
    data: { status: "ARCHIVED", deletedAt: new Date() },
    include: templateInclude
  });
};

export const getPublicMenu = async (tenantSlug: string, branchId?: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: resolveTenantSlugAlias(tenantSlug) }, include: { settings: true } });

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
        where: { status: { in: ["ACTIVE", "OUT_OF_STOCK"] }, deletedAt: null },
        include: {
          availability: branchId ? { where: { branchId } } : true,
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
