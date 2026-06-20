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
import { actionButtonStyle, payStatusStyle } from "@/lib/themeTokens";
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

const statusIcons: Record<string, ReactNode> = {
  Paid: <CheckCircle2 size={14} style={{ color: "var(--status-success-text)" }} />,
  Partial: <Clock size={14} style={{ color: "var(--status-warning-text)" }} />,
  Pending: <XCircle size={14} style={{ color: "var(--status-danger-text)" }} />,
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
    startEditingBill,
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
    startEditingBill(bill);
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
      {/* Compact header panel */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 12px var(--surface-tint)" }}
      >
        <div className="flex items-center gap-2.5 p-3 border-b" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={() => navigate("expenses")}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
          >
            <ArrowLeft size={14} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="truncate" style={{ fontWeight: 700, fontSize: "17px", letterSpacing: "-0.3px", color: "var(--foreground)" }}>
              {displayTitle}
            </h1>
            <p className="truncate" style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 1 }}>
              {bill.month} · {houseLabel}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
            {[
              { id: "link", label: linkCopied ? "Copied!" : "Link", icon: Link2, onClick: () => void handleCopyLink(), style: actionButtonStyle.success, title: "Copy share link" },
              { id: "public", label: "Public", icon: ExternalLink, onClick: () => void handleOpenPublic(), style: actionButtonStyle.primary, title: "Open public page" },
              { id: "edit", label: "Edit", icon: Edit2, onClick: handleEdit, style: actionButtonStyle.warning, title: "Edit bill" },
              { id: "duplicate", label: "Duplicate", icon: Copy, onClick: () => void duplicateBill(bill.id), style: actionButtonStyle.muted, title: "Duplicate bill" },
              { id: "paid", label: "Mark Paid", icon: Check, onClick: () => void markBillComplete(bill.id), style: actionButtonStyle.success, title: "Mark all paid" },
              { id: "delete", label: "Delete", icon: Trash2, onClick: () => setDeleteOpen(true), style: actionButtonStyle.danger, title: "Delete bill" },
            ].map((action) => (
              <button
                key={action.id}
                type="button"
                title={action.title}
                onClick={action.onClick}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg font-semibold text-[10px] transition-all active:scale-95"
                style={{
                  background: action.style.bg,
                  color: action.style.text,
                  border: `1px solid ${action.style.border}`,
                }}
              >
                <action.icon size={12} />
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
          {[
            { label: "To Collect", value: `$${totalToCollect.toLocaleString()}` },
            { label: "Collected", value: `$${totalPaid.toLocaleString()}`, accent: "var(--status-success-text)" },
            { label: "Rate", value: `${collectPct}%`, accent: "var(--chart-4)" },
            { label: "Members", value: String(bill.selectedRoommateIds.length), accent: "var(--primary)" },
          ].map((s) => (
            <div key={s.label} className="px-3 py-2.5 text-center" style={{ background: "var(--card)" }}>
              <div style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600 }}>{s.label}</div>
              <div style={{ color: s.accent ?? "var(--foreground)", fontWeight: 800, fontSize: "16px", marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="sm:hidden flex flex-wrap gap-1 p-2 border-t" style={{ borderColor: "var(--border)" }}>
          {[
            { id: "link", icon: Link2, onClick: () => void handleCopyLink(), style: actionButtonStyle.success, title: "Copy link" },
            { id: "public", icon: ExternalLink, onClick: () => void handleOpenPublic(), style: actionButtonStyle.primary, title: "Public page" },
            { id: "edit", icon: Edit2, onClick: handleEdit, style: actionButtonStyle.warning, title: "Edit" },
            { id: "duplicate", icon: Copy, onClick: () => void duplicateBill(bill.id), style: actionButtonStyle.muted, title: "Duplicate" },
            { id: "paid", icon: Check, onClick: () => void markBillComplete(bill.id), style: actionButtonStyle.success, title: "Mark paid" },
            { id: "delete", icon: Trash2, onClick: () => setDeleteOpen(true), style: actionButtonStyle.danger, title: "Delete" },
          ].map((action) => (
            <button
              key={action.id}
              type="button"
              title={action.title}
              onClick={action.onClick}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: action.style.bg, color: action.style.text, border: `1px solid ${action.style.border}` }}
            >
              <action.icon size={14} />
            </button>
          ))}
        </div>

        <p className="flex items-center gap-1.5 px-3 py-1.5" style={{ color: "var(--muted-foreground)", fontSize: "10px", borderTop: "1px solid var(--border)" }}>
          <Calendar size={10} />
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
            const sc = payStatusStyle[r.status];
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
                        {statusIcons[r.status]}
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
                          style={{ background: "var(--status-warning-bg)", color: "var(--status-warning-text)", border: "1px solid var(--action-warning-border)" }}
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
