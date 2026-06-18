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

export function parseHashRoute(): { page: string; shareData: string | null; shareToken: string | null } {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || hash === "/") return { page: "landing", shareData: null, shareToken: null };

  if (hash.startsWith("/share/")) {
    const data = hash.slice("/share/".length);
    if (/^[a-f0-9]{32}$/i.test(data)) {
      return { page: "shared-bill", shareData: null, shareToken: data };
    }
    return { page: "shared-bill", shareData: data, shareToken: null };
  }

  const page = hash.replace(/^\//, "").split("?")[0];
  return { page: page || "dashboard", shareData: null, shareToken: null };
}

export function buildShareUrlFromToken(token: string): string {
  const base = window.location.href.split("#")[0].split("?")[0];
  return `${base}#/share/${token}`;
}

export function setHashRoute(page: string) {
  if (page === "shared-bill") return;
  const normalized = page === "bill-details" ? "expenses" : page;
  const next = `#/${normalized}`;
  if (window.location.hash !== next) {
    window.history.replaceState(null, "", next);
  }
}
