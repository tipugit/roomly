import type { AppState } from "@/types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const API_BASE = import.meta.env.VITE_API_URL ?? "./api/index.php";

function routeUrl(route: string): string {
  const base = API_BASE.includes("index.php") ? API_BASE : `${API_BASE}/index.php`;
  return `${base}?route=${encodeURIComponent(route)}`;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface ApiResponse {
  ok: boolean;
  error?: string;
  user?: AuthUser | null;
  state?: AppState;
}

async function request<T>(route: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(routeUrl(route), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  let data: ApiResponse & T;
  try {
    data = await res.json();
  } catch {
    throw new ApiError("Invalid server response", res.status);
  }

  if (!res.ok || data.ok === false) {
    throw new ApiError(data.error ?? "Request failed", res.status);
  }

  return data as T;
}

export const api = {
  me: () => request<{ ok: true; user: AuthUser | null; state?: AppState }>("auth/me"),

  login: (email: string, password: string) =>
    request<{ ok: true; user: AuthUser; state: AppState }>("auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<{ ok: true; user: AuthUser; state: AppState }>("auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  logout: () => request<{ ok: true }>("auth/logout", { method: "POST" }),

  sync: () => request<{ ok: true; state: AppState }>("sync"),

  addRoommate: (data: Record<string, unknown>) =>
    request<{ ok: true; roommate: unknown }>("roommates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateRoommate: (id: number, data: Record<string, unknown>) =>
    request<{ ok: true; roommate: unknown }>(`roommates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteRoommate: (id: number) =>
    request<{ ok: true }>(`roommates/${id}`, { method: "DELETE" }),

  createBill: (payload: Record<string, unknown>) =>
    request<{ ok: true; state: AppState }>("bills", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteBill: (billId: string) =>
    request<{ ok: true; state: AppState }>(`bills/${billId}`, { method: "DELETE" }),

  duplicateBill: (billId: string) =>
    request<{ ok: true; state: AppState }>(`bills/${billId}/duplicate`, { method: "POST" }),

  markBillComplete: (billId: string) =>
    request<{ ok: true; state: AppState }>(`bills/${billId}/complete`, { method: "PUT" }),

  setActiveBill: (activeBillId: string | null) =>
    request<{ ok: true }>("bills/active", {
      method: "PUT",
      body: JSON.stringify({ activeBillId }),
    }),

  updatePayment: (billId: string, roommateId: number, paid: number) =>
    request<{ ok: true; state: AppState }>(`bills/${billId}/payment`, {
      method: "PUT",
      body: JSON.stringify({ roommateId, paid }),
    }),

  updateSettings: (settings: unknown, darkMode?: boolean) =>
    request<{ ok: true; state: AppState }>("settings", {
      method: "PUT",
      body: JSON.stringify({ settings, darkMode }),
    }),

  createShareToken: (billId: string) =>
    request<{ ok: true; token: string }>("share", {
      method: "POST",
      body: JSON.stringify({ billId }),
    }),

  getShare: (token: string) =>
    request<{ ok: true; payload: import("@/lib/share").SharePayload }>(`share/${token}`),

  resetAccount: () => request<{ ok: true; state: AppState }>("account", { method: "DELETE" }),
};
