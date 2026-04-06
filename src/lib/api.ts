import { auth } from "@/lib/firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getToken(): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      body.error || body.message || `Erro ${response.status}`,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
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
