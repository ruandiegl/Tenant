import type { KitchenTicketStatus } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { getSocketServer } from "../../config/socket.js";
import { AppError } from "../../shared/errors/app-error.js";
import { updateOrderStatus } from "../orders/orders.service.js";

export const listKitchenOrders = (tenantId: string, branchId?: string, status?: KitchenTicketStatus) => {
  return prisma.kitchenTicket.findMany({
    where: { tenantId, branchId, status },
    include: {
      order: { include: { items: { include: { options: true } } } },
      branch: true
    },
    orderBy: [{ priority: "desc" }, { queuedAt: "asc" }]
  });
};

export const updateKitchenStatus = async (
  tenantId: string,
  ticketId: string,
  status: KitchenTicketStatus,
  userId?: string,
  reason?: string
) => {
  const ticket = await prisma.kitchenTicket.findFirst({ where: { id: ticketId, tenantId } });

  if (!ticket) {
    throw new AppError("Kitchen ticket not found", 404);
  }

  const orderStatus = status === "STARTED" ? "PREPARING" : status === "READY" ? "READY" : status === "CANCELLED" ? "CANCELLED" : undefined;
  const updatedOrder = orderStatus ? await updateOrderStatus(tenantId, ticket.orderId, orderStatus, userId, reason) : null;

  const updatedTicket = await prisma.kitchenTicket.update({
    where: { id: ticketId },
    data: {
      status,
      startedAt: status === "STARTED" ? new Date() : undefined,
      readyAt: status === "READY" ? new Date() : undefined
    },
    include: { order: true }
  });

  const event =
    status === "STARTED" ? "kitchen.order_started" : status === "READY" ? "kitchen.order_ready" : "order.status_changed";

  getSocketServer()?.to(`kitchen:${ticket.branchId}`).to(`order:${ticket.orderId}`).emit(event, updatedOrder ?? updatedTicket);

  return updatedTicket;
};
