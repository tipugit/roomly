import { useMemo, useState, useEffect, type ReactNode } from "react";
import {
  ArrowLeft,
  Link2,
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
  Calendar,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "@/context/AppContext";
import { BillAnnouncements } from "@/components/BillAnnouncements";
import { CollectionSummaryCard } from "@/components/CollectionSummaryCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MemberCalculationPanel } from "@/components/MemberCalculationPanel";
import {
  buildMemberCalculationSteps,
  buildMemberShareBreakdown,
  calcCollectionSummary,
  copyBillLink,
  formatAmount,
  formatParkingShareLabel,
  formatSharedByLabel,
  getActiveParkingAssignments,
  getBillExpensesWithRent,
  getCategoryColor,
  getMemberAmountDue,
  getRoommateById,
  getShareLink,
  normalizeBillShares,
} from "@/lib/utils";

const statusConfig: Record<string, { bg: string; text: string; icon: ReactNode }> = {
  Paid: { bg: "#ECFDF5", text: "#059669", icon: <CheckCircle2 size={14} style={{ color: "#059669" }} /> },
  Partial: { bg: "#FFFBEB", text: "#D97706", icon: <Clock size={14} style={{ color: "#D97706" }} /> },
  Pending: { bg: "#FEF2F2", text: "#EF4444", icon: <XCircle size={14} style={{ color: "#EF4444" }} /> },
};

interface BillViewPageProps {
  billId: string;
}

export function BillViewPage({ billId }: BillViewPageProps) {
  const {
    bills,
    roommates,
    settings,
    updatePayment,
    showToast,
    navigate,
    setEditingBill,
    duplicateBill,
    markBillComplete,
    deleteBill,
    setActiveBillId,
  } = useApp();

  const [linkCopied, setLinkCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    void setActiveBillId(billId);
  }, [billId, setActiveBillId]);

  const bill = bills.find((b) => b.id === billId) ?? null;
  const roundUp = settings.roundUpAmounts ?? false;

  const expenseRows = useMemo(
    () => (bill ? getBillExpensesWithRent(bill) : []),
    [bill]
  );

  const roommateBreakdown = useMemo(() => {
    if (!bill) return [];
    const shares = normalizeBillShares(bill, roundUp);
    return shares.map((rs) => {
      const roommate = getRoommateById(roommates, rs.roommateId);
      const calc = buildMemberShareBreakdown(
        rs.roommateId,
        bill.selectedRoommateIds,
        bill.rent,
        bill.expenses,
        bill.parkingSnapshot,
        roundUp
      );
      const calcLines = buildMemberCalculationSteps(
        rs.roommateId,
        bill.rent,
        bill.expenses,
        bill.selectedRoommateIds,
        bill.parkingSnapshot,
        roommates,
        rs.paid,
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
        amountDue: getMemberAmountDue(rs),
        status: rs.status,
        calc,
        calcLines,
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

  if (!bill) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <h2 style={{ fontWeight: 700, fontSize: "18px" }}>Bill not found</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: 8 }}>
          This bill may have been deleted.
        </p>
        <button
          type="button"
          onClick={() => navigate("expenses")}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold"
          style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", fontSize: "13px" }}
        >
          <ArrowLeft size={14} />
          Back to All Bills
        </button>
      </div>
    );
  }

  const displayTitle = bill.title || bill.month;
  const houseLabel = bill.houseName || settings.houseName;

  const handleEdit = () => {
    setEditingBill(bill);
    navigate("bills");
    showToast("Editing bill — save to update", "info");
  };

  const handleCopyLink = async () => {
    const ok = await copyBillLink(bill.id, showToast);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  const handleOpenPublic = async () => {
    const link = await getShareLink(bill.id);
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async () => {
    await deleteBill(bill.id);
    setDeleteOpen(false);
    navigate("expenses");
  };

  return (
    <div className="max-w-[900px] mx-auto space-y-4 pb-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate("expenses")}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <ArrowLeft size={15} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate" style={{ fontWeight: 800, fontSize: "clamp(20px, 5vw, 26px)", letterSpacing: "-0.5px" }}>
              {displayTitle}
            </h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>
              {bill.month} · {houseLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { label: linkCopied ? "Copied!" : "Copy Link", icon: Link2, onClick: handleCopyLink, color: "#059669", bg: "#ECFDF5" },
            { label: "Public Link", icon: ExternalLink, onClick: handleOpenPublic, color: "#4F46E5", bg: "#EEF2FF" },
            { label: "Edit", icon: Edit2, onClick: handleEdit, color: "#D97706", bg: "#FFFBEB" },
            { label: "Duplicate", icon: Copy, onClick: () => void duplicateBill(bill.id), color: "#64748B", bg: "var(--muted)" },
            { label: "Mark Paid", icon: Check, onClick: () => void markBillComplete(bill.id), color: "#059669", bg: "#ECFDF5" },
            { label: "Delete", icon: Trash2, onClick: () => setDeleteOpen(true), color: "#EF4444", bg: "#FEF2F2" },
          ].map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs transition-all active:scale-95"
              style={{ background: action.bg, color: action.color, border: `1px solid ${action.color}22` }}
            >
              <action.icon size={13} />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #312E81 0%, #4F46E5 50%, #7C3AED 100%)",
          boxShadow: "0 12px 40px rgba(79,70,229,0.2)",
        }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "To Collect", value: `$${totalToCollect.toLocaleString()}`, color: "white" },
            { label: "Collected", value: `$${totalPaid.toLocaleString()}`, color: "#34D399" },
            { label: "Rate", value: `${collectPct}%`, color: "#FCD34D" },
            { label: "Members", value: String(bill.selectedRoommateIds.length), color: "#A5B4FC" },
          ].map((s) => (
            <div key={s.label} className="px-3 py-2.5 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.12)" }}>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "10px", fontWeight: 600 }}>{s.label}</div>
              <div style={{ color: s.color, fontWeight: 800, fontSize: "20px", marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>
        <p className="flex items-center gap-1.5 mt-3" style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>
          <Calendar size={11} />
          Created {bill.createdAt}
        </p>
      </div>

      <BillAnnouncements
        announcementTitle={bill.announcementTitle}
        announcementMessage={bill.announcementMessage}
        globalMessageTitle={settings.globalMessageTitle}
        globalMessage={settings.globalMessage}
      />

      {collectionSummary && <CollectionSummaryCard summary={collectionSummary} compact />}

      {/* Chart + expenses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <PieChartIcon size={15} style={{ color: "#4F46E5" }} />
            <h3 style={{ fontWeight: 700, fontSize: "14px" }}>Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={72} innerRadius={42} dataKey="value" strokeWidth={2} stroke="var(--card)">
                {pieData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} contentStyle={{ borderRadius: 10, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="px-4 py-3" style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontWeight: 700, fontSize: "14px" }}>Expenses</h3>
          </div>
          <div className="divide-y max-h-[240px] overflow-y-auto" style={{ borderColor: "var(--border)" }}>
            {expenseRows.map((row) => {
              const payer = row.paidBy ? getRoommateById(roommates, row.paidBy) : null;
              return (
                <div key={row.id} className="flex justify-between px-4 py-2.5 gap-2">
                  <div className="min-w-0">
                    <div style={{ fontWeight: 600, fontSize: "12px" }}>{row.name}</div>
                    <div style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                      {row.id === 0 ? "All members" : formatSharedByLabel(row, roommates, bill.selectedRoommateIds)}
                      {payer ? ` · Paid by ${payer.name.split(" ")[0]}` : " · Unpaid"}
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: "#4F46E5", flexShrink: 0 }}>
                    ${row.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {bill.parkingSnapshot && getActiveParkingAssignments(bill.parkingSnapshot, bill.selectedRoommateIds).length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "#ECFDF5", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Car size={14} style={{ color: "#059669" }} />
            <h3 style={{ fontWeight: 700, fontSize: "13px", color: "#065F46" }}>Parking</h3>
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

      {/* Member cards — full width, stacked */}
      <div>
        <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: 8 }}>Member Balances</h3>
        <div className="space-y-3">
          {roommateBreakdown.map((r) => {
            const sc = statusConfig[r.status];
            const remaining = r.amountDue;
            return (
              <div
                key={r.roommateId}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "var(--card)",
                  border: `2px solid ${r.color}`,
                  boxShadow: `0 4px 20px ${r.color}18`,
                }}
              >
                <div className="p-4" style={{ background: `${r.color}08` }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0"
                      style={{ background: r.color, boxShadow: `0 4px 12px ${r.color}40` }}
                    >
                      {r.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontWeight: 700, fontSize: "15px" }}>{r.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Room {r.room}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: 600 }}>OWES</div>
                      <div style={{ fontWeight: 900, fontSize: "22px", color: r.color, letterSpacing: "-0.5px" }}>
                        {formatAmount(remaining, roundUp)}
                      </div>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        {sc.icon}
                        <span style={{ color: sc.text, fontSize: "11px", fontWeight: 600 }}>{r.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <MemberCalculationPanel lines={r.calcLines} roundUp={roundUp} accentColor={r.color} />

                  {remaining > 0 && r.status !== "Paid" && (
                    <div className="flex gap-2 mt-3">
                      {r.status === "Pending" && (
                        <button
                          type="button"
                          onClick={() => updatePayment(r.roommateId, Math.round(r.share / 2))}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                          style={{ background: "#FFFBEB", color: "#D97706", border: "1px solid rgba(217,119,6,0.2)" }}
                        >
                          Mark Partial
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => updatePayment(r.roommateId, r.share)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white"
                        style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
                      >
                        Mark Paid
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this bill?"
        message={`"${displayTitle}" will be permanently removed.`}
        confirmLabel="Delete Bill"
        variant="danger"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
