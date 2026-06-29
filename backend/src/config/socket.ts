import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { corsOrigin } from "./cors.js";
import { verifyAccessToken } from "./jwt.js";

let io: Server | undefined;

export const configureSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token ?? socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return next();
    }

    try {
      socket.data.auth = verifyAccessToken(token);
      return next();
    } catch {
      return next(new Error("Invalid socket token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("tenant.subscribe", ({ tenantId }: { tenantId: string }) => {
      if (socket.data.auth?.tenantId === tenantId) {
        socket.join(`tenant:${tenantId}`);
      }
    });

    socket.on("kitchen.subscribe", ({ tenantId, branchId }: { tenantId: string; branchId: string }) => {
      if (socket.data.auth?.tenantId === tenantId) {
        socket.join(`kitchen:${branchId}`);
        socket.join(`branch:${branchId}`);
      }
    });

    socket.on("order.subscribe", ({ orderId, tenantId }: { orderId: string; tenantId?: string }) => {
      if (!tenantId || socket.data.auth?.tenantId === tenantId) {
        socket.join(`order:${orderId}`);
      }
    });

    socket.on("order.unsubscribe", ({ orderId }: { orderId: string }) => {
      socket.leave(`order:${orderId}`);
    });
  });

  return io;
};

export const getSocketServer = () => io;
