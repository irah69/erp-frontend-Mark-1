import { API_BASE_URL, apiRequest, clearSession, getAccessToken, type ApiRequestError } from "./api";

export type CurrentUser = {
  id: number;
  email: string;
  username: string;
  person_id: number | null;
  role_id: number;
  is_active: boolean;
};

/** Verifies the stored JWT and transparently refreshes it when expired. */
export async function checkSession(): Promise<CurrentUser | null> {
  if (!getAccessToken()) return null;

  try {
    return await apiRequest<CurrentUser>("/api/auth/me", { cache: "no-store" });
  } catch (error) {
    if ((error as ApiRequestError).status === 401) clearSession();
    return null;
  }
}

/** Redirects unauthenticated browser sessions to the login page. */
export async function requireSession() {
  const user = await checkSession();
  if (!user && typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
  return user;
}

export async function logout() {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    clearSession();
  }
}