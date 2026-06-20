import type { AuthUser } from "@/types";

export type AdminSection =
  | "dashboard"
  | "users"
  | "houses"
  | "features"
  | "announcements"
  | "branding"
  | "email-templates"
  | "activity-logs"
  | "audit-logs"
  | "login-history"
  | "support"
  | "backups"
  | "health"
  | "plans"
  | "global-settings"
  | "storage"
  | "notifications";

export type UserStatus = "active" | "suspended" | "disabled";
export type HouseStatus = "active" | "suspended" | "archived";
export type AnnouncementType = "info" | "warning" | "maintenance" | "update";
export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalHouses: number;
  totalMembers: number;
  totalBills: number;
  totalExpenses: number;
  storageBytes: number;
  fileCount: number;
  newRegistrationsThisMonth: number;
  totalAnnouncements: number;
  openSupportTickets: number;
  users?: number;
  houses?: number;
  bills?: number;
  roommates?: number;
}

export interface AdminCharts {
  userGrowth: { month: string; users: number }[];
  billGrowth: { month: string; bills: number }[];
  houseGrowth: { month: string; houses: number }[];
  activeUserTrend: { month: string; active: number }[];
}

export interface AdminUserDetail extends AuthUser {
  phone?: string;
  status?: UserStatus;
  planId?: number;
  planName?: string;
  createdAt?: string;
  lastLoginAt?: string | null;
  houseCount?: number;
  memberCount?: number;
  billCount?: number;
  expenseCount?: number;
}

export interface AdminHouseDetail {
  id: number;
  name: string;
  status?: HouseStatus;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  roommateCount: number;
  billCount: number;
  createdAt?: string;
  lastActivityAt?: string | null;
}

export interface PlatformFeatures {
  parking: boolean;
  announcements: boolean;
  pdfExport: boolean;
  emailNotifications: boolean;
  qrSharing: boolean;
  analytics: boolean;
  attachments: boolean;
  supportCenter: boolean;
  publicBillLinks: boolean;
}

export interface PlatformBranding {
  platformName: string;
  logoUrl: string;
  faviconUrl: string;
  loginLogoUrl: string;
  footerText: string;
  supportEmail: string;
  supportPhone: string;
  websiteUrl: string;
}

export interface PlatformGlobalSettings {
  defaultCurrency: string;
  dateFormat: string;
  timezone: string;
  language: string;
  defaultTheme: string;
  registrationEnabled: boolean;
}

export interface PlatformAnnouncement {
  id: number;
  title: string;
  body: string;
  type: AnnouncementType;
  isPinned: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface EmailTemplate {
  key: string;
  name: string;
  subject: string;
  bodyHtml: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  description: string;
  userName: string | null;
  actorName: string | null;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  actorName: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface LoginHistoryEntry {
  id: number;
  userId: number;
  userName: string;
  email: string;
  ipAddress: string | null;
  browser: string | null;
  device: string | null;
  location: string | null;
  isSuspicious: boolean;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: number;
  slug: string;
  name: string;
  memberLimit: number;
  houseLimit: number;
  billLimit: number;
  storageLimitMb: number;
  features: Record<string, boolean>;
  priceMonthly: number;
  isActive: boolean;
}

export interface SupportTicket {
  id: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  userName?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
  messages?: { id: number; message: string; userName: string; isStaff: boolean; createdAt: string }[];
}

export interface PlatformBackup {
  id: number;
  filename: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
}

export interface HealthStatus {
  status: "healthy" | "warning" | "error";
  label: string;
}

export interface PlatformNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}
