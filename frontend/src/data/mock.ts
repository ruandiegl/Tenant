import {
  Address,
  Branch,
  Cart,
  Coupon,
  KitchenTicket,
  MenuCategory,
  Order,
  Product,
  ProductAvailability,
  ReportSummary,
  Tenant,
  TenantSettings,
  TenantUser
} from "../types/database";

const now = new Date("2026-06-18T12:00:00-03:00").toISOString();

export const tenant: Tenant = {
  id: "tenant_claro_bistro",
  name: "Claro Bistro",
  slug: "claro-bistro",
  document: "12.345.678/0001-90",
  email: "operacao@clarobistro.com",
  phone: "+55 11 98888-1000",
  status: "TRIAL",
  planId: "plan_growth",
  settingsId: "settings_claro",
  createdAt: now,
  updatedAt: now
};

export const tenantSettings: TenantSettings = {
  tenantId: tenant.id,
  brandName: "Claro Bistro",
  logoUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=500&q=80",
  primaryColor: "#176b5b",
  timezone: "America/Sao_Paulo",
  currency: "BRL",
  allowGuestCheckout: true,
  autoAcceptOrders: false,
  defaultPreparationTime: 28,
  minimumOrderValue: 32
};

export const mockTenantBundle = {
  tenant,
  settings: tenantSettings
};

export const addresses: Address[] = [
  {
    id: "addr_branch_pinheiros",
    tenantId: tenant.id,
    street: "Rua dos Pinheiros",
    number: "642",
    district: "Pinheiros",
    city: "Sao Paulo",
    state: "SP",
    postalCode: "05422-001",
    country: "BR",
    reference: "Ao lado da praca"
  },
  {
    id: "addr_customer_lia",
    tenantId: tenant.id,
    customerId: "customer_lia",
    street: "Rua Harmonia",
    number: "140",
    complement: "Apto 52",
    district: "Vila Madalena",
    city: "Sao Paulo",
    state: "SP",
    postalCode: "05435-000",
    country: "BR"
  }
];

export const branches: Branch[] = [
  {
    id: "branch_pinheiros",
    tenantId: tenant.id,
    name: "Pinheiros",
    slug: "pinheiros",
    email: "pinheiros@clarobistro.com",
    phone: "+55 11 97777-2000",
    status: "ACTIVE",
    addressId: "addr_branch_pinheiros",
    acceptsDelivery: true,
    acceptsPickup: true,
    acceptsDineIn: true
  }
];

export const mockSession: TenantUser = {
  id: "tenant_user_admin",
  tenantId: tenant.id,
  userId: "user_marina",
  roleId: "role_admin",
  branchId: "branch_pinheiros",
  status: "ACTIVE",
  name: "Marina Costa",
  email: "marina@clarobistro.com",
  roleName: "Admin do tenant",
  permissions: [
    "reports.read",
    "orders.manage",
    "menu.manage",
    "settings.manage",
    "kitchen.orders.manage"
  ]
};

export const categories: MenuCategory[] = [
  {
    id: "cat_bowls",
    tenantId: tenant.id,
    branchId: "branch_pinheiros",
    name: "Bowls",
    description: "Pratos completos para almoco e jantar.",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
    sortOrder: 1,
    status: "ACTIVE"
  },
  {
    id: "cat_bebidas",
    tenantId: tenant.id,
    branchId: "branch_pinheiros",
    name: "Bebidas",
    description: "Sucos, cafes e bebidas geladas.",
    imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80",
    sortOrder: 2,
    status: "ACTIVE"
  },
  {
    id: "cat_sobremesas",
    tenantId: tenant.id,
    branchId: "branch_pinheiros",
    name: "Sobremesas",
    description: "Doces artesanais com preparo rapido.",
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
    sortOrder: 3,
    status: "ACTIVE"
  },{
    id: "cat_sobremesas",
    tenantId: tenant.id,
    branchId: "branch_pinheiros",
    name: "Sobremesas",
    description: "Doces artesanais com preparo rapido.",
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
    sortOrder: 3,
    status: "ACTIVE"
  },{
    id: "cat_sobremesas",
    tenantId: tenant.id,
    branchId: "branch_pinheiros",
    name: "Sobremesas",
    description: "Doces artesanais com preparo rapido.",
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
    sortOrder: 3,
    status: "ACTIVE"
  },{
    id: "cat_sobremesas",
    tenantId: tenant.id,
    branchId: "branch_pinheiros",
    name: "Sobremesas",
    description: "Doces artesanais com preparo rapido.",
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
    sortOrder: 3,
    status: "ACTIVE"
  },{
    id: "cat_sobremesas",
    tenantId: tenant.id,
    branchId: "branch_pinheiros",
    name: "Sobremesas",
    description: "Doces artesanais com preparo rapido.",
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
    sortOrder: 3,
    status: "ACTIVE"
  }
];

export const products: Product[] = [
  {
    id: "prod_salmon_bowl",
    tenantId: tenant.id,
    categoryId: "cat_bowls",
    name: "Salmon Bowl",
    description: "Arroz japones, salmao selado, legumes, gergelim e molho da casa.",
    sku: "BOWL-SALMON",
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
    basePrice: 49.9,
    promotionalPrice: 44.9,
    costPrice: 21,
    preparationTime: 18,
    status: "ACTIVE",
    isFeatured: true,
    sortOrder: 1,
    optionGroups: [
      {
        id: "group_salmon_protein",
        tenantId: tenant.id,
        productId: "prod_salmon_bowl",
        name: "Ponto do salmao",
        minSelection: 1,
        maxSelection: 1,
        required: true,
        sortOrder: 1,
        status: "ACTIVE",
        items: [
          {
            id: "opt_selado",
            tenantId: tenant.id,
            optionGroupId: "group_salmon_protein",
            name: "Selado",
            price: 0,
            status: "ACTIVE",
            sortOrder: 1
          },
          {
            id: "opt_bem_passado",
            tenantId: tenant.id,
            optionGroupId: "group_salmon_protein",
            name: "Bem passado",
            price: 0,
            status: "ACTIVE",
            sortOrder: 2
          }
        ]
      },
      {
        id: "group_extras",
        tenantId: tenant.id,
        productId: "prod_salmon_bowl",
        name: "Extras",
        minSelection: 0,
        maxSelection: 3,
        required: false,
        sortOrder: 2,
        status: "ACTIVE",
        items: [
          {
            id: "opt_avocado",
            tenantId: tenant.id,
            optionGroupId: "group_extras",
            name: "Avocado",
            price: 6.5,
            status: "ACTIVE",
            sortOrder: 1
          },
          {
            id: "opt_shimeji",
            tenantId: tenant.id,
            optionGroupId: "group_extras",
            name: "Shimeji",
            price: 8,
            status: "ACTIVE",
            sortOrder: 2
          }
        ]
      }
    ]
  },
  {
    id: "prod_frango_lemon",
    tenantId: tenant.id,
    categoryId: "cat_bowls",
    name: "Frango Lemon Bowl",
    description: "Frango grelhado, quinoa, folhas, tomate assado e molho citrico.",
    sku: "BOWL-FRANGO",
    imageUrl: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=900&q=80",
    basePrice: 39.9,
    preparationTime: 16,
    status: "ACTIVE",
    isFeatured: false,
    sortOrder: 2,
    optionGroups: []
  },
  {
    id: "prod_suco_verde",
    tenantId: tenant.id,
    categoryId: "cat_bebidas",
    name: "Suco Verde",
    description: "Couve, maca, limao, gengibre e agua de coco.",
    sku: "DRINK-VERDE",
    imageUrl: "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=900&q=80",
    basePrice: 15.9,
    preparationTime: 5,
    status: "ACTIVE",
    isFeatured: true,
    sortOrder: 1,
    optionGroups: []
  },
  {
    id: "prod_cheesecake",
    tenantId: tenant.id,
    categoryId: "cat_sobremesas",
    name: "Cheesecake de Frutas",
    description: "Fatia cremosa com calda de frutas vermelhas.",
    sku: "DESSERT-CHEESE",
    imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=80",
    basePrice: 21.9,
    preparationTime: 4,
    status: "OUT_OF_STOCK",
    isFeatured: false,
    sortOrder: 1,
    optionGroups: []
  }
];

export const productAvailability: ProductAvailability[] = products.map((product) => ({
  id: `availability_${product.id}`,
  tenantId: tenant.id,
  productId: product.id,
  branchId: "branch_pinheiros",
  isAvailable: product.status === "ACTIVE",
  stockQuantity: product.status === "OUT_OF_STOCK" ? 0 : 18
}));

export const cart: Cart = {
  id: "cart_session_demo",
  tenantId: tenant.id,
  customerId: "customer_lia",
  sessionId: "session_guest_001",
  branchId: "branch_pinheiros",
  status: "ACTIVE",
  expiresAt: "2026-06-18T14:00:00-03:00",
  items: [
    {
      id: "cart_item_salmon",
      tenantId: tenant.id,
      cartId: "cart_session_demo",
      productId: "prod_salmon_bowl",
      productName: "Salmon Bowl",
      quantity: 1,
      unitPrice: 44.9,
      notes: "Sem cebola",
      options: [
        {
          id: "cart_item_option_avocado",
          tenantId: tenant.id,
          cartItemId: "cart_item_salmon",
          optionItemId: "opt_avocado",
          optionName: "Avocado",
          quantity: 1,
          unitPrice: 6.5
        }
      ]
    },
    {
      id: "cart_item_suco",
      tenantId: tenant.id,
      cartId: "cart_session_demo",
      productId: "prod_suco_verde",
      productName: "Suco Verde",
      quantity: 1,
      unitPrice: 15.9,
      options: []
    }
  ]
};

export const orders: Order[] = [
  {
    id: "order_1008",
    tenantId: tenant.id,
    branchId: "branch_pinheiros",
    customerId: "customer_lia",
    publicCode: "CB1008",
    type: "DELIVERY",
    status: "PREPARING",
    paymentStatus: "PAID",
    source: "WEB",
    subtotal: 67.3,
    discountTotal: 7,
    deliveryFee: 8,
    serviceFee: 0,
    taxTotal: 0,
    total: 68.3,
    couponId: "coupon_BEMVINDO",
    customerName: "Lia Rocha",
    customerPhone: "+55 11 96666-0101",
    deliveryAddressId: "addr_customer_lia",
    notes: "Interfone 52",
    estimatedReadyAt: "2026-06-18T12:35:00-03:00",
    acceptedAt: "2026-06-18T12:04:00-03:00",
    startedAt: "2026-06-18T12:12:00-03:00",
    createdAt: "2026-06-18T12:01:00-03:00",
    items: [
      {
        id: "order_item_salmon",
        tenantId: tenant.id,
        orderId: "order_1008",
        productId: "prod_salmon_bowl",
        productNameSnapshot: "Salmon Bowl",
        quantity: 1,
        unitPrice: 44.9,
        totalPrice: 51.4,
        notes: "Sem cebola",
        options: [
          {
            id: "order_item_option_avocado",
            tenantId: tenant.id,
            orderItemId: "order_item_salmon",
            optionItemId: "opt_avocado",
            optionNameSnapshot: "Avocado",
            quantity: 1,
            unitPrice: 6.5,
            totalPrice: 6.5
          }
        ]
      },
      {
        id: "order_item_suco",
        tenantId: tenant.id,
        orderId: "order_1008",
        productId: "prod_suco_verde",
        productNameSnapshot: "Suco Verde",
        quantity: 1,
        unitPrice: 15.9,
        totalPrice: 15.9,
        options: []
      }
    ],
    history: [
      {
        id: "hist_placed",
        tenantId: tenant.id,
        orderId: "order_1008",
        toStatus: "PLACED",
        createdAt: "2026-06-18T12:01:00-03:00"
      },
      {
        id: "hist_accepted",
        tenantId: tenant.id,
        orderId: "order_1008",
        fromStatus: "PLACED",
        toStatus: "ACCEPTED",
        changedByUserId: "user_marina",
        createdAt: "2026-06-18T12:04:00-03:00"
      },
      {
        id: "hist_preparing",
        tenantId: tenant.id,
        orderId: "order_1008",
        fromStatus: "ACCEPTED",
        toStatus: "PREPARING",
        changedByUserId: "user_marina",
        createdAt: "2026-06-18T12:12:00-03:00"
      }
    ]
  },
  {
    id: "order_1009",
    tenantId: tenant.id,
    branchId: "branch_pinheiros",
    publicCode: "CB1009",
    type: "PICKUP",
    status: "PLACED",
    paymentStatus: "PENDING",
    source: "WEB",
    subtotal: 39.9,
    discountTotal: 0,
    deliveryFee: 0,
    serviceFee: 0,
    taxTotal: 0,
    total: 39.9,
    customerName: "Rafael Lima",
    customerPhone: "+55 11 95555-2323",
    estimatedReadyAt: "2026-06-18T12:42:00-03:00",
    createdAt: "2026-06-18T12:18:00-03:00",
    items: [
      {
        id: "order_item_frango",
        tenantId: tenant.id,
        orderId: "order_1009",
        productId: "prod_frango_lemon",
        productNameSnapshot: "Frango Lemon Bowl",
        quantity: 1,
        unitPrice: 39.9,
        totalPrice: 39.9,
        options: []
      }
    ],
    history: [
      {
        id: "hist_placed_1009",
        tenantId: tenant.id,
        orderId: "order_1009",
        toStatus: "PLACED",
        createdAt: "2026-06-18T12:18:00-03:00"
      }
    ]
  }
];

export const kitchenTickets: KitchenTicket[] = [
  {
    id: "ticket_1008",
    tenantId: tenant.id,
    branchId: "branch_pinheiros",
    orderId: "order_1008",
    status: "STARTED",
    priority: "HIGH",
    station: "Quente",
    queuedAt: "2026-06-18T12:04:00-03:00",
    startedAt: "2026-06-18T12:12:00-03:00"
  },
  {
    id: "ticket_1009",
    tenantId: tenant.id,
    branchId: "branch_pinheiros",
    orderId: "order_1009",
    status: "QUEUED",
    priority: "NORMAL",
    station: "Grelha",
    queuedAt: "2026-06-18T12:18:00-03:00"
  }
];

export const coupons: Coupon[] = [
  {
    id: "coupon_BEMVINDO",
    tenantId: tenant.id,
    code: "BEMVINDO",
    description: "R$ 7 de desconto na primeira compra",
    discountType: "FIXED_AMOUNT",
    discountValue: 7,
    minimumOrderValue: 45,
    startsAt: "2026-06-01T00:00:00-03:00",
    endsAt: "2026-07-01T00:00:00-03:00",
    usageLimit: 500,
    usageLimitPerCustomer: 1,
    status: "ACTIVE"
  }
];

export const reportSummary: ReportSummary = {
  tenantId: tenant.id,
  branchId: "branch_pinheiros",
  ordersToday: 37,
  revenueToday: 2842.7,
  averageTicket: 76.83,
  averagePreparationMinutes: 21,
  ordersByStatus: {
    DRAFT: 0,
    PLACED: 6,
    ACCEPTED: 4,
    REJECTED: 1,
    PREPARING: 8,
    READY: 3,
    DISPATCHED: 5,
    DELIVERED: 4,
    COMPLETED: 5,
    CANCELLED: 1
  },
  topProducts: [
    { productId: "prod_salmon_bowl", name: "Salmon Bowl", quantity: 18, revenue: 808.2 },
    { productId: "prod_frango_lemon", name: "Frango Lemon Bowl", quantity: 12, revenue: 478.8 },
    { productId: "prod_suco_verde", name: "Suco Verde", quantity: 21, revenue: 333.9 }
  ]
};
