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

export function roundMoney(amount: number, roundUp = false) {
  if (roundUp) return Math.ceil(amount);
  return Math.round(amount * 100) / 100;
}

export function formatAmount(amount: number, roundUp = false) {
  const value = roundUp ? Math.ceil(amount) : roundMoney(amount);
  return roundUp
    ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : formatCurrencyDetailed(value);
}

export interface MemberShareBreakdown {
  rentShare: number;
  expenseShare: number;
  parkingShare: number;
  /** Sum of expenses this member paid upfront (paidBy). */
  upfrontPaid: number;
  /** Gross split before upfront credits. */
  grossTotal: number;
  /** Amount still owed after upfront credits (grossTotal - upfrontPaid). */
  netDue: number;
  /** @deprecated Use grossTotal — kept for callers expecting .total */
  total: number;
}

/** Total amount a member paid upfront on bill expenses (full expense amounts). */
export function getUpfrontPaidByMember(roommateId: number, expenses: Expense[]): number {
  return expenses
    .filter((e) => e.paidBy === roommateId)
    .reduce((sum, e) => sum + e.amount, 0);
}

/** Remaining balance for a roommate after recorded payments. */
export function getMemberAmountDue(share: RoommateShare, roundUp = false): number {
  return roundMoney(Math.max(0, share.share - share.paid), roundUp);
}

export function buildMemberShareBreakdown(
  roommateId: number,
  selectedIds: number[],
  rent: number,
  expenses: Expense[],
  parking?: ParkingSnapshot | null,
  roundUp = false
): MemberShareBreakdown {
  const activeParking = getActiveParkingAssignments(parking, selectedIds);
  const { rentPool } = getRentPoolForSharing(rent, parking, selectedIds);
  const rentShare = selectedIds.length > 0 ? rentPool / selectedIds.length : 0;

  let expenseShare = 0;
  for (const expense of expenses) {
    const sharers = getExpenseSharers(expense, selectedIds);
    if (sharers.includes(roommateId) && sharers.length > 0) {
      expenseShare += expense.amount / sharers.length;
    }
  }

  let parkingShare = 0;
  for (const assignment of activeParking) {
    const sharers = getParkingShareMemberIds(assignment, selectedIds);
    if (sharers.includes(roommateId) && sharers.length > 0) {
      parkingShare += assignment.monthlyFee / sharers.length;
    }
  }

  const upfrontPaid = getUpfrontPaidByMember(roommateId, expenses);
  const grossTotal = roundMoney(rentShare + expenseShare + parkingShare, roundUp);
  const netDue = roundMoney(grossTotal - upfrontPaid, roundUp);
  return {
    rentShare: roundMoney(rentShare, roundUp),
    expenseShare: roundMoney(expenseShare, roundUp),
    parkingShare: roundMoney(parkingShare, roundUp),
    upfrontPaid: roundMoney(upfrontPaid, roundUp),
    grossTotal,
    netDue,
    total: grossTotal,
  };
}

export type CalculationLineType = "add" | "subtract" | "info" | "subtotal" | "total" | "balance";

export interface CalculationLine {
  type: CalculationLineType;
  label: string;
  detail?: string;
  amount: number | null;
}

export function buildMemberCalculationSteps(
  roommateId: number,
  rent: number,
  expenses: Expense[],
  selectedIds: number[],
  parking: ParkingSnapshot | null | undefined,
  roommates: Pick<Roommate, "id" | "name">[],
  collectedPaid = 0,
  roundUp = false
): CalculationLine[] {
  const lines: CalculationLine[] = [];
  const count = selectedIds.length;
  if (count === 0) return lines;

  const rentInfo = getRentPoolForSharing(rent, parking, selectedIds);
  const rentShare = rentInfo.rentPool / count;

  if (rentInfo.parkingIncluded && rentInfo.totalParkingFees > 0) {
    lines.push({
      type: "info",
      label: "Rent pool",
      detail: `$${rent.toLocaleString()} rent minus $${rentInfo.totalParkingFees.toLocaleString()} parking (included in rent)`,
      amount: null,
    });
  }

  lines.push({
    type: "add",
    label: "Rent share",
    detail:
      rentInfo.parkingIncluded && rentInfo.totalParkingFees > 0
        ? `$${rentInfo.rentPool.toFixed(2)} ÷ ${count} members`
        : `$${rent.toLocaleString()} ÷ ${count} members`,
    amount: roundMoney(rentShare, roundUp),
  });

  for (const expense of expenses) {
    const sharers = getExpenseSharers(expense, selectedIds);
    if (!sharers.includes(roommateId) || sharers.length === 0) continue;
    const share = expense.amount / sharers.length;
    const payer = expense.paidBy ? roommates.find((r) => r.id === expense.paidBy) : null;
    const shareLabel = formatSharedByLabel(expense, roommates, selectedIds);
    lines.push({
      type: "add",
      label: expense.name || expense.category,
      detail: `$${expense.amount.toLocaleString()} ÷ ${sharers.length} (${shareLabel})${
        payer ? ` · Paid upfront by ${payer.name.split(" ")[0]}` : " · Unpaid"
      }`,
      amount: roundMoney(share, roundUp),
    });
  }

  const activeParking = getActiveParkingAssignments(parking, selectedIds);
  for (const assignment of activeParking) {
    const sharers = getParkingShareMemberIds(assignment, selectedIds);
    if (!sharers.includes(roommateId) || sharers.length === 0) continue;
    const share = assignment.monthlyFee / sharers.length;
    lines.push({
      type: "add",
      label: `Parking — ${assignment.spotName}`,
      detail: `$${assignment.monthlyFee.toLocaleString()} ÷ ${sharers.length} · ${formatParkingShareLabel(assignment, selectedIds, roommates)}`,
      amount: roundMoney(share, roundUp),
    });
  }

  const breakdown = buildMemberShareBreakdown(roommateId, selectedIds, rent, expenses, parking, roundUp);
  lines.push({ type: "subtotal", label: "Gross total (before credits)", amount: breakdown.grossTotal });

  const memberName = roommates.find((r) => r.id === roommateId)?.name.split(" ")[0] ?? "Member";

  for (const expense of expenses.filter((e) => e.paidBy === roommateId)) {
    const expenseLabel = expense.name || expense.category;
    lines.push({
      type: "subtract",
      label: `Prepaid (${expenseLabel})`,
      detail: `(${memberName}) paid $${expense.amount.toLocaleString()} upfront for ${expenseLabel}`,
      amount: roundMoney(expense.amount, roundUp),
    });
  }

  lines.push({ type: "total", label: "Net amount due", amount: breakdown.netDue });

  if (collectedPaid > 0) {
    lines.push({
      type: "subtract",
      label: "Already collected",
      detail: "Payments recorded toward this bill",
      amount: roundMoney(collectedPaid, roundUp),
    });
    lines.push({
      type: "balance",
      label: "Remaining balance",
      amount: roundMoney(Math.max(0, breakdown.netDue - collectedPaid), roundUp),
    });
  }

  return lines;
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
      shareSpace: a.shareSpace ?? false,
      sharedBy: a.shareSpace && a.sharedBy?.length ? a.sharedBy : undefined,
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

export function getParkingShareMemberIds(
  assignment: ParkingAssignment,
  selectedIds: number[]
): number[] {
  if (assignment.shareSpace) {
    const ids = assignment.sharedBy?.length
      ? assignment.sharedBy.filter((id) => selectedIds.includes(id))
      : selectedIds;
    return ids.length > 0 ? ids : selectedIds;
  }
  return assignment.roommateId != null ? [assignment.roommateId] : [];
}

export function formatParkingShareLabel(
  assignment: ParkingAssignment,
  selectedIds: number[],
  roommates: Pick<Roommate, "id" | "name">[]
): string {
  const sharerIds = getParkingShareMemberIds(assignment, selectedIds);
  if (sharerIds.length === 0) return "Unassigned";
  const names = sharerIds
    .map((id) => roommates.find((r) => r.id === id)?.name.split(" ")[0])
    .filter(Boolean);
  if (assignment.shareSpace) {
    return names.length > 0 ? `Shared by ${names.join(", ")}` : "All members";
  }
  return names[0] ?? "Assigned member";
}

export function getRentPoolForSharing(
  rent: number,
  parking: ParkingSnapshot | null | undefined,
  selectedIds: number[]
): { rentPool: number; totalParkingFees: number; parkingIncluded: boolean } {
  const activeParking = getActiveParkingAssignments(parking, selectedIds);
  const totalParkingFees = activeParking.reduce((sum, a) => sum + a.monthlyFee, 0);
  const parkingIncluded = parking?.parkingIncludedInRent ?? false;
  const rentPool = parkingIncluded ? rent - totalParkingFees : rent;
  return { rentPool, totalParkingFees, parkingIncluded };
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
  roommates: Pick<Roommate, "id" | "name">[],
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
  roommateShares?: RoommateShare[],
  roundUp = false
): CollectionSummary {
  const shares = roommateShares ?? normalizeBillShares(bill, roundUp);
  const additionalExpenses = bill.expenses.reduce((sum, e) => sum + e.amount, 0);
  const parkingFees = calcTotalParkingFees(bill.parkingSnapshot, bill.selectedRoommateIds);
  const parkingIncluded = bill.parkingSnapshot?.parkingIncludedInRent ?? false;
  const totalToCollect = parkingIncluded
    ? bill.rent + additionalExpenses
    : bill.rent + additionalExpenses + parkingFees;
  const totalPaid = shares.reduce((sum, rs) => sum + rs.paid, 0);
  const outstanding = shares.reduce((sum, rs) => sum + getMemberAmountDue(rs, roundUp), 0);

  return {
    baseRent: bill.rent,
    additionalExpenses,
    parkingFees,
    totalToCollect: roundMoney(totalToCollect, roundUp),
    totalPaid: roundMoney(totalPaid, roundUp),
    outstanding: roundMoney(outstanding, roundUp),
  };
}

export function buildRoommateShares(
  _roommates: Roommate[],
  selectedIds: number[],
  rent: number,
  expenses: Expense[],
  existing?: RoommateShare[],
  parking?: ParkingSnapshot | null,
  roundUp = false
): RoommateShare[] {
  if (selectedIds.length === 0) return [];

  return selectedIds.map((id) => {
    const breakdown = buildMemberShareBreakdown(id, selectedIds, rent, expenses, parking, roundUp);
    const upfront = breakdown.upfrontPaid;
    const netShare = breakdown.netDue;
    const existingShare = existing?.find((s) => s.roommateId === id);
    const storedPaid = existingShare?.paid ?? 0;
    // Upfront payments are baked into netShare; paid tracks additional collections only.
    const paid = roundMoney(Math.max(0, storedPaid - upfront), roundUp);

    return {
      roommateId: id,
      share: netShare,
      paid,
      status: getPayStatusFromAmount(paid, netShare),
    };
  });
}

/** Recompute roommate shares from bill data (preserves manual payment records). */
export function normalizeBillShares(
  bill: Pick<Bill, "rent" | "expenses" | "selectedRoommateIds" | "parkingSnapshot" | "roommateShares">,
  roundUp = false
): RoommateShare[] {
  return buildRoommateShares(
    [],
    bill.selectedRoommateIds,
    bill.rent,
    bill.expenses,
    bill.roommateShares,
    bill.parkingSnapshot,
    roundUp
  );
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

export async function copyBillLink(
  billId: string,
  showToast: (msg: string, type: "success" | "error" | "info") => void
) {
  const link = await getShareLink(billId);
  const ok = await copyToClipboard(link);
  if (ok) showToast("Share link copied!", "success");
  else showToast("Failed to copy link", "error");
  return ok;
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
