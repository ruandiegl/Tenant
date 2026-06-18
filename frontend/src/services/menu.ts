import { MenuCategory, Product, ProductAvailability } from "../types/database";
import { api, protectedApi } from "./api";

const TENANT_SLUG = import.meta.env.VITE_DEMO_TENANT_SLUG ?? "demo-burger";

type BackendOptionGroup = Omit<Product["optionGroups"][number], "items"> & {
  options?: Product["optionGroups"][number]["items"];
  items?: Product["optionGroups"][number]["items"];
};

type BackendProduct = Omit<Product, "optionGroups"> & {
  optionGroups?: BackendOptionGroup[];
  availability?: ProductAvailability[];
};

type PublicMenuResponse = {
  categories: Array<MenuCategory & { products?: BackendProduct[] }>;
};

type CategoryPayload = {
  name: string;
  description?: string;
  imageUrl?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
};

type ProductPayload = {
  categoryId: string;
  name: string;
  description?: string;
  sku?: string;
  imageUrl?: string;
  basePrice: number;
  promotionalPrice?: number;
  costPrice?: number;
  preparationTime?: number;
  status?: Product["status"];
  isFeatured?: boolean;
  stockQuantity?: number;
  optionGroups?: Array<{
    name: string;
    minSelection?: number;
    maxSelection?: number;
    required?: boolean;
    sortOrder?: number;
    options?: Array<{ name: string; description?: string; price?: number; sortOrder?: number }>;
  }>;
};

function optionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function mapProduct(product: BackendProduct): Product {
  return {
    ...product,
    basePrice: Number(product.basePrice),
    promotionalPrice: product.promotionalPrice === undefined || product.promotionalPrice === null ? undefined : Number(product.promotionalPrice),
    costPrice: product.costPrice === undefined || product.costPrice === null ? undefined : Number(product.costPrice),
    description: product.description ?? "",
    sku: product.sku ?? "",
    imageUrl:
      product.imageUrl ||
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    preparationTime: product.preparationTime ?? 20,
    optionGroups:
      product.optionGroups?.map((group) => ({
        ...group,
        status: group.status ?? "ACTIVE",
        items: (group.options ?? group.items ?? []).map((option) => ({
          ...option,
          price: Number(option.price),
          description: option.description ?? "",
          status: option.status ?? "ACTIVE"
        }))
      })) ?? []
  };
}

function mapCategory(category: MenuCategory): MenuCategory {
  return {
    ...category,
    branchId: category.branchId ?? "",
    description: category.description ?? "",
    imageUrl: category.imageUrl ?? "",
    status: category.status ?? "ACTIVE"
  };
}

function mapAvailability(availability: ProductAvailability, product: BackendProduct): ProductAvailability {
  return {
    ...availability,
    branchId: availability.branchId ?? "",
    isAvailable: availability.isAvailable ?? product.status === "ACTIVE",
    stockQuantity: availability.stockQuantity === undefined || availability.stockQuantity === null ? null : Number(availability.stockQuantity)
  };
}

function flattenPublicMenu(data: PublicMenuResponse) {
  const categories = data.categories.map(mapCategory);
  const backendProducts = data.categories.flatMap((category) => category.products ?? []);
  const products = backendProducts.map(mapProduct);
  const productAvailability = backendProducts.flatMap((product) =>
    product.availability?.map((availability) => mapAvailability(availability, product)) ?? [
      {
        id: `availability_${product.id}`,
        tenantId: product.tenantId,
        productId: product.id,
        branchId: "",
        isAvailable: product.status === "ACTIVE",
        stockQuantity: product.status === "OUT_OF_STOCK" ? 0 : 999
      }
    ]
  );

  return { categories, products, productAvailability };
}

export const menuService = {
  getPublicMenu: async () => {
    return flattenPublicMenu(await api<PublicMenuResponse>(`/public/${TENANT_SLUG}/menu`));
  },
  getAdminMenu: async () => {
    const [categories, products] = await Promise.all([
      protectedApi<MenuCategory[]>("/tenant/menu/categories"),
      protectedApi<BackendProduct[]>("/tenant/menu/products")
    ]);

    const mappedProducts = products.map(mapProduct);

    return {
      categories: categories.map(mapCategory),
      products: mappedProducts,
      productAvailability: products.flatMap((product) => product.availability?.map((availability) => mapAvailability(availability, product)) ?? [])
    };
  },
  createCategory: (payload: CategoryPayload) =>
    protectedApi<MenuCategory>("/tenant/menu/categories", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        description: optionalText(payload.description),
        imageUrl: optionalText(payload.imageUrl),
        status: payload.status
      })
    }),
  updateCategory: (categoryId: string, payload: CategoryPayload) =>
    protectedApi<MenuCategory>(`/tenant/menu/categories/${categoryId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: payload.name,
        description: optionalText(payload.description),
        imageUrl: optionalText(payload.imageUrl),
        status: payload.status
      })
    }),
  deleteCategory: (categoryId: string) =>
    protectedApi<MenuCategory>(`/tenant/menu/categories/${categoryId}`, {
      method: "DELETE"
    }),
  createProduct: (payload: ProductPayload) =>
    protectedApi<BackendProduct>("/tenant/menu/products", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        description: optionalText(payload.description),
        sku: optionalText(payload.sku),
        imageUrl: optionalText(payload.imageUrl)
      })
    }),
  updateProduct: (productId: string, payload: ProductPayload) =>
    protectedApi<BackendProduct>(`/tenant/menu/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...payload,
        description: optionalText(payload.description),
        sku: optionalText(payload.sku),
        imageUrl: optionalText(payload.imageUrl)
      })
    }),
  deleteProduct: (productId: string) =>
    protectedApi<BackendProduct>(`/tenant/menu/products/${productId}`, {
      method: "DELETE"
    })
};
