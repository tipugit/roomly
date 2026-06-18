import type {
  Bill,
  Expense,
  ParkingAssignment,
  ParkingSnapshot,
  PayStatus,
  Roommate,
  RoommateShare,
  Settings,
} from "@/types";
import { api } from "@/lib/api";
import { buildShareUrlFromToken } from "@/lib/share";

const AVATAR_COLORS = [
  { color: "#4F46E5", grad: "linear-gradient(135deg, #4F46E5, #7C3AED)" },
  { color: "#06B6D4", grad: "linear-gradient(135deg, #06B6D4, #0891B2)" },
  { color: "#10B981", grad: "linear-gradient(135deg, #10B981, #059669)" },
  { color: "#F59E0B", grad: "linear-gradient(135deg, #F59E0B, #D97706)" },
  { color: "#8B5CF6", grad: "linear-gradient(135deg, #8B5CF6, #7C3AED)" },
  { color: "#EC4899", grad: "linear-gradient(135deg, #EC4899, #DB2777)" },
];

const CATEGORY_ICONS: Record<string, string> = {
  Rent: "🏠",
  Internet: "📶",
  Electricity: "⚡",
  Water: "💧",
  Cleaning: "🧹",
  Supplies: "🧴",
  Groceries: "🛒",
  Parking: "🅿️",
  Other: "📦",
};

const CATEGORY_COLORS: Record<string, string> = {
  Rent: "#4F46E5",
  Internet: "#06B6D4",
  Electricity: "#F59E0B",
  Water: "#10B981",
  Cleaning: "#EC4899",
  Supplies: "#8B5CF6",
  Groceries: "#F97316",
  Parking: "#6366F1",
  Other: "#64748B",
};

export interface CollectionSummary {
  baseRent: number;
  additionalExpenses: number;
  parkingFees: number;
  totalToCollect: number;
  totalPaid: number;
  outstanding: number;
}

export function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getAvatarStyle(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function getCategoryIcon(category: string) {
  return CATEGORY_ICONS[category] ?? "📦";
}

export function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? "#64748B";
}

export function calcBillTotal(rent: number, expenses: Expense[]) {
  return rent + expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function calcPerPerson(total: number, count: number) {
  return count > 0 ? total / count : 0;
}

export function buildParkingSnapshotFromSettings(settings: Settings): ParkingSnapshot {
  const activeAssignments = (settings.parkingAssignments ?? []).filter((a) => a.active);
  return {
    totalSpots: settings.parkingTotalSpots ?? 0,
    parkingIncludedInRent: settings.parkingIncludedInRent ?? false,
    assignments: activeAssignments.map((a) => ({
      spotName: a.spotName,
      roommateId: a.roommateId,
      monthlyFee: a.monthlyFee,
      active: a.active,
    })),
  };
}

export function getActiveParkingAssignments(
  parking: ParkingSnapshot | null | undefined,
  selectedIds: number[]
): ParkingAssignment[] {
  if (!parking) return [];
  return parking.assignments.filter(
    (a) => a.active && a.roommateId != null && selectedIds.includes(a.roommateId)
  );
}

export function calcTotalParkingFees(
  parking: ParkingSnapshot | null | undefined,
  selectedIds: number[]
) {
  return getActiveParkingAssignments(parking, selectedIds).reduce((sum, a) => sum + a.monthlyFee, 0);
}

export function getExpenseSharers(
  expense: Expense,
  selectedRoommateIds: number[]
): number[] {
  if (expense.shareMode === "selected" && expense.sharedBy?.length) {
    return expense.sharedBy.filter((id) => selectedRoommateIds.includes(id));
  }
  return selectedRoommateIds;
}

export function formatSharedByLabel(
  expense: Expense,
  roommates: Roommate[],
  selectedRoommateIds: number[]
) {
  const sharers = getExpenseSharers(expense, selectedRoommateIds);
  if (expense.shareMode !== "selected" || !expense.sharedBy?.length) {
    return "All members";
  }
  const names = sharers
    .map((id) => roommates.find((r) => r.id === id)?.name.split(" ")[0])
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : "All members";
}

export function calcCollectionSummary(
  bill: Bill,
  roommateShares?: RoommateShare[]
): CollectionSummary {
  const shares = roommateShares ?? bill.roommateShares;
  const additionalExpenses = bill.expenses.reduce((sum, e) => sum + e.amount, 0);
  const parkingFees = calcTotalParkingFees(bill.parkingSnapshot, bill.selectedRoommateIds);
  const parkingIncluded = bill.parkingSnapshot?.parkingIncludedInRent ?? false;
  const totalToCollect = parkingIncluded
    ? bill.rent + additionalExpenses
    : bill.rent + additionalExpenses + parkingFees;
  const totalPaid = shares.reduce((sum, rs) => sum + rs.paid, 0);
  const outstanding = shares.reduce((sum, rs) => sum + Math.max(0, rs.share - rs.paid), 0);

  return {
    baseRent: bill.rent,
    additionalExpenses,
    parkingFees,
    totalToCollect: roundMoney(totalToCollect),
    totalPaid: roundMoney(totalPaid),
    outstanding: roundMoney(outstanding),
  };
}

export function buildRoommateShares(
  _roommates: Roommate[],
  selectedIds: number[],
  rent: number,
  expenses: Expense[],
  existing?: RoommateShare[],
  parking?: ParkingSnapshot | null
): RoommateShare[] {
  if (selectedIds.length === 0) return [];

  const activeParking = getActiveParkingAssignments(parking, selectedIds);
  const totalParkingFees = activeParking.reduce((sum, a) => sum + a.monthlyFee, 0);
  const parkingByMember = new Map<number, number>();
  for (const assignment of activeParking) {
    if (assignment.roommateId == null) continue;
    parkingByMember.set(
      assignment.roommateId,
      (parkingByMember.get(assignment.roommateId) ?? 0) + assignment.monthlyFee
    );
  }

  const parkingIncluded = parking?.parkingIncludedInRent ?? false;
  const rentForSharing = parkingIncluded ? rent - totalParkingFees : rent;
  const rentPerPerson = rentForSharing / selectedIds.length;

  const expenseShareByMember = new Map<number, number>();
  for (const id of selectedIds) expenseShareByMember.set(id, 0);

  for (const expense of expenses) {
    const sharers = getExpenseSharers(expense, selectedIds);
    if (sharers.length === 0) continue;
    const perShare = expense.amount / sharers.length;
    for (const id of sharers) {
      expenseShareByMember.set(id, (expenseShareByMember.get(id) ?? 0) + perShare);
    }
  }

  return selectedIds.map((id) => {
    const parkingFee = parkingByMember.get(id) ?? 0;
    const share = roundMoney(
      rentPerPerson + (expenseShareByMember.get(id) ?? 0) + parkingFee
    );
    const paid = expenses
      .filter((e) => e.paidBy === id)
      .reduce((sum, e) => sum + e.amount, 0);
    const existingShare = existing?.find((s) => s.roommateId === id);
    const paidAmount = existingShare?.paid ?? paid;

    return {
      roommateId: id,
      share,
      paid: paidAmount,
      status: getPayStatusFromAmount(paidAmount, share),
    };
  });
}

export function getPayStatusFromAmount(paid: number, share: number): PayStatus {
  if (paid >= share - 0.01) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
}

export function formatCurrency(amount: number) {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatCurrencyDetailed(amount: number) {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getBillExpensesWithRent(bill: Bill): Expense[] {
  return [
    {
      id: 0,
      name: "Rent",
      amount: bill.rent,
      category: "Rent",
      icon: "🏠",
      note: "Base monthly rent",
      shareMode: "all",
    },
    ...bill.expenses,
  ];
}

export function getRoommateById(roommates: Roommate[], id: number) {
  return roommates.find((r) => r.id === id);
}

export async function getShareLink(billId: string) {
  const res = await api.createShareToken(billId);
  return buildShareUrlFromToken(res.token);
}

export async function copyToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy method */
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
