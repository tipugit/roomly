import type { Bill, Roommate, Settings } from "@/types";

export interface SharePayload {
  bill: Bill;
  roommates: Pick<Roommate, "id" | "name" | "room" | "initials" | "color">[];
  houseName: string;
  address: string;
  globalMessageTitle?: string;
  globalMessage?: string;
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
  settings: Pick<Settings, "houseName" | "address" | "globalMessageTitle" | "globalMessage">
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

export function buildShareUrl(encoded: string): string {
  const base = window.location.href.split("#")[0].split("?")[0];
  return `${base}#/share/${encoded}`;
}

export function parseHashRoute(): {
  page: string;
  shareData: string | null;
  shareToken: string | null;
  billId: string | null;
} {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || hash === "/") {
    return { page: "landing", shareData: null, shareToken: null, billId: null };
  }

  if (hash.startsWith("/s/") || hash.startsWith("/share/")) {
    const prefix = hash.startsWith("/s/") ? "/s/" : "/share/";
    const data = hash.slice(prefix.length);
    if (/^[a-zA-Z0-9]{4,32}$/.test(data) && !data.includes(".") && data.length < 40) {
      return { page: "shared-bill", shareData: null, shareToken: data, billId: null };
    }
    return { page: "shared-bill", shareData: data, shareToken: null, billId: null };
  }

  const segments = hash.replace(/^\//, "").split("/").filter(Boolean);
  const page = segments[0] || "dashboard";

  if (page === "bill-details" && segments[1]) {
    return {
      page: "bill-details",
      shareData: null,
      shareToken: null,
      billId: decodeURIComponent(segments[1]),
    };
  }

  return { page, shareData: null, shareToken: null, billId: null };
}

export function buildShareUrlFromToken(token: string): string {
  const base = typeof window !== "undefined"
    ? window.location.href.split("#")[0].split("?")[0]
    : "https://rent.otipu.com";
  return `${base}#/s/${token}`;
}

export function setHashRoute(page: string, billId?: string | null) {
  if (page === "shared-bill") return;
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
