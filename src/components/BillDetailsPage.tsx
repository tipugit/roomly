import { useMemo, useState, type ReactNode } from "react";
import {
  Link2,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Share2,
  ExternalLink,
  FileText,
  Plus,
  Copy,
  Trash2,
  Check,
  Car,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "@/context/AppContext";
import { BillAnnouncements } from "@/components/BillAnnouncements";
import { CollectionSummaryCard } from "@/components/CollectionSummaryCard";
import { printPage } from "@/lib/print";
import {
  buildMemberShareBreakdown,
  calcBillTotal,
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

interface BillDetailsPageProps {
  onBack?: () => void;
  onShareView?: () => void;
}

export function BillDetailsPage({ onBack, onShareView }: BillDetailsPageProps) {
  const {
    activeBill,
    bills,
    roommates,
    settings,
    updatePayment,
    showToast,
    navigate,
    setActiveBillId,
    deleteBill,
    duplicateBill,
    markBillComplete,
  } = useApp();
  const [linkCopied, setLinkCopied] = useState<string | null>(null);
  const roundUp = settings.roundUpAmounts ?? false;

  const expenseRows = useMemo(
    () => (activeBill ? getBillExpensesWithRent(activeBill) : []),
    [activeBill]
  );

  const roommateBreakdown = useMemo(() => {
    if (!activeBill) return [];
    return activeBill.roommateShares.map((rs) => {
      const roommate = getRoommateById(roommates, rs.roommateId);
      const calc = buildMemberShareBreakdown(
        rs.roommateId,
        activeBill.selectedRoommateIds,
        activeBill.rent,
        activeBill.expenses,
        activeBill.parkingSnapshot,
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
  }, [activeBill, roommates, roundUp]);

  const total = activeBill ? calcBillTotal(activeBill.rent, activeBill.expenses) : 0;
  const collectionSummary = activeBill ? calcCollectionSummary(activeBill) : null;
  const totalPaid = collectionSummary?.totalPaid ?? 0;
  const totalToCollect = collectionSummary?.totalToCollect ?? total;
  const collectPct = totalToCollect > 0 ? Math.round((totalPaid / totalToCollect) * 100) : 0;

  const pieData = expenseRows.map((e) => ({
    name: e.category,
    value: e.amount,
    color: getCategoryColor(e.category),
  }));

  const copyLink = async (billId: string) => {
    const link = await getShareLink(billId);
    const ok = await copyToClipboard(link);
    if (ok) {
      setLinkCopied(billId);
      showToast("Share link copied!", "success");
      setTimeout(() => setLinkCopied(null), 2500);
    } else {
      showToast("Failed to copy link", "error");
    }
  };

  const handleExportPdf = () => {
    printPage();
    showToast("Use Save as PDF in the print dialog", "info");
  };

  const isBillComplete = (bill: typeof activeBill) =>
    bill?.completed ?? bill?.roommateShares.every((rs) => rs.status === "Paid");

  if (!activeBill && bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 max-w-md mx-auto text-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
          style={{ background: "var(--muted)" }}
        >
          <FileText size={32} style={{ color: "var(--muted-foreground)" }} />
        </div>
        <h2 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "20px" }}>No bills yet</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: 8 }}>
          Create a monthly bill to view expenses, roommate splits, and share links.
        </p>
        <button
          onClick={() => navigate("bills")}
          className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
            fontSize: "13px",
            boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
          }}
        >
          <Plus size={15} />
          Create Bill
        </button>
      </div>
    );
  }

  const houseLabel = activeBill?.houseName || settings.houseName;
  const roommateCount = activeBill?.selectedRoommateIds.length ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 active:scale-95"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(79,70,229,0.08)" }}
            >
              <ArrowLeft size={15} style={{ color: "var(--foreground)" }} />
            </button>
          )}
          <div>
            <h1 style={{ color: "var(--foreground)", fontWeight: 800, fontSize: "clamp(20px, 5vw, 26px)", letterSpacing: "-0.5px" }}>
              All Bills
            </h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>
              {bills.length} bill{bills.length !== 1 ? "s" : ""} created
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("bills")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-semibold self-start active:scale-95"
          style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", fontSize: "13px" }}
        >
          <Plus size={14} />
          New Bill
        </button>
      </div>

      {/* All bills — card grid */}
      <div>
        <h2 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px", marginBottom: 12 }}>
          Your Bills
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {bills.map((bill) => {
            const summary = calcCollectionSummary(bill);
            const complete = isBillComplete(bill);
            const isActive = activeBill?.id === bill.id;
            const paidShares = bill.roommateShares.filter((s) => s.status === "Paid").length;
            const totalShares = bill.roommateShares.length;

            return (
              <div
                key={bill.id}
                className="rounded-2xl overflow-hidden transition-all cursor-pointer"
                style={{
                  background: "var(--card)",
                  border: isActive ? "2px solid #4F46E5" : "1px solid var(--border)",
                  boxShadow: isActive
                    ? "0 8px 32px rgba(79,70,229,0.18)"
                    : "0 2px 16px rgba(79,70,229,0.06)",
                }}
                onClick={() => void setActiveBillId(bill.id)}
              >
                <div
                  className="p-5"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #EEF2FF, #F5F3FF)"
                      : "var(--card)",
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "16px" }}>
                          {bill.month}
                        </h3>
                        {bill.isExtraBill && (
                          <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#FEF3C7", color: "#D97706" }}>
                            Extra
                          </span>
                        )}
                      </div>
                      <p style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 2 }}>
                        {bill.createdAt} · {bill.selectedRoommateIds.length} roommates
                      </p>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: complete ? "#ECFDF5" : "#FFFBEB",
                        color: complete ? "#059669" : "#D97706",
                      }}
                    >
                      {complete ? "Completed" : "Open"}
                    </span>
                  </div>

                  <div
                    className="p-3 rounded-xl mb-3"
                    style={{ background: isActive ? "white" : "var(--muted)" }}
                  >
                    <p style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px" }}>
                      TOTAL TO COLLECT
                    </p>
                    <p style={{ color: "#4F46E5", fontWeight: 900, fontSize: "26px", letterSpacing: "-0.5px" }}>
                      ${summary.totalToCollect.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(79,70,229,0.1)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${totalShares > 0 ? (paidShares / totalShares) * 100 : 0}%`,
                            background: "linear-gradient(90deg, #4F46E5, #10B981)",
                          }}
                        />
                      </div>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600 }}>
                        {paidShares}/{totalShares} paid
                      </span>
                    </div>
                  </div>

                  <p style={{ color: "var(--muted-foreground)", fontSize: "11px", marginBottom: 10, textAlign: "center" }}>
                    {isActive ? "Viewing full bill below" : "Click to open full bill"}
                  </p>

                  <div
                    className="grid grid-cols-3 gap-1 pt-3"
                    style={{ borderTop: "1px solid var(--border)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[
                      { icon: Link2, label: "Copy", action: () => copyLink(bill.id), active: linkCopied === bill.id },
                      { icon: Copy, label: "Duplicate", action: () => void duplicateBill(bill.id) },
                      { icon: Check, label: "Paid", action: () => void markBillComplete(bill.id) },
                      { icon: ExternalLink, label: "Public", action: () => { void setActiveBillId(bill.id).then(() => onShareView?.()); } },
                      { icon: Download, label: "PDF", action: () => { void setActiveBillId(bill.id).then(handleExportPdf); } },
                      { icon: Trash2, label: "Delete", action: () => { if (confirm(`Delete ${bill.month}?`)) void deleteBill(bill.id); } },
                    ].map(({ icon: Icon, label, action, active }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={action}
                        className="flex flex-col items-center gap-1 py-2 rounded-xl transition-all active:scale-95"
                        style={{
                          background: active ? "#ECFDF5" : "transparent",
                        }}
                      >
                        <div
                          className="w-8 h-8 flex items-center justify-center rounded-lg"
                          style={{
                            background: active ? "#D1FAE5" : "var(--muted)",
                            color: active ? "#059669" : "var(--muted-foreground)",
                          }}
                        >
                          <Icon size={13} />
                        </div>
                        <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--muted-foreground)" }}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeBill && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "18px" }}>
                {activeBill.month}
              </h2>
              <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>
                {houseLabel} · {roommateCount} roommates
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
              <button
                onClick={() => copyLink(activeBill.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all flex-shrink-0 active:scale-95"
                style={{
                  background: linkCopied === activeBill.id ? "#ECFDF5" : "var(--card)",
                  border: `1.5px solid ${linkCopied === activeBill.id ? "#10B981" : "var(--border)"}`,
                  color: linkCopied === activeBill.id ? "#059669" : "var(--foreground)",
                  fontSize: "12px",
                }}
              >
                {linkCopied === activeBill.id ? <CheckCircle2 size={13} /> : <Link2 size={13} />}
                {linkCopied === activeBill.id ? "Copied!" : "Copy Link"}
              </button>
              {onShareView && (
                <button
                  onClick={onShareView}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all flex-shrink-0 active:scale-95"
                  style={{ background: "#EEF2FF", color: "#4F46E5", border: "1.5px solid rgba(79,70,229,0.2)", fontSize: "12px" }}
                >
                  <ExternalLink size={13} />
                  Public Page
                </button>
              )}
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-semibold flex-shrink-0 active:scale-95"
                style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", fontSize: "13px", boxShadow: "0 4px 14px rgba(79,70,229,0.3)" }}
              >
                <Download size={14} />
                Export PDF
              </button>
            </div>
          </div>

          <div
            className="rounded-3xl p-7 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0F0D2A 0%, #1E1B4B 50%, #162044 100%)",
              boxShadow: "0 20px 60px rgba(15,13,42,0.35)",
            }}
          >
            <div className="relative flex flex-wrap gap-8 items-center">
              <div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.8px" }}>TOTAL TO COLLECT</div>
                <div style={{ color: "white", fontWeight: 900, fontSize: "44px", letterSpacing: "-1.5px", lineHeight: 1 }}>
                  ${totalToCollect.toLocaleString()}
                </div>
              </div>
              {[
                { label: "Collected", value: `$${totalPaid.toLocaleString()}`, color: "#34D399" },
                { label: "Remaining", value: `$${Math.max(0, collectionSummary?.outstanding ?? 0).toLocaleString()}`, color: "#F87171" },
                { label: "Collection Rate", value: `${collectPct}%`, color: "#FCD34D" },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px", fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ color: s.color, fontWeight: 800, fontSize: "22px" }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          <BillAnnouncements
            announcementTitle={activeBill.announcementTitle}
            announcementMessage={activeBill.announcementMessage}
            globalMessageTitle={settings.globalMessageTitle}
            globalMessage={settings.globalMessage}
          />

          {collectionSummary && <CollectionSummaryCard summary={collectionSummary} />}

          {activeBill.parkingSnapshot && getActiveParkingAssignments(activeBill.parkingSnapshot, activeBill.selectedRoommateIds).length > 0 && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 20px rgba(79,70,229,0.06)" }}
            >
              <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
                <Car size={16} style={{ color: "#0D9488" }} />
                <div>
                  <h3 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>Parking Assignments</h3>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 2 }}>
                    {activeBill.parkingSnapshot.parkingIncludedInRent
                      ? "Fees deducted from rent before splitting"
                      : "Fees added on top of rent share"}
                  </p>
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getActiveParkingAssignments(activeBill.parkingSnapshot, activeBill.selectedRoommateIds).map((a) => {
                  const assignee = getRoommateById(roommates, a.roommateId!);
                  const shareLabel = formatParkingShareLabel(a, activeBill.selectedRoommateIds, roommates);
                  const sharerCount = a.shareSpace ? activeBill.selectedRoommateIds.length : 1;
                  const perPerson = sharerCount > 0 ? a.monthlyFee / sharerCount : 0;
                  return (
                    <div
                      key={a.spotName}
                      className="p-4 rounded-xl"
                      style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p style={{ fontWeight: 600, fontSize: "13px" }}>{a.spotName}</p>
                          <p style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 2 }}>
                            Assigned: {assignee?.name.split(" ")[0] ?? "—"}
                          </p>
                        </div>
                        <span style={{ color: "#0D9488", fontWeight: 700, fontSize: "14px" }}>
                          ${a.monthlyFee}/mo
                        </span>
                      </div>
                      {a.shareSpace ? (
                        <div className="px-3 py-2 rounded-lg" style={{ background: "#ECFDF5", border: "1px solid rgba(16,185,129,0.15)" }}>
                          <p style={{ color: "#059669", fontSize: "11px", fontWeight: 600 }}>
                            Share Space — {shareLabel}
                          </p>
                          <p style={{ color: "#64748B", fontSize: "10px", marginTop: 2 }}>
                            ${perPerson.toFixed(2)} per member
                          </p>
                        </div>
                      ) : (
                        <p style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>
                          Exclusive — {assignee?.name.split(" ")[0]} pays full ${a.monthlyFee}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Side-by-side expenses and roommates */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 20px rgba(79,70,229,0.06)" }}
            >
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
                <h3 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>Expenses</h3>
              </div>
              <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                <table className="w-full" style={{ minWidth: 400 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Item", "Amount", "Shared By"].map((h) => (
                        <th key={h} className="text-left px-4 py-2" style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600 }}>
                          {h.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenseRows.map((row) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="px-4 py-3">
                          <span style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 600 }}>{row.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span style={{ fontWeight: 700 }}>${row.amount.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
                            {row.id === 0
                              ? "All members"
                              : formatSharedByLabel(row, roommates, activeBill.selectedRoommateIds)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 20px rgba(79,70,229,0.06)" }}
            >
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
                <h3 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>Roommates</h3>
                {roundUp && (
                  <p style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 2 }}>
                    Amounts rounded up to nearest dollar
                  </p>
                )}
              </div>
              <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
                {roommateBreakdown.map((r) => {
                  const sc = statusConfig[r.status];
                  const remaining = Math.max(0, r.share - r.paid);
                  return (
                    <div
                      key={r.roommateId}
                      className="rounded-xl p-4"
                      style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: r.color }}
                        >
                          {r.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div style={{ fontWeight: 600, fontSize: "13px" }}>{r.name}</div>
                          <div style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>
                            Rent {formatAmount(r.calc.rentShare, roundUp)}
                            {r.calc.expenseShare > 0 && ` + Exp ${formatAmount(r.calc.expenseShare, roundUp)}`}
                            {r.calc.parkingShare > 0 && ` + Parking ${formatAmount(r.calc.parkingShare, roundUp)}`}
                            {" = "}
                            <strong style={{ color: "var(--foreground)" }}>{formatAmount(r.calc.total, roundUp)}</strong>
                          </div>
                        </div>
                        <div className="text-right">
                          <div style={{ fontWeight: 700 }}>{formatAmount(r.share, roundUp)}</div>
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            {sc.icon}
                            <span style={{ color: sc.text, fontSize: "11px", fontWeight: 600 }}>{r.status}</span>
                          </div>
                        </div>
                      </div>
                      {remaining > 0 && (
                        <div style={{ color: "#EF4444", fontSize: "11px", marginBottom: 8 }}>
                          Owes {formatAmount(remaining, roundUp)}
                        </div>
                      )}
                      {r.status !== "Paid" && (
                        <div className="flex gap-2">
                          {r.status === "Pending" && (
                            <button
                              onClick={() => updatePayment(r.roommateId, Math.round(r.share / 2))}
                              className="flex-1 py-2 rounded-xl font-semibold text-xs"
                              style={{ background: "#FFFBEB", color: "#D97706", border: "1px solid rgba(245,158,11,0.3)" }}
                            >
                              Mark Partial
                            </button>
                          )}
                          <button
                            onClick={() => updatePayment(r.roommateId, r.share)}
                            className="flex-1 py-2 rounded-xl font-semibold text-white text-xs"
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div
              className="lg:col-span-2 rounded-2xl p-5"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <h3 className="mb-4" style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>Distribution</h3>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} innerRadius={45} dataKey="value" strokeWidth={0}>
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${v}`, ""]} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)", border: "1.5px solid rgba(79,70,229,0.2)" }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
              >
                <Share2 size={20} className="text-white" />
              </div>
              <h3 style={{ color: "#1E1B4B", fontWeight: 700, fontSize: "15px", marginBottom: 4 }}>Share with Roommates</h3>
              <button
                onClick={() => { copyLink(activeBill.id); onShareView?.(); }}
                className="w-full py-3 rounded-xl font-bold text-white mt-4 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", fontSize: "13px" }}
              >
                <Link2 size={14} />
                Generate Share Link
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
