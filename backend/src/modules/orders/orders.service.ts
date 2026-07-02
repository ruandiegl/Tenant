import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { getSocketServer } from "../../config/socket.js";
import { AppError } from "../../shared/errors/app-error.js";
import { notifyOrderStatusChanged } from "../whatsapp/whatsapp.service.js";

const publicCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

type CreateOrderInput = {
  branchId: string;
  type: "DELIVERY" | "PICKUP" | "DINE_IN";
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  couponCode?: string;
  deliveryFee?: number;
  deliveryAddress?: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    postalCode: string;
    reference?: string;
  };
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string;
    options?: Array<{ optionItemId: string; quantity: number }>;
  }>;
};

const statusDateField = (status: OrderStatus) => {
  const now = new Date();
  const base = status !== "CANCELLED" && status !== "REJECTED" ? { cancelledAt: null, cancelReason: null } : {};

  if (status === "PLACED") {
    return { ...base, acceptedAt: null, startedAt: null, readyAt: null, dispatchedAt: null, completedAt: null };
  }

  if (status === "ACCEPTED") {
    return { ...base, acceptedAt: now, startedAt: null, readyAt: null, dispatchedAt: null, completedAt: null };
  }

  if (status === "PREPARING") {
    return { ...base, startedAt: now, readyAt: null, dispatchedAt: null, completedAt: null };
  }

  if (status === "READY") {
    return { ...base, readyAt: now, dispatchedAt: null, completedAt: null };
  }

  if (status === "DISPATCHED") {
    return { ...base, dispatchedAt: now, completedAt: null };
  }

  if (status === "DELIVERED" || status === "COMPLETED") {
    return { ...base, completedAt: now };
  }

  if (status === "CANCELLED" || status === "REJECTED") {
    return { cancelledAt: now };
  }

  return base;
};

const emitOrderEvent = (event: string, order: { id: string; tenantId: string; branchId: string }) => {
  const io = getSocketServer();

  if (!io) return;

  io.to(`tenant:${order.tenantId}`).to(`branch:${order.branchId}`).to(`order:${order.id}`).emit(event, order);

  if (event === "order.created") {
    io.to(`kitchen:${order.branchId}`).emit("kitchen.order_queued", order);
  }

  if (event === "order.status_changed") {
    io.to(`kitchen:${order.branchId}`).emit("kitchen.order_started", order);
  }
};

export const createPublicOrder = async (tenantSlug: string, data: CreateOrderInput) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, include: { settings: true } });

  if (!tenant || !["ACTIVE", "TRIAL"].includes(tenant.status)) {
    throw new AppError("Tenant not found or unavailable", 404);
  }

  const branch = await prisma.branch.findFirst({
    where: { id: data.branchId, tenantId: tenant.id, status: "ACTIVE", deletedAt: null }
  });

  if (!branch) {
    throw new AppError("Branch not found or unavailable", 404);
  }

  if (data.type === "DELIVERY" && !branch.acceptsDelivery) {
    throw new AppError("Branch does not accept delivery orders", 400);
  }

  if (data.type === "PICKUP" && !branch.acceptsPickup) {
    throw new AppError("Branch does not accept pickup orders", 400);
  }

  if (data.type === "DELIVERY" && !data.deliveryAddress) {
    throw new AppError("Delivery address is required for delivery orders", 400);
  }

  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      id: { in: data.items.map((item) => item.productId) },
      status: "ACTIVE",
      deletedAt: null
    },
    include: { optionGroups: { include: { options: true } }, availability: { where: { branchId: data.branchId } } }
  });

  if (products.length !== data.items.length) {
    throw new AppError("One or more products are unavailable", 400);
  }

  const coupon = data.couponCode
    ? await prisma.coupon.findFirst({
        where: { tenantId: tenant.id, code: data.couponCode.toUpperCase(), status: "ACTIVE" }
      })
    : null;

  const preparedItems = data.items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId)!;
    const availability = product.availability[0];

    if (availability && (!availability.isAvailable || (availability.stockQuantity !== null && availability.stockQuantity < item.quantity))) {
      throw new AppError(`Insufficient stock for product ${product.name}`, 400);
    }

    const unitPrice = product.promotionalPrice ?? product.basePrice;
    const options = item.options?.map((selectedOption) => {
      const option = product.optionGroups.flatMap((group) => group.options).find((entry) => entry.id === selectedOption.optionItemId);

      if (!option || option.status !== "ACTIVE") {
        throw new AppError(`Invalid option for product ${product.name}`, 400);
      }

      const totalPrice = option.price.mul(selectedOption.quantity);

      return {
        optionItemId: option.id,
        optionNameSnapshot: option.name,
        quantity: selectedOption.quantity,
        unitPrice: option.price,
        totalPrice
      };
    }) ?? [];
    const itemOptionsTotal = options.reduce((sum, option) => sum.add(option.totalPrice), new Prisma.Decimal(0));
    const totalPrice = unitPrice.mul(item.quantity).add(itemOptionsTotal);

    return {
      productId: product.id,
      productNameSnapshot: product.name,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      notes: item.notes,
      options
    };
  });

  const subtotal = preparedItems.reduce((sum, item) => sum.add(item.totalPrice), new Prisma.Decimal(0));
  const deliveryFee = new Prisma.Decimal(data.deliveryFee ?? 0);
  let discountTotal = new Prisma.Decimal(0);

  if (coupon) {
    if (coupon.discountType === "FREE_DELIVERY") {
      discountTotal = deliveryFee;
    } else if (coupon.discountType === "FIXED_AMOUNT") {
      discountTotal = Prisma.Decimal.min(coupon.discountValue, subtotal);
    } else {
      const percentage = coupon.discountValue.div(100);
      discountTotal = subtotal.mul(percentage);
      if (coupon.maxDiscountValue) {
        discountTotal = Prisma.Decimal.min(discountTotal, coupon.maxDiscountValue);
      }
    }
  }

  const total = subtotal.add(deliveryFee).sub(discountTotal);
  const code = publicCode();

  const order = await prisma.$transaction(async (tx) => {
    for (const item of preparedItems) {
      const availability = products.find((product) => product.id === item.productId)?.availability[0];

      if (availability?.stockQuantity !== null && availability?.stockQuantity !== undefined) {
        const result = await tx.productAvailability.updateMany({
          where: {
            tenantId: tenant.id,
            productId: item.productId,
            branchId: branch.id,
            stockQuantity: { gte: item.quantity }
          },
          data: {
            stockQuantity: { decrement: item.quantity },
            isAvailable: availability.stockQuantity - item.quantity > 0
          }
        });

        if (result.count === 0) {
          throw new AppError(`Insufficient stock for product ${item.productNameSnapshot}`, 400);
        }
      }
    }

    const customer = data.customerEmail || data.customerPhone
      ? await tx.customer.upsert({
          where: data.customerEmail
            ? { tenantId_email: { tenantId: tenant.id, email: data.customerEmail } }
            : { id: "never-match" },
          create: {
            tenantId: tenant.id,
            name: data.customerName,
            email: data.customerEmail,
            phone: data.customerPhone
          },
          update: {
            name: data.customerName,
            phone: data.customerPhone
          }
        }).catch(() => tx.customer.create({
          data: {
            tenantId: tenant.id,
            name: data.customerName,
            email: data.customerEmail,
            phone: data.customerPhone
          }
        }))
      : null;

    const address = data.deliveryAddress
      ? await tx.address.create({
          data: {
            tenantId: tenant.id,
            customerId: customer?.id,
            ...data.deliveryAddress
          }
        })
      : null;

    const created = await tx.order.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        customerId: customer?.id,
        publicCode: code,
        type: data.type,
        status: tenant.settings?.autoAcceptOrders ? "ACCEPTED" : "PLACED",
        paymentStatus: "PENDING",
        subtotal,
        deliveryFee,
        discountTotal,
        total,
        couponId: coupon?.id,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        deliveryAddressId: address?.id,
        notes: data.notes,
        estimatedReadyAt: new Date(Date.now() + (tenant.settings?.defaultPreparationTime ?? 30) * 60_000),
        items: {
          create: preparedItems.map((item) => ({
            tenantId: tenant.id,
            productId: item.productId,
            productNameSnapshot: item.productNameSnapshot,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
            options: {
              create: item.options.map((option) => ({
                tenantId: tenant.id,
                optionItemId: option.optionItemId,
                optionNameSnapshot: option.optionNameSnapshot,
                quantity: option.quantity,
                unitPrice: option.unitPrice,
                totalPrice: option.totalPrice
              }))
            }
          }))
        },
        histories: {
          create: {
            tenantId: tenant.id,
            fromStatus: null,
            toStatus: tenant.settings?.autoAcceptOrders ? "ACCEPTED" : "PLACED",
            reason: "Order created"
          }
        }
      },
      include: { items: { include: { options: true } }, deliveryAddress: true, kitchenTicket: true }
    });

    await tx.kitchenTicket.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        orderId: created.id,
        status: "QUEUED"
      }
    });

    if (coupon) {
      await tx.couponRedemption.create({
        data: {
          tenantId: tenant.id,
          couponId: coupon.id,
          customerId: customer?.id,
          orderId: created.id,
          discountAmount: discountTotal
        }
      });
    }

    return tx.order.findUniqueOrThrow({
      where: { id: created.id },
      include: { items: { include: { options: true } }, deliveryAddress: true, kitchenTicket: true }
    });
  });

  emitOrderEvent("order.created", order);
  void notifyOrderStatusChanged(tenant.id, order.id).catch(() => undefined);
  return order;
};

export const getPublicOrder = async (tenantSlug: string, publicCodeValue: string) => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });

  if (!tenant || !["ACTIVE", "TRIAL"].includes(tenant.status)) {
    throw new AppError("Tenant not found", 404);
  }

  const order = await prisma.order.findFirst({
    where: { tenantId: tenant.id, publicCode: publicCodeValue },
    include: { items: { include: { options: true } }, deliveryAddress: true, histories: { orderBy: { createdAt: "asc" } } }
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
};

export const listTenantOrders = (tenantId: string, branchId?: string, status?: OrderStatus, from?: string, to?: string) => {
  const createdAt = from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined;

  return prisma.order.findMany({
    where: { tenantId, branchId, status, createdAt },
    include: { items: { include: { options: true } }, kitchenTicket: true },
    orderBy: { createdAt: "desc" }
  });
};

export const getTenantOrder = async (tenantId: string, id: string) => {
  const order = await prisma.order.findFirst({
    where: { tenantId, id },
    include: { items: { include: { options: true } }, deliveryAddress: true, histories: true, kitchenTicket: true, payments: true }
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
};

export const updateOrderStatus = async (
  tenantId: string,
  id: string,
  status: OrderStatus,
  userId?: string,
  reason?: string
) => {
  const order = await prisma.order.findFirst({ where: { id, tenantId }, include: { kitchenTicket: true } });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextOrder = await tx.order.update({
      where: { id },
      data: {
        status,
        cancelReason: status === "CANCELLED" ? reason : undefined,
        ...statusDateField(status)
      },
      include: { items: { include: { options: true } }, kitchenTicket: true }
    });

    await tx.orderStatusHistory.create({
      data: {
        tenantId,
        orderId: id,
        fromStatus: order.status,
        toStatus: status,
        changedByUserId: userId,
        reason
      }
    });

    if (order.kitchenTicket) {
      const kitchenStatus =
        status === "PREPARING" ? "STARTED" : status === "READY" ? "READY" : status === "CANCELLED" ? "CANCELLED" : undefined;

      if (kitchenStatus) {
        await tx.kitchenTicket.update({
          where: { id: order.kitchenTicket.id },
          data: {
            status: kitchenStatus,
            startedAt: status === "PREPARING" ? new Date() : undefined,
            readyAt: status === "READY" ? new Date() : undefined
          }
        });
      }
    }

    return nextOrder;
  });

  emitOrderEvent(status === "CANCELLED" ? "order.cancelled" : "order.status_changed", updated);
  void notifyOrderStatusChanged(tenantId, updated.id).catch(() => undefined);
  return updated;
};
