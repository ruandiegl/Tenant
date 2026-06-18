import {
  branches,
  cart,
  categories,
  coupons,
  kitchenTickets,
  orders,
  productAvailability,
  products,
  reportSummary
} from "../data/mock";
import { OrderStatus } from "../types/database";

const wait = (ms = 160) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const mockApi = {
  async getPublicMenu() {
    await wait();
    return { categories, products, productAvailability };
  },

  async getCart() {
    await wait();
    return cart;
  },

  async getOrders() {
    await wait();
    return orders;
  },

  async getOrderByPublicCode(publicCode: string) {
    await wait();
    return orders.find((order) => order.publicCode === publicCode) ?? orders[0];
  },

  async getKitchenQueue() {
    await wait();
    return kitchenTickets.map((ticket) => ({
      ticket,
      order: orders.find((order) => order.id === ticket.orderId)!
    }));
  },

  async getAdminSummary() {
    await wait();
    return reportSummary;
  },

  async getTenantAdminBundle() {
    await wait();
    return { branches, coupons };
  },

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    await wait(90);
    return { orderId, status };
  }
};
