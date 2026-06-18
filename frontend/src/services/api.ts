const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333";
const DEMO_TENANT_SLUG = import.meta.env.VITE_DEMO_TENANT_SLUG ?? "demo-burger";
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL ?? "admin@demo.local";
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? "admin123";

type LoginResponse = {
  token: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
};

let tokenMemory: string | null = window.localStorage.getItem("podepedir.token");
let tenantIdMemory: string | null = window.localStorage.getItem("podepedir.tenantId");

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAuthToken() {
  return tokenMemory;
}

export function getTenantId() {
  return tenantIdMemory;
}

export function setSession(token: string, tenantId: string) {
  tokenMemory = token;
  tenantIdMemory = tenantId;
  window.localStorage.setItem("podepedir.token", token);
  window.localStorage.setItem("podepedir.tenantId", tenantId);
}

export function clearSession() {
  tokenMemory = null;
  tenantIdMemory = null;
  window.localStorage.removeItem("podepedir.token");
  window.localStorage.removeItem("podepedir.tenantId");
}

export async function loginRequest(credentials?: { email: string; password: string; tenantSlug: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: credentials?.email ?? DEMO_EMAIL,
      password: credentials?.password ?? DEMO_PASSWORD,
      tenantSlug: credentials?.tenantSlug ?? DEMO_TENANT_SLUG
    })
  });

  if (!response.ok) {
    throw new Error(`Login error ${response.status}`);
  }

  const data = (await response.json()) as LoginResponse;
  setSession(data.token, data.tenant.id);

  return data;
}

export async function ensureSession() {
  if (tokenMemory && tenantIdMemory) {
    return { token: tokenMemory, tenantId: tenantIdMemory };
  }

  throw new Error("Authentication required");
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    let message = `API error ${response.status}`;

    try {
      const data = await response.json();
      const fieldErrors = data?.errors?.fieldErrors
        ? Object.entries(data.errors.fieldErrors)
            .flatMap(([field, errors]) => (Array.isArray(errors) ? errors.map((error) => `${field}: ${error}`) : []))
            .join("; ")
        : "";

      message = fieldErrors || data?.message || message;
    } catch {
      // Keep the generic status message when the response is not JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function protectedApi<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await ensureSession();

  return api<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.token}`,
      "x-tenant-id": session.tenantId,
      ...(init?.headers ?? {})
    }
  });
}
