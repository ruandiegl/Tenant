export type TenantStatus = "ACTIVE" | "SUSPENDED" | "CANCELLED" | "TRIAL";
export type UserStatus = "ACTIVE" | "INVITED" | "SUSPENDED" | "DISABLED";
export type BranchStatus = "ACTIVE" | "INACTIVE" | "CLOSED_TEMPORARILY";
export type ProductStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";
export type OrderType = "DELIVERY" | "PICKUP" | "DINE_IN";
export type OrderStatus =
  | "DRAFT"
  | "PLACED"
  | "ACCEPTED"
  | "REJECTED"
  | "PREPARING"
  | "READY"
  | "DISPATCHED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";
export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CANCELLED";
export type PaymentType = "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "PIX" | "VOUCHER" | "ONLINE";
export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_DELIVERY";

export type BaseEntity = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type Tenant = BaseEntity & {
  name: string;
  slug: string;
  document?: string;
  email: string;
  phone: string;
  status: TenantStatus;
  planId: string;
  settingsId: string;
};

export type TenantSettings = {
  tenantId: string;
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  timezone: string;
  currency: string;
  allowGuestCheckout: boolean;
  autoAcceptOrders: boolean;
  defaultPreparationTime: number;
  minimumOrderValue: number;
};

export type Branch = BaseEntity & {
  tenantId: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  status: BranchStatus;
  addressId: string;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
  acceptsDineIn: boolean;
};

export type Address = BaseEntity & {
  tenantId: string;
  customerId?: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  reference?: string;
};

export type TenantUser = BaseEntity & {
  tenantId: string;
  userId: string;
  roleId: string;
  branchId?: string;
  status: UserStatus;
  name: string;
  email: string;
  roleName: string;
  permissions: string[];
};

export type Customer = BaseEntity & {
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  document?: string;
  status: UserStatus;
};

export type MenuCategory = BaseEntity & {
  tenantId: string;
  branchId: string;
  name: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  status: ProductStatus;
  availableFrom?: string;
  availableUntil?: string;
};

export type Product = BaseEntity & {
  tenantId: string;
  categoryId: string;
  name: string;
  description: string;
  sku: string;
  imageUrl: string;
  basePrice: number;
  promotionalPrice?: number;
  costPrice?: number;
  preparationTime: number;
  status: ProductStatus;
  isFeatured: boolean;
  sortOrder: number;
  optionGroups: OptionGroup[];
};

export type ProductAvailability = BaseEntity & {
  tenantId: string;
  productId: string;
  branchId: string;
  isAvailable: boolean;
  stockQuantity?: number | null;
};

export type OptionGroup = BaseEntity & {
  tenantId: string;
  productId: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  required: boolean;
  sortOrder: number;
  status: ProductStatus;
  items: OptionItem[];
};

export type OptionItem = BaseEntity & {
  tenantId: string;
  optionGroupId: string;
  name: string;
  description?: string;
  price: number;
  status: ProductStatus;
  sortOrder: number;
};

export type ProductTemplateItem = BaseEntity & {
  tenantId: string;
  templateId: string;
  type: "INGREDIENT" | "COMPLEMENT";
  name: string;
  description?: string;
  price: number;
  sortOrder: number;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
};

export type ProductTemplate = BaseEntity & {
  tenantId: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  sortOrder: number;
  items: ProductTemplateItem[];
};

export type Cart = BaseEntity & {
  tenantId: string;
  customerId?: string;
  sessionId: string;
  branchId: string;
  status: "ACTIVE" | "ORDERED" | "ABANDONED";
  expiresAt: string;
  items: CartItem[];
};

export type CartItem = BaseEntity & {
  tenantId: string;
  cartId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  options: CartItemOption[];
};

export type CartItemOption = BaseEntity & {
  tenantId: string;
  cartItemId: string;
  optionItemId: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
};

export type Order = BaseEntity & {
  tenantId: string;
  branchId: string;
  customerId?: string;
  publicCode: string;
  type: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  source: "WEB" | "ADMIN" | "WHATSAPP";
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  serviceFee: number;
  taxTotal: number;
  total: number;
  couponId?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddressId?: string;
  deliveryAddress?: Address;
  notes?: string;
  estimatedReadyAt: string;
  acceptedAt?: string;
  startedAt?: string;
  readyAt?: string;
  dispatchedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  items: OrderItem[];
  history: OrderStatusHistory[];
};

export type OrderItem = BaseEntity & {
  tenantId: string;
  orderId: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  options: OrderItemOption[];
};

export type OrderItemOption = BaseEntity & {
  tenantId: string;
  orderItemId: string;
  optionItemId: string;
  optionNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type OrderStatusHistory = BaseEntity & {
  tenantId: string;
  orderId: string;
  fromStatus?: OrderStatus;
  toStatus: OrderStatus;
  changedByUserId?: string;
  reason?: string;
};

export type KitchenTicket = BaseEntity & {
  tenantId: string;
  branchId: string;
  orderId: string;
  status: "QUEUED" | "STARTED" | "READY" | "DELAYED";
  priority: "LOW" | "NORMAL" | "HIGH";
  station: string;
  queuedAt: string;
  startedAt?: string;
  readyAt?: string;
  assignedToUserId?: string;
};

export type Coupon = BaseEntity & {
  tenantId: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountValue?: number;
  minimumOrderValue: number;
  startsAt: string;
  endsAt: string;
  usageLimit: number;
  usageLimitPerCustomer: number;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
};

export type ReportSummary = {
  tenantId: string;
  branchId: string;
  ordersToday: number;
  revenueToday: number;
  averageTicket: number;
  averagePreparationMinutes: number;
  openOrders: number;
  cancelledOrders: number;
  cancellationRate: number;
  ordersByStatus: Record<OrderStatus, number>;
  topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  ordersByType: Array<{ type: string; orders: number; revenue: number }>;
  paymentsByMethod: Array<{ method: string; count: number; revenue: number }>;
  hourlySales: Array<{ hour: number; orders: number; revenue: number }>;
};
