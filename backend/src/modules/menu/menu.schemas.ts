import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    branchId: z.string().optional(),
    name: z.string().min(2),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    sortOrder: z.number().int().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
    availableFrom: z.string().optional(),
    availableUntil: z.string().optional()
  })
});

export const updateCategorySchema = createCategorySchema.deepPartial().extend({
  params: z.object({ id: z.string().min(1) }),
  body: createCategorySchema.shape.body.partial()
});

export const deleteCategorySchema = z.object({
  params: z.object({ id: z.string().min(1) })
});

export const createProductSchema = z.object({
  body: z.object({
    branchId: z.string().optional(),
    categoryId: z.string().min(1),
    name: z.string().min(2),
    description: z.string().optional(),
    sku: z.string().optional(),
    imageUrl: z.string().optional(),
    basePrice: z.number().nonnegative(),
    promotionalPrice: z.number().nonnegative().optional(),
    costPrice: z.number().nonnegative().optional(),
    preparationTime: z.number().int().positive().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK", "ARCHIVED"]).optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    stockQuantity: z.number().int().nonnegative().optional(),
    optionGroups: z
      .array(
        z.object({
          name: z.string().min(2),
          minSelection: z.number().int().nonnegative().optional(),
          maxSelection: z.number().int().positive().optional(),
          required: z.boolean().optional(),
          sortOrder: z.number().int().optional(),
          options: z
            .array(
              z.object({
                name: z.string().min(2),
                description: z.string().optional(),
                price: z.number().nonnegative().optional(),
                sortOrder: z.number().int().optional()
              })
            )
            .optional()
        })
      )
      .optional()
  })
});

export const updateProductSchema = createProductSchema.deepPartial().extend({
  params: z.object({ id: z.string().min(1) }),
  body: createProductSchema.shape.body.partial()
});

export const deleteProductSchema = z.object({
  params: z.object({ id: z.string().min(1) })
});

const templateItemSchema = z.object({
  type: z.enum(["INGREDIENT", "COMPLEMENT"]),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  sortOrder: z.number().int().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional()
});

export const createTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
    sortOrder: z.number().int().optional(),
    items: z.array(templateItemSchema).optional()
  })
});

export const updateTemplateSchema = createTemplateSchema.deepPartial().extend({
  params: z.object({ id: z.string().min(1) }),
  body: createTemplateSchema.shape.body.partial()
});

export const deleteTemplateSchema = z.object({
  params: z.object({ id: z.string().min(1) })
});

export const publicMenuSchema = z.object({
  params: z.object({ tenantSlug: z.string().min(1) }),
  query: z.object({
    branchId: z.string().optional()
  })
});
