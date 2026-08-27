import type { Roommate } from "@/types";

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function parseMemberDate(dateStr: string): Date | null {
  if (!dateStr?.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(`${dateStr}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parsed = Date.parse(dateStr);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  return null;
}

const MONTH_INDEX: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

export function parseBillMonthLabel(monthLabel: string): Date {
  const cleaned = monthLabel.replace(/^Extra Bill\s*—\s*/i, "").trim();
  const named = cleaned.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (named) {
    const month = MONTH_INDEX[named[1].toLowerCase()] ?? MONTH_INDEX[named[1].toLowerCase().slice(0, 3)];
    const year = Number(named[2]);
    if (month !== undefined && Number.isFinite(year)) {
      return new Date(year, month, 1, 12, 0, 0);
    }
  }
  const parsed = parseMemberDate(cleaned);
  if (parsed) return new Date(parsed.getFullYear(), parsed.getMonth(), 1, 12, 0, 0);
  const fallback = new Date();
  return new Date(fallback.getFullYear(), fallback.getMonth(), 1, 12, 0, 0);
}

export function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0);
}

export function monthEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 12, 0, 0);
}

function yearMonthKey(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

/** Join Aug 1 counts for the August bill; later months are excluded unless the user overrides. */
export function isRoommateEligibleForBill(roommate: Roommate, billMonthLabel: string): boolean {
  if (roommate.status === "Inactive") return false;

  const billYM = yearMonthKey(parseBillMonthLabel(billMonthLabel));

  const join = parseMemberDate(roommate.joinDate);
  if (join && yearMonthKey(join) > billYM) return false;

  if (roommate.moveOutDate) {
    const moveOut = parseMemberDate(roommate.moveOutDate);
    if (moveOut && yearMonthKey(moveOut) < billYM) return false;
  }

  return true;
}

export function isRoommateSelectableForBill(roommate: Roommate): boolean {
  return roommate.status !== "Inactive";
}

export function formatMemberDate(dateStr?: string): string {
  if (!dateStr?.trim()) return "—";
  const d = parseMemberDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatMonthYear(d: Date = new Date()): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
