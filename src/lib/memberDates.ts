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

export function parseBillMonthLabel(monthLabel: string): Date {
  const cleaned = monthLabel.replace(/^Extra Bill\s*—\s*/i, "").trim();
  return parseMemberDate(cleaned) ?? new Date();
}

export function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function monthEnd(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function isRoommateEligibleForBill(roommate: Roommate, billMonthLabel: string): boolean {
  if (roommate.status !== "Active") return false;

  const billDate = parseBillMonthLabel(billMonthLabel);
  const billStart = monthStart(billDate);
  const billEnd = monthEnd(billDate);

  const join = parseMemberDate(roommate.joinDate);
  if (join && billEnd < monthStart(join)) return false;

  if (roommate.moveOutDate) {
    const moveOut = parseMemberDate(roommate.moveOutDate);
    if (moveOut && billStart > monthEnd(moveOut)) return false;
  }

  return true;
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
