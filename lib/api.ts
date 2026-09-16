export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type ApiRequestError = Error & { status?: number };

export function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
}

async function refreshAccessToken() {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return false;

  const data = await response.json();
  localStorage.setItem("access_token", data.access_token);
  return true;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, hasRetried = false) {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && !hasRetried && typeof window !== "undefined" && path !== "/api/auth/refresh") {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest<T>(path, options, true);
    clearSession();
  }

  if (!response.ok) {
    const error = new Error(data.detail ?? "Request failed") as ApiRequestError;
    error.status = response.status;
    throw error;
  }
  return data as T;
}
