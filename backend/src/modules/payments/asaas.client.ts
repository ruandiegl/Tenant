import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

type AsaasCustomerResponse = {
  id: string;
  name: string;
};

type AsaasPaymentResponse = {
  id: string;
  customer: string;
  value: number;
  netValue?: number;
  billingType: string;
  status: string;
  dueDate: string;
  invoiceUrl?: string | null;
};

type AsaasPixQrCodeResponse = {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
};

function assertAsaasConfigured() {
  if (!env.ASAAS_API_KEY) {
    throw new AppError("Integracao Asaas indisponivel no ambiente atual.", 503);
  }
}

async function request<T>(path: string, options: RequestOptions = {}) {
  assertAsaasConfigured();

  const response = await fetch(`${env.ASAAS_API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      accept: "application/json",
      access_token: env.ASAAS_API_KEY!,
      ...(options.body ? { "content-type": "application/json" } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    let message = `Asaas error ${response.status}`;

    try {
      const data = (await response.json()) as { errors?: Array<{ description?: string }> };
      message = data.errors?.map((error) => error.description).filter(Boolean).join("; ") || message;
    } catch {
      // Keep generic message when the provider does not return JSON.
    }

    throw new AppError(message, response.status === 401 ? 502 : 400);
  }

  return response.json() as Promise<T>;
}

export const asaasClient = {
  createCustomer: (payload: {
    name: string;
    mobilePhone?: string;
    email?: string;
    externalReference?: string;
    notificationDisabled?: boolean;
  }) => request<AsaasCustomerResponse>("/v3/customers", { method: "POST", body: payload }),
  createPixPayment: (payload: {
    customer: string;
    billingType: "PIX";
    value: number;
    dueDate: string;
    description?: string;
    externalReference?: string;
  }) => request<AsaasPaymentResponse>("/v3/payments", { method: "POST", body: payload }),
  getPixQrCode: (paymentId: string) => request<AsaasPixQrCodeResponse>(`/v3/payments/${paymentId}/pixQrCode`)
};
