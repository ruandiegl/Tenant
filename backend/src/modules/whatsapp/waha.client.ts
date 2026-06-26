import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";

type WahaRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  acceptText?: boolean;
};

const baseUrl = () => env.WAHA_BASE_URL.replace(/\/$/, "");

export async function wahaRequest<T>(path: string, options: WahaRequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(env.WAHA_API_KEY ? { "X-Api-Key": env.WAHA_API_KEY } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch (error) {
    throw new AppError(
      `Nao foi possivel conectar ao WAHA em ${env.WAHA_BASE_URL}. Verifique se o container esta rodando e se WAHA_BASE_URL esta correto.`,
      502,
      { cause: error instanceof Error ? error.message : String(error), path }
    );
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new AppError(message || `WAHA request failed with status ${response.status}`, 502, {
      wahaStatus: response.status,
      path
    });
  }

  if (options.acceptText) {
    return response.text() as Promise<T>;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function wahaQrRequest(path: string, method: "GET" | "POST" = "GET") {
  let response: Response;

  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        ...(env.WAHA_API_KEY ? { "X-Api-Key": env.WAHA_API_KEY } : {})
      }
    });
  } catch (error) {
    throw new AppError(
      `Nao foi possivel conectar ao WAHA em ${env.WAHA_BASE_URL}. Verifique se o container esta rodando e se WAHA_BASE_URL esta correto.`,
      502,
      { cause: error instanceof Error ? error.message : String(error), path }
    );
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new AppError(message || `WAHA QR request failed with status ${response.status}`, 502, {
      wahaStatus: response.status,
      path
    });
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json() as Promise<unknown>;
  }

  if (contentType.startsWith("image/")) {
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  }

  return response.text();
}
