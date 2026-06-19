import { useMemo, type ReactNode } from "react";
import {
  X,
  Link2,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Car,
  PieChart as PieChartIcon,
  Edit2,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "@/context/AppContext";
import { BillAnnouncements } from "@/components/BillAnnouncements";
import { CollectionSummaryCard } from "@/components/CollectionSummaryCard";
import { printPage } from "@/lib/print";
import type { Bill } from "@/types";
import {
  buildMemberShareBreakdown,
  calcCollectionSummary,
  copyToClipboard,
  formatAmount,
  formatParkingShareLabel,
  formatSharedByLabel,
  getActiveParkingAssignments,
  getBillExpensesWithRent,
  getCategoryColor,
  getRoommateById,
  getShareLink,
} from "@/lib/utils";

const statusConfig: Record<string, { bg: string; text: string; icon: ReactNode }> = {
  Paid: { bg: "#ECFDF5", text: "#059669", icon: <CheckCircle2 size={14} style={{ color: "#059669" }} /> },
  Partial: { bg: "#FFFBEB", text: "#D97706", icon: <Clock size={14} style={{ color: "#D97706" }} /> },
  Pending: { bg: "#FEF2F2", text: "#EF4444", icon: <XCircle size={14} style={{ color: "#EF4444" }} /> },
};

interface BillDetailModalProps {
  bill: Bill | null;
  onClose: () => void;
  onEdit?: () => void;
  onCopyLink?: () => void;
  onOpenPublicLink?: () => void;
  onDuplicate?: () => void;
  onMarkPaid?: () => void;
  onDelete?: () => void;
  linkCopied?: boolean;
}

export function BillDetailModal({
  bill,
  onClose,
  onEdit,
  onCopyLink,
  onOpenPublicLink,
  onDuplicate,
  onMarkPaid,
  onDelete,
  linkCopied,
}: BillDetailModalProps) {
  const { roommates, settings, updatePayment, showToast } = useApp();
  const roundUp = settings.roundUpAmounts ?? false;

  const expenseRows = useMemo(
    () => (bill ? getBillExpensesWithRent(bill) : []),
    [bill]
  );

  const roommateBreakdown = useMemo(() => {
    if (!bill) return [];
    return bill.roommateShares.map((rs) => {
      const roommate = getRoommateById(roommates, rs.roommateId);
      const calc = buildMemberShareBreakdown(
        rs.roommateId,
        bill.selectedRoommateIds,
        bill.rent,
        bill.expenses,
        bill.parkingSnapshot,
        roundUp
      );
      return {
        roommateId: rs.roommateId,
        name: roommate?.name ?? "Unknown",
        room: roommate?.room ?? "—",
        initials: roommate?.initials ?? "?",
        color: roommate?.color ?? "#64748B",
        share: rs.share,
        paid: rs.paid,
        status: rs.status,
        calc,
      };
    });
  }, [bill, roommates, roundUp]);

  const collectionSummary = bill ? calcCollectionSummary(bill) : null;
  const totalPaid = collectionSummary?.totalPaid ?? 0;
  const totalToCollect = collectionSummary?.totalToCollect ?? 0;
  const collectPct = totalToCollect > 0 ? Math.round((totalPaid / totalToCollect) * 100) : 0;

  const pieData = useMemo(() => {
    if (!bill) return [];
    return [
      { name: "Rent", value: bill.rent, color: "#4F46E5" },
      ...bill.expenses.map((e) => ({
        name: e.name,
        value: e.amount,
        color: getCategoryColor(e.category),
      })),
    ];
  }, [bill]);

  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  if (!bill) return null;

  const displayTitle = bill.title || bill.month;
  const houseLabel = bill.houseName || settings.houseName;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(15,13,42,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[min(96vw,1100px)] max-h-[96vh] overflow-hidden flex flex-col rounded-t-3xl sm:rounded-3xl"
        style={{
          background: "var(--background)",
          boxShadow: "0 32px 80px rgba(79,70,229,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative px-5 sm:px-7 py-6 flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #312E81 0%, #4F46E5 45%, #7C3AED 75%, #0D9488 100%)",
          }}
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30" style={{ background: "#06B6D4", filter: "blur(40px)" }} />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px" }}>
                {bill.month} · {houseLabel}
              </p>
              <h2 className="text-white truncate" style={{ fontWeight: 800, fontSize: "22px", letterSpacing: "-0.3px" }}>
                {displayTitle}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", marginTop: 4 }}>
                Created {bill.createdAt} · {bill.selectedRoommateIds.length} roommates
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <X size={16} className="text-white" />
            </button>
          </div>

          <div className="relative grid grid-cols-3 gap-3 mt-5">
            {[
              { label: "To Collect", value: `$${totalToCollect.toLocaleString()}`, color: "white" },
              { label: "Collected", value: `$${totalPaid.toLocaleString()}`, color: "#34D399" },
              { label: "Rate", value: `${collectPct}%`, color: "#FCD34D" },
            ].map((s) => (
              <div
                key={s.label}
                className="px-3 py-2.5 rounded-xl text-center"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <div style={{ color: s.color, fontWeight: 800, fontSize: "18px" }}>{s.value}</div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "10px", fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex flex-wrap gap-2 px-5 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}
        >
          {[
            { label: linkCopied ? "Copied!" : "Copy Link", icon: Link2, onClick: onCopyLink, active: linkCopied, color: "#059669", bg: "#ECFDF5" },
            { label: "Public Link", icon: ExternalLink, onClick: onOpenPublicLink, color: "#4F46E5", bg: "#EEF2FF" },
            { label: "Edit", icon: Edit2, onClick: onEdit, color: "#D97706", bg: "#FFFBEB" },
            { label: "Duplicate", icon: Copy, onClick: onDuplicate, color: "#64748B", bg: "var(--muted)" },
            { label: "Mark Paid", icon: Check, onClick: onMarkPaid, color: "#059669", bg: "#ECFDF5" },
            { label: "Delete", icon: Trash2, onClick: onDelete, color: "#EF4444", bg: "#FEF2F2" },
          ].map((action) =>
            action.onClick ? (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all active:scale-95"
                style={{
                  background: action.active ? action.bg : action.bg,
                  color: action.color,
                  border: `1px solid ${action.color}22`,
                }}
              >
                <action.icon size={13} />
                {action.label}
              </button>
            ) : null
          )}
          <button
            type="button"
            onClick={() => { printPage(); showToast("Use Save as PDF in print dialog", "info"); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-white text-xs ml-auto"
            style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
          >
            <Download size={13} />
            Export PDF
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <BillAnnouncements
            announcementTitle={bill.announcementTitle}
            announcementMessage={bill.announcementMessage}
            globalMessageTitle={settings.globalMessageTitle}
            globalMessage={settings.globalMessage}
          />

          {collectionSummary && <CollectionSummaryCard summary={collectionSummary} compact />}

          {/* Distribution chart */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon size={16} style={{ color: "#4F46E5" }} />
              <h3 style={{ fontWeight: 700, fontSize: "15px" }}>Distribution</h3>
              <span style={{ color: "var(--muted-foreground)", fontSize: "12px", marginLeft: "auto" }}>
                ${pieTotal.toLocaleString()} total
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    innerRadius={52}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="var(--card)"
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      `$${v.toLocaleString()} (${pieTotal > 0 ? Math.round((v / pieTotal) * 100) : 0}%)`,
                      name,
                    ]}
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid var(--border)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between gap-3 p-2.5 rounded-xl" style={{ background: "var(--muted)" }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="truncate" style={{ fontSize: "12px", fontWeight: 600 }}>{d.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div style={{ fontSize: "13px", fontWeight: 700 }}>${d.value.toLocaleString()}</div>
                      <div style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                        {pieTotal > 0 ? Math.round((d.value / pieTotal) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-3" style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontWeight: 700, fontSize: "14px" }}>Expenses</h3>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {expenseRows.map((row) => {
                const payer = row.paidBy ? getRoommateById(roommates, row.paidBy) : null;
                return (
                  <div key={row.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "13px" }}>{row.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                        {row.id === 0
                          ? "All members"
                          : formatSharedByLabel(row, roommates, bill.selectedRoommateIds)}
                        {" · "}
                        {payer ? `Paid by ${payer.name.split(" ")[0]}` : "Unpaid"}
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: "15px", color: "#4F46E5" }}>
                      ${row.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Parking */}
          {bill.parkingSnapshot && getActiveParkingAssignments(bill.parkingSnapshot, bill.selectedRoommateIds).length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: "#ECFDF5", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Car size={15} style={{ color: "#059669" }} />
                <h3 style={{ fontWeight: 700, fontSize: "14px", color: "#065F46" }}>Parking</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {getActiveParkingAssignments(bill.parkingSnapshot, bill.selectedRoommateIds).map((a) => (
                  <div key={a.spotName} className="p-3 rounded-xl bg-white">
                    <div className="flex justify-between">
                      <span style={{ fontWeight: 600, fontSize: "12px" }}>{a.spotName}</span>
                      <span style={{ color: "#059669", fontWeight: 700 }}>${a.monthlyFee}</span>
                    </div>
                    <p style={{ fontSize: "10px", color: "#64748B", marginTop: 4 }}>
                      {formatParkingShareLabel(a, bill.selectedRoommateIds, roommates)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Roommates */}
          <div className="space-y-3">
            <h3 style={{ fontWeight: 700, fontSize: "15px" }}>Roommate Splits</h3>
            {roommateBreakdown.map((r) => {
              const sc = statusConfig[r.status];
              const remaining = Math.max(0, r.share - r.paid);
              return (
                <div
                  key={r.roommateId}
                  className="rounded-2xl p-4"
                  style={{ background: "var(--card)", border: `1.5px solid ${r.color}30` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: r.color }}
                    >
                      {r.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontWeight: 700, fontSize: "14px" }}>{r.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                        Rent {formatAmount(r.calc.rentShare, roundUp)}
                        {r.calc.expenseShare > 0 && ` + Exp ${formatAmount(r.calc.expenseShare, roundUp)}`}
                        {r.calc.parkingShare > 0 && ` + Parking ${formatAmount(r.calc.parkingShare, roundUp)}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div style={{ fontWeight: 800, fontSize: "17px", color: r.color }}>{formatAmount(r.share, roundUp)}</div>
                      <div className="flex items-center gap-1 justify-end">{sc.icon}<span style={{ color: sc.text, fontSize: "11px", fontWeight: 600 }}>{r.status}</span></div>
                    </div>
                  </div>
                  {remaining > 0 && r.status !== "Paid" && (
                    <div className="flex gap-2 mt-3">
                      {r.status === "Pending" && (
                        <button
                          type="button"
                          onClick={() => updatePayment(r.roommateId, Math.round(r.share / 2))}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold"
                          style={{ background: "#FFFBEB", color: "#D97706" }}
                        >
                          Mark Partial
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => updatePayment(r.roommateId, r.share)}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold text-white"
                        style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
                      >
                        Mark Paid
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function copyBillLink(billId: string, showToast: (msg: string, type: "success" | "error" | "info") => void) {
  const link = await getShareLink(billId);
  const ok = await copyToClipboard(link);
  if (ok) showToast("Share link copied!", "success");
  else showToast("Failed to copy link", "error");
  return ok;
}
