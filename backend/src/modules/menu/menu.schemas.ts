import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    branchId: z.string().optional(),
    name: z.string().min(2),
    description: z.string().optional(),
    imageUrl: z.string().url().optional(),
    sortOrder: z.number().int().optional(),
    availableFrom: z.string().optional(),
    availableUntil: z.string().optional()
  })
});

export const createProductSchema = z.object({
  body: z.object({
    categoryId: z.string().min(1),
    name: z.string().min(2),
    description: z.string().optional(),
    sku: z.string().optional(),
    imageUrl: z.string().url().optional(),
    basePrice: z.number().nonnegative(),
    promotionalPrice: z.number().nonnegative().optional(),
    costPrice: z.number().nonnegative().optional(),
    preparationTime: z.number().int().positive().optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
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
  body: createProductSchema.shape.body.partial().extend({
    status: z.enum(["ACTIVE", "INACTIVE", "OUT_OF_STOCK", "ARCHIVED"]).optional()
  })
});

export const publicMenuSchema = z.object({
  params: z.object({ tenantSlug: z.string().min(1) }),
  query: z.object({
    branchId: z.string().optional()
  })
});
