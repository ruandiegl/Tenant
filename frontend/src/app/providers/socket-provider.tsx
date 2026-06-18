import { createContext, PropsWithChildren, useContext } from "react";

type SocketEvent =
  | "order.created"
  | "order.accepted"
  | "order.status_changed"
  | "kitchen.order_queued"
  | "kitchen.order_started"
  | "kitchen.order_ready"
  | "notification.created";

type SocketContextValue = {
  connected: boolean;
  lastEvent: SocketEvent;
  emit: (event: SocketEvent, payload: unknown) => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: PropsWithChildren) {
  const value: SocketContextValue = {
    connected: true,
    lastEvent: "order.status_changed",
    emit: (event, payload) => {
      console.info("[mock-socket]", event, payload);
    }
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used inside SocketProvider");
  }

  return context;
}
