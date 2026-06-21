import type { Bill, Roommate, Settings } from "@/types";

export interface PublicBillBranding {
  platformName: string;
  logoUrl?: string;
  faviconUrl?: string;
  footerText?: string;
  supportEmail?: string;
  supportPhone?: string;
  websiteUrl?: string;
}

export interface SharePayload {
  bill: Bill;
  roommates: Pick<Roommate, "id" | "name" | "room" | "initials" | "color">[];
  houseName: string;
  address: string;
  globalMessageTitle?: string;
  globalMessage?: string;
  roundUpAmounts?: boolean;
  currency?: string;
  branding?: PublicBillBranding;
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSharePayload(
  bill: Bill,
  roommates: Roommate[],
  settings: Pick<Settings, "houseName" | "address" | "globalMessageTitle" | "globalMessage" | "roundUpAmounts" | "currency">,
  branding?: PublicBillBranding
): string {
  const relevant = roommates
    .filter((r) => bill.selectedRoommateIds.includes(r.id))
    .map((r) => ({
      id: r.id,
      name: r.name,
      room: r.room,
      initials: r.initials,
      color: r.color,
    }));

  const payload: SharePayload = {
    bill,
    roommates: relevant,
    houseName: settings.houseName,
    address: settings.address,
    globalMessageTitle: settings.globalMessageTitle,
    globalMessage: settings.globalMessage,
    roundUpAmounts: settings.roundUpAmounts ?? false,
    currency: settings.currency ?? "USD",
    branding,
  };

  return toBase64Url(JSON.stringify(payload));
}

export function decodeSharePayload(encoded: string): SharePayload | null {
  try {
    const json = fromBase64Url(encoded);
    const data = JSON.parse(json) as SharePayload;
    if (!data?.bill?.id) return null;
    return data;
  } catch {
    return null;
  }
}

export function getAppOrigin(): string {
  if (typeof window === "undefined") return "https://rent.otipu.com";
  return window.location.origin;
}

/** Ensure admin-entered URLs are absolute and safe for href/src. */
export function normalizeWebsiteUrl(url?: string, fallback = "https://rent.otipu.com"): string {
  let raw = (url ?? "").trim();
  if (!raw) raw = fallback;
  raw = raw.split("#")[0].split("?")[0].trim();
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw.replace(/^\/+/, "")}`;
  }
  return raw.replace(/\/$/, "");
}

export function buildShareUrl(encoded: string): string {
  return `${getAppOrigin()}/#/share/${encoded}`;
}

export function buildShareUrlFromToken(token: string): string {
  return `${getAppOrigin()}/s/${encodeURIComponent(token)}`;
}

export function parseHashRoute(): {
  page: string;
  shareData: string | null;
  shareToken: string | null;
  billId: string | null;
  adminSection: string;
} {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || hash === "/") {
    return { page: "landing", shareData: null, shareToken: null, billId: null, adminSection: "dashboard" };
  }

  if (hash.startsWith("/s/") || hash.startsWith("/share/")) {
    const prefix = hash.startsWith("/s/") ? "/s/" : "/share/";
    const data = hash.slice(prefix.length);
    if (/^[a-zA-Z0-9]{4,32}$/.test(data) && !data.includes(".") && data.length < 40) {
      return { page: "shared-bill", shareData: null, shareToken: data, billId: null, adminSection: "dashboard" };
    }
    return { page: "shared-bill", shareData: data, shareToken: null, billId: null, adminSection: "dashboard" };
  }

  const segments = hash.replace(/^\//, "").split("/").filter(Boolean);
  const page = segments[0] || "dashboard";

  if (page === "bill-details" && segments[1]) {
    return {
      page: "bill-details",
      shareData: null,
      shareToken: null,
      billId: decodeURIComponent(segments[1]),
      adminSection: "dashboard",
    };
  }

  if (page === "admin") {
    return { page: "admin", shareData: null, shareToken: null, billId: null, adminSection: segments[1] ?? "dashboard" };
  }

  return { page, shareData: null, shareToken: null, billId: null, adminSection: "dashboard" };
}

export function parseShareTokenFromLocation(): string | null {
  if (typeof window === "undefined") return null;

  const pathMatch = window.location.pathname.match(/\/s\/([a-zA-Z0-9]{4,32})\/?$/);
  if (pathMatch?.[1]) return pathMatch[1];

  const path = window.location.pathname;
  if (path.endsWith("/api/share.php") || path.endsWith("/share.php")) {
    const token = new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
    if (/^[a-zA-Z0-9]{4,32}$/.test(token)) return token;
  }

  return null;
}

/** @deprecated use parseShareTokenFromLocation */
export function parsePathShareToken(): string | null {
  return parseShareTokenFromLocation();
}

export function setAdminRoute(section: string) {
  const next = `#/admin/${section}`;
  if (window.location.hash !== next) {
    const url = `${window.location.pathname}${window.location.search}${next}`;
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

export function setHashRoute(page: string, billId?: string | null) {
  if (page === "shared-bill") return;
  if (page === "admin") {
    setAdminRoute("dashboard");
    return;
  }
  const next =
    page === "bill-details" && billId
      ? `#/bill-details/${encodeURIComponent(billId)}`
      : `#/${page === "bill-details" ? "expenses" : page}`;
  if (window.location.hash !== next) {
    const url = `${window.location.pathname}${window.location.search}${next}`;
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

export function setBillViewRoute(billId: string) {
  const next = `#/bill-details/${encodeURIComponent(billId)}`;
  if (window.location.hash !== next) {
    const url = `${window.location.pathname}${window.location.search}${next}`;
    window.history.pushState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}
