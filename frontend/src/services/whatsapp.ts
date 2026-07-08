import { WhatsappMessageTemplate, WhatsappSession } from "../types/database";
import { protectedApi } from "./api";

export const whatsappService = {
  getSession: () => protectedApi<WhatsappSession | null>("/tenant/whatsapp/session"),
  createOrStartSession: () =>
    protectedApi<WhatsappSession>("/tenant/whatsapp/session", {
      method: "POST"
    }),
  refreshQr: () =>
    protectedApi<WhatsappSession>("/tenant/whatsapp/session/qr", {
      method: "POST"
    }),
  stopSession: () =>
    protectedApi<WhatsappSession>("/tenant/whatsapp/session/stop", {
      method: "POST"
    }),
  updateSettings: (payload: {
    autoReplyEnabled?: boolean;
    notifyOrderStatus?: boolean;
    welcomeMessage?: string | null;
  }) =>
    protectedApi<WhatsappSession>("/tenant/whatsapp/session/settings", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  sendTestMessage: (payload: { phone: string; message: string }) =>
    protectedApi<{ sent: boolean }>("/tenant/whatsapp/messages/test", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deleteMessage: (id: string) =>
    protectedApi<void>(`/tenant/whatsapp/messages/${id}`, {
      method: "DELETE"
    }),
  listTemplates: () => protectedApi<WhatsappMessageTemplate[]>("/tenant/whatsapp/templates"),
  updateTemplate: (id: string, payload: { title?: string; body?: string; enabled?: boolean }) =>
    protectedApi<WhatsappMessageTemplate>(`/tenant/whatsapp/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteTemplate: (id: string) =>
    protectedApi<WhatsappMessageTemplate>(`/tenant/whatsapp/templates/${id}`, {
      method: "DELETE"
    })
};
