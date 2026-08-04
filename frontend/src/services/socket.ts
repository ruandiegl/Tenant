import { io } from "socket.io-client";
import { getApiBaseUrl } from "./api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? getApiBaseUrl();

export function createSocket(token?: string) {
  return io(SOCKET_URL, {
    autoConnect: false,
    auth: token ? { token } : undefined
  });
}
