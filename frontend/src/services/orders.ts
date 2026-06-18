import { Order, OrderStatus } from "../types/database";
import { api } from "./api";
import { mockApi } from "./mock-api";

export const ordersService = {
  list: () => mockApi.getOrders(),
  getByPublicCode: (publicCode: string) => mockApi.getOrderByPublicCode(publicCode),
  updateStatus: (orderId: string, status: OrderStatus) =>
    api<Order>(`/tenant/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    })
};
