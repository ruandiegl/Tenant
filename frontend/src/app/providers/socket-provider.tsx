import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { getAuthToken } from "../../services/api";
import { createSocket } from "../../services/socket";
import { useAuth } from "./auth-provider";
import { useTenant } from "./tenant-provider";

type SocketEvent =
  | "order.created"
  | "order.accepted"
  | "order.status_changed"
  | "kitchen.order_queued"
  | "kitchen.order_started"
  | "kitchen.order_ready"
  | "notification.created"
  | "whatsapp.session_updated"
  | "whatsapp.qr_updated"
  | "whatsapp.message_received"
  | "whatsapp.message_deleted";

type SocketContextValue = {
  connected: boolean;
  lastEvent: SocketEvent;
  emit: (event: SocketEvent, payload: unknown) => void;
  on: (event: SocketEvent, handler: (payload: unknown) => void) => void;
  off: (event: SocketEvent, handler: (payload: unknown) => void) => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useAuth();
  const { tenant } = useTenant();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SocketEvent>("order.status_changed");

  useEffect(() => {
    const token = getAuthToken();

    if (!isAuthenticated || !token || !tenant.id) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket = createSocket(token);
    socketRef.current = socket;

    const handleConnect = () => {
      setConnected(true);
      socket.emit("tenant.subscribe", { tenantId: tenant.id });
    };
    const handleDisconnect = () => setConnected(false);
    const trackedEvents: SocketEvent[] = [
      "order.created",
      "order.accepted",
      "order.status_changed",
      "kitchen.order_queued",
      "kitchen.order_started",
      "kitchen.order_ready",
      "notification.created",
      "whatsapp.session_updated",
      "whatsapp.qr_updated",
      "whatsapp.message_received",
      "whatsapp.message_deleted"
    ];

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    trackedEvents.forEach((event) => socket.on(event, () => setLastEvent(event)));
    socket.connect();

    return () => {
      trackedEvents.forEach((event) => socket.off(event));
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated, tenant.id]);

  const emit = useCallback((event: SocketEvent, payload: unknown) => {
    socketRef.current?.emit(event, payload);
  }, []);

  const on = useCallback((event: SocketEvent, handler: (payload: unknown) => void) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event: SocketEvent, handler: (payload: unknown) => void) => {
    socketRef.current?.off(event, handler);
  }, []);

  const value = useMemo<SocketContextValue>(() => ({ connected, lastEvent, emit, on, off }), [connected, emit, lastEvent, off, on]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used inside SocketProvider");
  }

  return context;
}
