import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { menuService } from "../../services/menu";
import { MenuCategory, Product, ProductAvailability, ProductStatus } from "../../types/database";
import { ImageUpload } from "../../utils/image-upload";

export type CategoryDraft = {
  name: string;
  description: string;
  imageUrl: string;
  status: ProductStatus;
};

export type ProductDraft = {
  categoryId: string;
  name: string;
  description: string;
  sku: string;
  imageUrl: string;
  imageUpload?: ImageUpload;
  basePrice: number;
  promotionalPrice?: number;
  costPrice?: number;
  preparationTime: number;
  status: ProductStatus;
  isFeatured: boolean;
  stockQuantity: number;
  ingredients: string[];
  complements: Array<{ name: string; price: number }>;
};

type CatalogContextValue = {
  categories: MenuCategory[];
  products: Product[];
  productAvailability: ProductAvailability[];
  publicCategories: MenuCategory[];
  publicProducts: Product[];
  loading: boolean;
  error: string | null;
  refreshPublicCatalog: () => Promise<void>;
  refreshAdminCatalog: () => Promise<void>;
  getProductStock: (productId: string) => number;
  createCategory: (draft: CategoryDraft) => Promise<void>;
  updateCategory: (categoryId: string, draft: CategoryDraft) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  createProduct: (draft: ProductDraft) => Promise<void>;
  updateProduct: (productId: string, draft: ProductDraft) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  decrementStock: (productId: string, quantity: number) => void;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

function uniqueCategories(categories: MenuCategory[]) {
  const seen = new Set<string>();

  return categories.filter((category) => {
    if (seen.has(category.id)) return false;
    seen.add(category.id);
    return true;
  });
}

function buildOptionGroups(draft: ProductDraft) {
  return [
    draft.ingredients.length > 0
      ? {
          name: "Ingredientes",
          minSelection: 0,
          maxSelection: draft.ingredients.length,
          required: false,
          sortOrder: 1,
          options: draft.ingredients.map((ingredient, index) => ({
            name: ingredient,
            description: "Ingrediente do produto",
            price: 0,
            sortOrder: index + 1
          }))
        }
      : null,
    draft.complements.length > 0
      ? {
          name: "Complementos",
          minSelection: 0,
          maxSelection: draft.complements.length,
          required: false,
          sortOrder: 2,
          options: draft.complements.map((complement, index) => ({
            name: complement.name,
            description: "Complemento opcional",
            price: complement.price,
            sortOrder: index + 1
          }))
        }
      : null
  ].filter(Boolean) as NonNullable<Parameters<typeof menuService.createProduct>[0]["optionGroups"]>;
}

function toCategoryPayload(draft: CategoryDraft) {
  return {
    name: draft.name.trim(),
    description: draft.description,
    imageUrl: draft.imageUrl,
    status: draft.status === "OUT_OF_STOCK" ? "INACTIVE" : draft.status
  };
}

function toProductPayload(draft: ProductDraft) {
  return {
    categoryId: draft.categoryId,
    name: draft.name.trim(),
    description: draft.description,
    sku: draft.sku,
    imageUrl: draft.imageUrl,
    imageUpload: draft.imageUpload,
    basePrice: draft.basePrice,
    promotionalPrice: draft.promotionalPrice,
    costPrice: draft.costPrice,
    preparationTime: draft.preparationTime,
    status: draft.status,
    isFeatured: draft.isFeatured,
    stockQuantity: draft.stockQuantity,
    optionGroups: buildOptionGroups(draft)
  };
}

export function CatalogProvider({ children }: PropsWithChildren) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productAvailability, setProductAvailability] = useState<ProductAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyCatalog = useCallback((catalog: { categories: MenuCategory[]; products: Product[]; productAvailability: ProductAvailability[] }) => {
    setCategories(uniqueCategories(catalog.categories));
    setProducts(catalog.products);
    setProductAvailability(catalog.productAvailability);
  }, []);

  const refreshPublicCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      applyCatalog(await menuService.getPublicMenu());
    } catch {
      setError("Nao foi possivel carregar o cardapio.");
    } finally {
      setLoading(false);
    }
  }, [applyCatalog]);

  const refreshAdminCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      applyCatalog(await menuService.getAdminMenu());
    } catch {
      setError("Nao foi possivel carregar o catalogo administrativo.");
    } finally {
      setLoading(false);
    }
  }, [applyCatalog]);

  useEffect(() => {
    void refreshPublicCatalog();
  }, [refreshPublicCatalog]);

  const value = useMemo<CatalogContextValue>(() => {
    const getProductStock = (productId: string) =>
      productAvailability.find((availability) => availability.productId === productId)?.stockQuantity ?? 0;

    const publicCategories = categories
      .filter((category) => category.status === "ACTIVE")
      .filter((category) =>
        products.some((product) => product.categoryId === category.id && product.status !== "INACTIVE" && product.status !== "ARCHIVED")
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const publicCategoryIds = new Set(publicCategories.map((category) => category.id));
    const publicProducts = products
      .filter((product) => publicCategoryIds.has(product.categoryId))
      .filter((product) => product.status === "ACTIVE" || product.status === "OUT_OF_STOCK")
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      categories,
      products,
      productAvailability,
      publicCategories,
      publicProducts,
      loading,
      error,
      refreshPublicCatalog,
      refreshAdminCatalog,
      getProductStock,
      createCategory: async (draft) => {
        await menuService.createCategory(toCategoryPayload(draft));
        await refreshAdminCatalog();
      },
      updateCategory: async (categoryId, draft) => {
        await menuService.updateCategory(categoryId, toCategoryPayload(draft));
        await refreshAdminCatalog();
      },
      deleteCategory: async (categoryId) => {
        await menuService.deleteCategory(categoryId);
        await refreshAdminCatalog();
      },
      createProduct: async (draft) => {
        await menuService.createProduct(toProductPayload(draft));
        await refreshAdminCatalog();
      },
      updateProduct: async (productId, draft) => {
        await menuService.updateProduct(productId, toProductPayload(draft));
        await refreshAdminCatalog();
      },
      deleteProduct: async (productId) => {
        await menuService.deleteProduct(productId);
        await refreshAdminCatalog();
      },
      decrementStock: (productId, quantity) => {
        const currentStock = productAvailability.find((availability) => availability.productId === productId)?.stockQuantity ?? 0;
        const nextStock = Math.max(0, currentStock - quantity);

        setProductAvailability((current) =>
          current.map((availability) =>
            availability.productId === productId
              ? {
                  ...availability,
                  isAvailable: nextStock > 0,
                  stockQuantity: nextStock,
                  updatedAt: new Date().toISOString()
                }
              : availability
          )
        );

        setProducts((current) =>
          current.map((product) =>
            product.id === productId && product.status === "ACTIVE" && nextStock <= 0 ? { ...product, status: "OUT_OF_STOCK" } : product
          )
        );
      }
    };
  }, [categories, error, loading, productAvailability, products, refreshAdminCatalog, refreshPublicCatalog]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);

  if (!context) {
    throw new Error("useCatalog must be used inside CatalogProvider");
  }

  return context;
}
