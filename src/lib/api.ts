import { auth } from "@/lib/firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const API_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Reporta erro de API para o sistema de monitoramento (fire-and-forget).
 */
function reportarErroApi(endpoint: string, method: string, status: number, message: string): void {
  try {
    const payload = {
      origem: "frontend",
      severidade: status >= 500 ? "error" : "warning",
      mensagem: `[API ${method} ${endpoint}] ${message}`,
      url_requisicao: `${API_URL}${endpoint}`,
      metodo_http: method,
      status_http: status,
      modulo: "api-interceptor",
      user_agent: navigator.userAgent,
    };
    navigator.sendBeacon?.(
      "/api/log-erro",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );
  } catch {
    // best-effort
  }
}

async function getToken(forceRefresh = false): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken(forceRefresh)) ?? null;
  } catch {
    return null;
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const token = await getToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    // Token expirado — tentar refresh uma única vez e reenviar
    if (response.status === 401 && token && !_isRetry) {
      const freshToken = await getToken(true);
      if (freshToken && freshToken !== token) {
        clearTimeout(timeoutId);
        return apiRequest<T>(endpoint, options, true);
      }
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const errorMsg = body.error || body.message || `Erro ${response.status}`;
      // Reportar erros 5xx ao monitoramento
      if (response.status >= 500) {
        reportarErroApi(endpoint, options.method || "GET", response.status, errorMsg);
      }
      throw new ApiError(
        response.status,
        errorMsg,
      );
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(0, "Tempo limite da requisição excedido. Tente novamente.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get: <T = unknown>(url: string) => apiRequest<T>(url),

  post: <T = unknown>(url: string, body?: unknown) =>
    apiRequest<T>(url, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(url: string, body?: unknown) =>
    apiRequest<T>(url, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(url: string) =>
    apiRequest<T>(url, { method: "DELETE" }),

  upload: async <T = unknown>(url: string, formData: FormData) => {
    const token = await getToken();
    const response = await fetch(`${API_URL}${url}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(response.status, body.error || `Erro ${response.status}`);
    }
    return response.json() as Promise<T>;
  },
};
