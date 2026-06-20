import { useMemo, useState, useEffect, type ReactNode } from "react";
import {
  ArrowLeft,
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
  Calendar,
  Users,
  DollarSign,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "@/context/AppContext";
import { BillAnnouncements } from "@/components/BillAnnouncements";
import { CollectionSummaryCard } from "@/components/CollectionSummaryCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { printPage } from "@/lib/print";
import {
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
    <div className="max-w-[1100px] mx-auto space-y-5 pb-4">
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <button
            type="button"
            onClick={() => { printPage(); showToast("Use Save as PDF in print dialog", "info"); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-white text-xs"
            style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
          >
            <Download size={13} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Hero stats */}
      <div
        className="rounded-3xl p-6 sm:p-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #312E81 0%, #4F46E5 45%, #7C3AED 75%, #0D9488 100%)",
          boxShadow: "0 16px 48px rgba(79,70,229,0.25)",
        }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30" style={{ background: "#06B6D4", filter: "blur(40px)" }} />
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "To Collect", value: `$${totalToCollect.toLocaleString()}`, icon: DollarSign, color: "white" },
            { label: "Collected", value: `$${totalPaid.toLocaleString()}`, icon: CheckCircle2, color: "#34D399" },
            { label: "Collection Rate", value: `${collectPct}%`, icon: PieChartIcon, color: "#FCD34D" },
            { label: "Roommates", value: String(bill.selectedRoommateIds.length), icon: Users, color: "#A5B4FC" },
          ].map((s) => (
            <div
              key={s.label}
              className="px-4 py-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={14} style={{ color: s.color, opacity: 0.9 }} />
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "10px", fontWeight: 600 }}>{s.label}</span>
              </div>
              <div style={{ color: s.color, fontWeight: 800, fontSize: "22px" }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="relative flex flex-wrap gap-4 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
          <span className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.65)", fontSize: "11px" }}>
            <Calendar size={12} />
            Created {bill.createdAt}
          </span>
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "11px" }}>
            {bill.expenses.length} expense{bill.expenses.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <BillAnnouncements
        announcementTitle={bill.announcementTitle}
        announcementMessage={bill.announcementMessage}
        globalMessageTitle={settings.globalMessageTitle}
        globalMessage={settings.globalMessage}
      />

      {collectionSummary && <CollectionSummaryCard summary={collectionSummary} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Distribution */}
        <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon size={16} style={{ color: "#4F46E5" }} />
            <h3 style={{ fontWeight: 700, fontSize: "15px" }}>Distribution</h3>
            <span style={{ color: "var(--muted-foreground)", fontSize: "12px", marginLeft: "auto" }}>
              ${pieTotal.toLocaleString()} total
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={88} innerRadius={52} dataKey="value" strokeWidth={2} stroke="var(--card)">
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
          <div className="space-y-2 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between gap-3 p-2 rounded-xl" style={{ background: "var(--muted)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="truncate" style={{ fontSize: "12px", fontWeight: 600 }}>{d.name}</span>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>${d.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses list */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-3" style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontWeight: 700, fontSize: "14px" }}>Expenses</h3>
          </div>
          <div className="divide-y max-h-[420px] overflow-y-auto" style={{ borderColor: "var(--border)" }}>
            {expenseRows.map((row) => {
              const payer = row.paidBy ? getRoommateById(roommates, row.paidBy) : null;
              return (
                <div key={row.id} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="min-w-0">
                    <div style={{ fontWeight: 600, fontSize: "13px" }}>{row.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {row.id === 0
                        ? "All members"
                        : formatSharedByLabel(row, roommates, bill.selectedRoommateIds)}
                      {" · "}
                      {payer ? `Paid by ${payer.name.split(" ")[0]}` : "Unpaid"}
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: "15px", color: "#4F46E5", flexShrink: 0 }}>
                    ${row.amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Parking */}
      {bill.parkingSnapshot && getActiveParkingAssignments(bill.parkingSnapshot, bill.selectedRoommateIds).length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "#ECFDF5", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Car size={15} style={{ color: "#059669" }} />
            <h3 style={{ fontWeight: 700, fontSize: "14px", color: "#065F46" }}>Parking</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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

      {/* Roommate splits */}
      <div>
        <h3 style={{ fontWeight: 700, fontSize: "16px", marginBottom: 12 }}>Roommate Splits</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {roommateBreakdown.map((r) => {
            const sc = statusConfig[r.status];
            const remaining = r.amountDue;
            return (
              <div
                key={r.roommateId}
                className="rounded-2xl p-4"
                style={{ background: "var(--card)", border: `1.5px solid ${r.color}30` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: r.color }}
                  >
                    {r.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontWeight: 700, fontSize: "14px" }}>{r.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      Room {r.room} · Rent {formatAmount(r.calc.rentShare, roundUp)}
                      {r.calc.expenseShare > 0 && ` + Exp ${formatAmount(r.calc.expenseShare, roundUp)}`}
                      {r.calc.parkingShare > 0 && ` + Parking ${formatAmount(r.calc.parkingShare, roundUp)}`}
                      {r.calc.upfrontPaid > 0 && ` − Prepaid ${formatAmount(r.calc.upfrontPaid, roundUp)}`}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div style={{ fontWeight: 800, fontSize: "17px", color: r.color }}>{formatAmount(remaining, roundUp)}</div>
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
