import { KitchenTicket, Order } from "../types/database";
import { protectedApi } from "./api";

type BackendKitchenTicket = KitchenTicket & {
  order: Order;
};

export const kitchenService = {
  getQueue: async () => {
    const tickets = await protectedApi<BackendKitchenTicket[]>("/tenant/kitchen/orders");

    return tickets.map((ticket) => ({
      ticket: {
        ...ticket,
        station: ticket.station ?? "Geral"
      },
      order: {
        ...ticket.order,
        subtotal: Number(ticket.order.subtotal),
        discountTotal: Number(ticket.order.discountTotal),
        deliveryFee: Number(ticket.order.deliveryFee),
        serviceFee: Number(ticket.order.serviceFee),
        taxTotal: Number(ticket.order.taxTotal),
        total: Number(ticket.order.total),
        history: ticket.order.history ?? []
      }
    }));
  }
};
