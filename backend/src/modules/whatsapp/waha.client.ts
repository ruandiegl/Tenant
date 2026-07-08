import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/app-error.js";

type WahaRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  acceptText?: boolean;
  timeoutMs?: number;
};

export type WahaErrorCode =
  | "WAHA_UNREACHABLE"
  | "WAHA_UNAUTHORIZED"
  | "WAHA_SESSION_NOT_FOUND"
  | "WAHA_SESSION_NOT_READY"
  | "WAHA_SEND_REJECTED";

type WahaRequestResult<T> = {
  data: T;
  status: number;
  durationMs: number;
};

export const wahaBaseUrl = () => env.WAHA_BASE_URL.replace(/\/$/, "");

const wahaErrorCodeForStatus = (status: number, message: string): WahaErrorCode => {
  const lower = message.toLowerCase();

  if (status === 401 || status === 403) return "WAHA_UNAUTHORIZED";
  if (status === 404 || lower.includes("session not found")) return "WAHA_SESSION_NOT_FOUND";
  if (status === 409 || lower.includes("not ready") || lower.includes("not as expected")) return "WAHA_SESSION_NOT_READY";

  return "WAHA_SEND_REJECTED";
};

const requestUrl = (path: string) => `${wahaBaseUrl()}${path}`;

export async function wahaRequest<T>(path: string, options: WahaRequestOptions = {}): Promise<T> {
  return (await wahaRequestWithMeta<T>(path, options)).data;
}

export async function wahaRequestWithMeta<T>(path: string, options: WahaRequestOptions = {}): Promise<WahaRequestResult<T>> {
  let response: Response;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? env.WAHA_REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(requestUrl(path), {
      method: options.method ?? "GET",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(env.WAHA_API_KEY ? { "X-Api-Key": env.WAHA_API_KEY } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    throw new AppError(
      isTimeout
        ? `Tempo esgotado ao conectar ao WAHA em ${env.WAHA_BASE_URL}. Verifique rede, porta e WAHA_BASE_URL.`
        : `Nao foi possivel conectar ao WAHA em ${env.WAHA_BASE_URL}. Verifique se o container esta rodando e se WAHA_BASE_URL esta correto.`,
      502,
      {
        code: "WAHA_UNREACHABLE",
        cause: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
        path
      }
    );
  } finally {
    clearTimeout(timeout);
  }

  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new AppError(message || `WAHA request failed with status ${response.status}`, 502, {
      code: wahaErrorCodeForStatus(response.status, message),
      wahaStatus: response.status,
      durationMs,
      path
    });
  }

  if (options.acceptText) {
    return { data: (await response.text()) as T, status: response.status, durationMs };
  }

  if (response.status === 204) {
    return { data: undefined as T, status: response.status, durationMs };
  }

  const text = await response.text();

  if (!text) {
    return { data: undefined as T, status: response.status, durationMs };
  }

  return { data: JSON.parse(text) as T, status: response.status, durationMs };
}

export async function wahaQrRequest(path: string, method: "GET" | "POST" = "GET") {
  let response: Response;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.WAHA_REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(requestUrl(path), {
      method,
      headers: {
        ...(env.WAHA_API_KEY ? { "X-Api-Key": env.WAHA_API_KEY } : {})
      },
      signal: controller.signal
    });
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    throw new AppError(
      isTimeout
        ? `Tempo esgotado ao conectar ao WAHA em ${env.WAHA_BASE_URL}. Verifique rede, porta e WAHA_BASE_URL.`
        : `Nao foi possivel conectar ao WAHA em ${env.WAHA_BASE_URL}. Verifique se o container esta rodando e se WAHA_BASE_URL esta correto.`,
      502,
      {
        code: "WAHA_UNREACHABLE",
        cause: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
        path
      }
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new AppError(message || `WAHA QR request failed with status ${response.status}`, 502, {
      code: wahaErrorCodeForStatus(response.status, message),
      wahaStatus: response.status,
      durationMs: Date.now() - startedAt,
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
