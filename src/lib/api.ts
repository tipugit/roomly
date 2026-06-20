import type { AppState, HouseSummary, AdminUser, AdminHouse, AdminStats, UserRole, AuthUser } from "@/types";
import type {
  AdminDashboardStats, AdminCharts, AdminUserDetail,
  PlatformFeatures, PlatformBranding, PlatformGlobalSettings, PlatformAnnouncement,
  EmailTemplate, ActivityLog, AuditLog, LoginHistoryEntry, SubscriptionPlan,
  SupportTicket, PlatformBackup, PlatformNotification, UserStatus, HouseStatus,
} from "@/types/admin";

export type { AuthUser } from "@/types";

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

interface AuthPayload {
  ok: true;
  user: AuthUser;
  houses?: HouseSummary[];
  activeHouseId?: number;
  state: AppState;
  impersonating?: boolean;
}

interface ApiResponse {
  ok: boolean;
  error?: string;
  user?: AuthUser | null;
  houses?: HouseSummary[];
  activeHouseId?: number;
  state?: AppState;
  impersonating?: boolean;
  impersonatorId?: number | null;
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
  me: () =>
    request<{ ok: true; user: AuthUser | null; houses?: HouseSummary[]; activeHouseId?: number; state?: AppState; impersonating?: boolean }>("auth/me"),

  login: (email: string, password: string) =>
    request<AuthPayload>("auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<AuthPayload>("auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  logout: () => request<{ ok: true }>("auth/logout", { method: "POST" }),

  sync: () => request<{ ok: true; state: AppState }>("sync"),

  listHouses: () =>
    request<{ ok: true; houses: HouseSummary[]; activeHouseId: number }>("houses"),

  createHouse: (name: string) =>
    request<AuthPayload>("houses", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  switchHouse: (houseId: number) =>
    request<AuthPayload>("houses/switch", {
      method: "POST",
      body: JSON.stringify({ houseId }),
    }),

  adminStats: () =>
    request<{ ok: true; stats: AdminStats; recentUsers: AdminUser[] }>("admin/stats"),

  adminUsers: () => request<{ ok: true; users: AdminUser[] }>("admin/users"),

  adminCreateUser: (data: { name: string; email: string; password: string; role?: UserRole }) =>
    request<{ ok: true; user: AdminUser }>("admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  adminResetPassword: (userId: number, password: string) =>
    request<{ ok: true }>(`admin/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    }),

  adminSetRole: (userId: number, role: UserRole) =>
    request<{ ok: true }>(`admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),

  adminDeleteUser: (userId: number) =>
    request<{ ok: true }>(`admin/users/${userId}`, { method: "DELETE" }),

  adminHouses: () => request<{ ok: true; houses: AdminHouse[] }>("admin/houses"),

  adminDeleteHouse: (houseId: number) =>
    request<{ ok: true }>(`admin/houses/${houseId}`, { method: "DELETE" }),

  adminDashboard: () =>
    request<{ ok: true; stats: AdminDashboardStats; charts: AdminCharts; recentUsers: AdminUserDetail[]; health: Record<string, { status: string; label: string }> }>("admin/dashboard"),

  adminUsersFiltered: (params?: { q?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.status) qs.set("status", params.status);
    const q = qs.toString();
    return request<{ ok: true; users: AdminUserDetail[] }>(`admin/users${q ? `?${q}` : ""}`);
  },

  adminUserDetail: (id: number) => request<{ ok: true; user: AdminUserDetail }>(`admin/users/${id}`),

  adminUpdateUser: (id: number, data: Partial<{ name: string; email: string; phone: string; planId: number }>) =>
    request<{ ok: true; user: AdminUserDetail }>(`admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  adminSetUserStatus: (id: number, status: UserStatus) =>
    request<{ ok: true }>(`admin/users/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),

  adminImpersonate: (userId: number) =>
    request<AuthPayload & { impersonating: boolean }>(`admin/users/${userId}/impersonate`, { method: "POST" }),

  adminStopImpersonate: () => request<AuthPayload>("admin/impersonate/stop", { method: "POST" }),

  adminUpdateHouse: (id: number, data: Partial<{ name: string; status: HouseStatus }>) =>
    request<{ ok: true }>(`admin/houses/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  adminFeatures: () => request<{ ok: true; features: PlatformFeatures }>("admin/features"),
  adminUpdateFeatures: (features: PlatformFeatures) =>
    request<{ ok: true; features: PlatformFeatures }>("admin/features", { method: "PUT", body: JSON.stringify({ features }) }),

  adminBranding: () => request<{ ok: true; branding: PlatformBranding }>("admin/branding"),
  adminUpdateBranding: (branding: PlatformBranding) =>
    request<{ ok: true; branding: PlatformBranding }>("admin/branding", { method: "PUT", body: JSON.stringify({ branding }) }),

  adminGlobalSettings: () => request<{ ok: true; settings: PlatformGlobalSettings }>("admin/global-settings"),
  adminUpdateGlobalSettings: (settings: PlatformGlobalSettings) =>
    request<{ ok: true; settings: PlatformGlobalSettings }>("admin/global-settings", { method: "PUT", body: JSON.stringify({ settings }) }),

  platformConfig: () =>
    request<{ ok: true; features: PlatformFeatures; branding: PlatformBranding; announcements: PlatformAnnouncement[]; impersonating: boolean; impersonatorId: number | null }>("platform/config"),

  adminAnnouncements: () => request<{ ok: true; announcements: PlatformAnnouncement[] }>("admin/announcements"),
  adminCreateAnnouncement: (data: Partial<PlatformAnnouncement>) =>
    request<{ ok: true; id: number }>("admin/announcements", { method: "POST", body: JSON.stringify(data) }),
  adminUpdateAnnouncement: (id: number, data: Partial<PlatformAnnouncement>) =>
    request<{ ok: true }>(`admin/announcements/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  adminDeleteAnnouncement: (id: number) =>
    request<{ ok: true }>(`admin/announcements/${id}`, { method: "DELETE" }),

  adminEmailTemplates: () => request<{ ok: true; templates: EmailTemplate[] }>("admin/email-templates"),
  adminUpdateEmailTemplate: (key: string, data: { subject: string; bodyHtml: string }) =>
    request<{ ok: true }>(`admin/email-templates/${key}`, { method: "PUT", body: JSON.stringify(data) }),

  adminActivityLogs: (params?: { q?: string; action?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.action) qs.set("action", params.action);
    const q = qs.toString();
    return request<{ ok: true; logs: ActivityLog[] }>(`admin/activity-logs${q ? `?${q}` : ""}`);
  },

  adminAuditLogs: () => request<{ ok: true; logs: AuditLog[] }>("admin/audit-logs"),
  adminLoginHistory: (userId?: number) =>
    request<{ ok: true; history: LoginHistoryEntry[] }>(`admin/login-history${userId ? `?userId=${userId}` : ""}`),

  adminPlans: () => request<{ ok: true; plans: SubscriptionPlan[] }>("admin/plans"),
  adminUpdatePlan: (id: number, data: Partial<SubscriptionPlan>) =>
    request<{ ok: true }>(`admin/plans/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  adminTickets: () => request<{ ok: true; tickets: SupportTicket[] }>("admin/tickets"),
  adminTicketDetail: (id: number) => request<{ ok: true; ticket: SupportTicket }>(`admin/tickets/${id}`),
  adminReplyTicket: (id: number, data: { message: string; status?: string; priority?: string }) =>
    request<{ ok: true }>(`admin/tickets/${id}/reply`, { method: "POST", body: JSON.stringify(data) }),

  createSupportTicket: (subject: string, message: string, priority?: string) =>
    request<{ ok: true; ticketId: number }>("support/tickets", { method: "POST", body: JSON.stringify({ subject, message, priority }) }),

  adminBackups: () => request<{ ok: true; backups: PlatformBackup[] }>("admin/backups"),
  adminCreateBackup: () => request<{ ok: true; filename: string; sizeBytes: number }>("admin/backups", { method: "POST" }),

  adminStorage: () =>
    request<{ ok: true; totalBytes: number; fileCount: number; largestFiles: { id: number; filename: string; sizeBytes: number; userName: string }[]; userUsage: { name: string; email: string; totalBytes: number }[] }>("admin/storage"),

  adminDeleteFile: (id: number) => request<{ ok: true }>(`admin/storage/${id}`, { method: "DELETE" }),

  adminNotifications: () => request<{ ok: true; notifications: PlatformNotification[] }>("admin/notifications"),
  adminMarkNotificationsRead: () => request<{ ok: true }>("admin/notifications/read", { method: "PUT" }),

  adminHealth: () => request<{ ok: true; health: Record<string, { status: string; label: string }> }>("admin/health"),

  adminExportUsersUrl: () => {
    const base = API_BASE.includes("index.php") ? API_BASE : `${API_BASE}/index.php`;
    return `${base}?route=${encodeURIComponent("admin/export/users")}`;
  },

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

  updateBill: (billId: string, payload: Record<string, unknown>) =>
    request<{ ok: true; state: AppState }>(`bills/${billId}`, {
      method: "PUT",
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
