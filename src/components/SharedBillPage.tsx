import { useMemo, type ReactNode } from "react";
import {
  Home,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  Shield,
  FileText,
  Car,
  Calculator,
  Users,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "@/context/AppContext";
import { BillAnnouncements } from "@/components/BillAnnouncements";
import { CollectionSummaryCard } from "@/components/CollectionSummaryCard";
import { MemberCalculationPanel } from "@/components/MemberCalculationPanel";
import {
  buildMemberCalculationSteps,
  buildMemberShareBreakdown,
  calcCollectionSummary,
  formatCurrencyDetailed,
  formatParkingShareLabel,
  formatSharedByLabel,
  getActiveParkingAssignments,
  getBillExpensesWithRent,
  getCategoryColor,
  getCategoryIcon,
  getMemberAmountDue,
  getRentPoolForSharing,
  getParkingShareMemberIds,
  getRoommateById,
  normalizeBillShares,
} from "@/lib/utils";

const statusConfig: Record<string, { bg: string; text: string; icon: ReactNode; label: string }> = {
  Paid: { bg: "#ECFDF5", text: "#059669", label: "Paid", icon: <CheckCircle2 size={15} style={{ color: "#059669" }} /> },
  Partial: { bg: "#FFFBEB", text: "#D97706", label: "Partial", icon: <Clock size={15} style={{ color: "#D97706" }} /> },
  Pending: { bg: "#FEF2F2", text: "#EF4444", label: "Pending", icon: <XCircle size={15} style={{ color: "#EF4444" }} /> },
};

interface SharedBillPageProps {
  onBack?: () => void;
}

export function SharedBillPage({ onBack }: SharedBillPageProps) {
  const { activeBill, roommates, settings, sharedPayload } = useApp();

  const bill = sharedPayload?.bill ?? activeBill;
  const houseName = sharedPayload?.houseName ?? settings.houseName;
  const address = sharedPayload?.address ?? settings.address;
  const globalMessageTitle = sharedPayload?.globalMessageTitle ?? settings.globalMessageTitle;
  const globalMessage = sharedPayload?.globalMessage ?? settings.globalMessage;

  const billRoommates = useMemo(() => {
    if (sharedPayload) {
      return sharedPayload.roommates.map((r) => ({
        id: r.id,
        name: r.name,
        room: r.room,
        initials: r.initials,
        color: r.color,
      }));
    }
    return roommates;
  }, [sharedPayload, roommates]);

  const expenses = useMemo(
    () => (bill ? getBillExpensesWithRent(bill) : []),
    [bill]
  );

  const roommateRows = useMemo(() => {
    if (!bill) return [];
    const roundUp = settings.roundUpAmounts ?? false;
    const shares = normalizeBillShares(bill, roundUp);
    return shares.map((rs) => {
      const roommate = sharedPayload
        ? billRoommates.find((r) => r.id === rs.roommateId)
        : getRoommateById(roommates, rs.roommateId);
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
        billRoommates,
        rs.paid,
        roundUp
      );
      const amountDue = getMemberAmountDue(rs);
      return {
        roommateId: rs.roommateId,
        name: roommate?.name ?? "Unknown",
        room: roommate?.room ?? "—",
        initials: roommate?.initials ?? "?",
        color: roommate?.color ?? "#64748B",
        share: rs.share,
        paid: rs.paid,
        amountDue,
        status: rs.status,
        calc,
        calcLines,
      };
    });
  }, [bill, billRoommates, roommates, sharedPayload, settings.roundUpAmounts]);

  const collectionSummary = bill ? calcCollectionSummary(bill) : null;
  const totalToCollect = collectionSummary?.totalToCollect ?? 0;
  const totalCollected = collectionSummary?.totalPaid ?? 0;
  const paidCount = roommateRows.filter((r) => r.status === "Paid").length;
  const roommateCount = bill?.selectedRoommateIds.length ?? 0;

  const rentCalc = useMemo(() => {
    if (!bill) return null;
    return getRentPoolForSharing(bill.rent, bill.parkingSnapshot, bill.selectedRoommateIds);
  }, [bill]);

  const parkingAssignments = useMemo(() => {
    if (!bill) return [];
    return getActiveParkingAssignments(bill.parkingSnapshot, bill.selectedRoommateIds);
  }, [bill]);

  const pieData = expenses.map((e) => ({
    name: e.name,
    value: e.amount,
    color: getCategoryColor(e.category),
  }));

  const avgShare =
    roommateRows.length > 0
      ? roommateRows.reduce((s, r) => s + r.share, 0) / roommateRows.length
      : 0;

  if (!bill) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: "linear-gradient(160deg, #F0F4FF 0%, #F8FAFC 60%, #FDF4FF 100%)", fontFamily: "'Inter', sans-serif" }}
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
          style={{ background: "white", border: "1px solid rgba(79,70,229,0.1)", boxShadow: "0 8px 32px rgba(79,70,229,0.1)" }}
        >
          <FileText size={32} style={{ color: "#94A3B8" }} />
        </div>
        <h2 style={{ color: "#0F0D2A", fontWeight: 700, fontSize: "20px" }}>Bill not found</h2>
        <p style={{ color: "#64748B", fontSize: "13px", marginTop: 8, textAlign: "center" }}>
          This shared bill link may be expired or the bill hasn't been created yet.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-6 flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold transition-all"
            style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "white", fontSize: "13px" }}
          >
            <ChevronLeft size={14} />
            Go Back
          </button>
        )}
      </div>
    );
  }

  const displayHouseName = bill.houseName || houseName;
  const validUntil = (() => {
    const d = new Date(bill.createdAt);
    if (Number.isNaN(d.getTime())) return "July 12, 2026";
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  })();

  const rentPerPerson = rentCalc && roommateCount > 0 ? rentCalc.rentPool / roommateCount : 0;

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #F0F4FF 0%, #F8FAFC 60%, #FDF4FF 100%)", fontFamily: "'Inter', sans-serif" }}
    >
      <div
        className="no-print sticky top-0 z-10"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(79,70,229,0.12)",
          boxShadow: "0 1px 12px rgba(79,70,229,0.06)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 active:scale-95"
                style={{ background: "#F1F5F9", color: "#64748B" }}
              >
                <ChevronLeft size={15} />
              </button>
            )}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
            >
              <Home size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="truncate" style={{ fontWeight: 800, color: "#0F0D2A", fontSize: "14px" }}>
                rent.otipu.com
              </div>
              <div style={{ color: "#64748B", fontSize: "10px" }}>Shared Bill</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "#ECFDF5", color: "#059669", fontSize: "10px", fontWeight: 600 }}>
              <Shield size={11} />
              Verified
            </span>
            <button
              type="button"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold active:scale-95"
              style={{ background: "white", border: "1px solid rgba(79,70,229,0.15)", color: "#4F46E5", fontSize: "11px" }}
              onClick={() => window.print()}
            >
              <Printer size={12} />
              Print
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Bill header card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #312E81 0%, #4F46E5 55%, #6366F1 100%)",
            boxShadow: "0 16px 48px rgba(79,70,229,0.25)",
          }}
        >
          <div className="p-5 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-white truncate" style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.4px" }}>
                  {bill.title || displayHouseName}
                </h1>
                <p className="truncate" style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px", marginTop: 4 }}>
                  {displayHouseName} · {address}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(255,255,255,0.18)", color: "white" }}>
                    {bill.month}
                  </span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                    {roommateCount} roommates
                  </span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    · {bill.createdAt}
                  </span>
                </div>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
              >
                <FileText size={22} className="text-white" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-px" style={{ background: "rgba(255,255,255,0.15)" }}>
            {[
              { label: "Total Bill", value: `$${totalToCollect.toLocaleString()}` },
              { label: "Collected", value: `$${totalCollected.toLocaleString()}` },
              { label: "Outstanding", value: `$${(collectionSummary?.outstanding ?? 0).toLocaleString()}` },
            ].map((s) => (
              <div key={s.label} className="px-3 py-3 text-center" style={{ background: "rgba(15,13,42,0.35)" }}>
                <div className="text-white font-bold" style={{ fontSize: "16px", letterSpacing: "-0.3px" }}>{s.value}</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "10px", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "white", border: "1px solid rgba(79,70,229,0.1)", boxShadow: "0 2px 16px rgba(79,70,229,0.06)" }}
        >
          <div className="flex justify-between mb-2">
            <span style={{ color: "#0F0D2A", fontSize: "13px", fontWeight: 600 }}>Payment Collection Progress</span>
            <span style={{ color: "#4F46E5", fontSize: "13px", fontWeight: 700 }}>
              {paidCount}/{roommateCount} paid
            </span>
          </div>
          <div className="w-full h-3 rounded-full" style={{ background: "#F1F5F9" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${roommateCount > 0 ? (paidCount / roommateCount) * 100 : 0}%`,
                background: "linear-gradient(90deg, #4F46E5, #10B981)",
              }}
            />
          </div>
        </div>

        <BillAnnouncements
          announcementTitle={bill.announcementTitle}
          announcementMessage={bill.announcementMessage}
          globalMessageTitle={globalMessageTitle}
          globalMessage={globalMessage}
          variant="public"
        />

        {collectionSummary && <CollectionSummaryCard summary={collectionSummary} variant="public" />}

        {/* How it's calculated */}
        {rentCalc && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "white", border: "1px solid rgba(79,70,229,0.1)", boxShadow: "0 2px 20px rgba(79,70,229,0.06)" }}
          >
            <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(79,70,229,0.08)", background: "#F8FAFC" }}>
              <Calculator size={16} style={{ color: "#4F46E5" }} />
              <div>
                <h2 style={{ color: "#0F0D2A", fontWeight: 700, fontSize: "16px" }}>How Payments Are Calculated</h2>
                <p style={{ color: "#64748B", fontSize: "12px", marginTop: 2 }}>Step-by-step breakdown of each share</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl" style={{ background: "#EEF2FF", border: "1px solid rgba(79,70,229,0.12)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: "#4F46E5" }}>1</span>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: "#1E1B4B" }}>Rent Split</span>
                </div>
                {rentCalc.parkingIncluded && rentCalc.totalParkingFees > 0 ? (
                  <p style={{ color: "#64748B", fontSize: "12px", lineHeight: 1.6 }}>
                    Base rent <strong>${bill.rent.toLocaleString()}</strong> minus parking fees{" "}
                    <strong>${rentCalc.totalParkingFees.toLocaleString()}</strong> ={" "}
                    <strong>${rentCalc.rentPool.toLocaleString()}</strong> shared pool, divided by{" "}
                    <strong>{roommateCount}</strong> members ={" "}
                    <strong style={{ color: "#4F46E5" }}>{formatCurrencyDetailed(rentPerPerson)}</strong> each
                  </p>
                ) : (
                  <p style={{ color: "#64748B", fontSize: "12px", lineHeight: 1.6 }}>
                    Base rent <strong>${bill.rent.toLocaleString()}</strong> divided by{" "}
                    <strong>{roommateCount}</strong> members ={" "}
                    <strong style={{ color: "#4F46E5" }}>{formatCurrencyDetailed(rentPerPerson)}</strong> each
                  </p>
                )}
              </div>

              {bill.expenses.length > 0 && (
                <div className="p-4 rounded-xl" style={{ background: "#ECFEFF", border: "1px solid rgba(6,182,212,0.15)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: "#06B6D4" }}>2</span>
                    <span style={{ fontWeight: 700, fontSize: "13px", color: "#0E7490" }}>Expense Splits</span>
                  </div>
                  <div className="space-y-1.5">
                    {bill.expenses.map((e) => {
                      const sharers = e.shareMode === "selected" && e.sharedBy?.length
                        ? e.sharedBy.filter((id) => bill.selectedRoommateIds.includes(id))
                        : bill.selectedRoommateIds;
                      const perPerson = sharers.length > 0 ? e.amount / sharers.length : 0;
                      const sharedLabel = formatSharedByLabel(e, billRoommates, bill.selectedRoommateIds);
                      return (
                        <div key={e.id} className="flex justify-between items-center" style={{ fontSize: "12px" }}>
                          <span style={{ color: "#64748B" }}>
                            {e.name} (${e.amount}) — {sharedLabel}
                          </span>
                          <span style={{ color: "#0891B2", fontWeight: 600 }}>{formatCurrencyDetailed(perPerson)}/ea</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {parkingAssignments.length > 0 && (
                <div className="p-4 rounded-xl" style={{ background: "#F0FDF4", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: "#10B981" }}>3</span>
                    <span style={{ fontWeight: 700, fontSize: "13px", color: "#065F46" }}>Parking Fees</span>
                  </div>
                  <div className="space-y-2">
                    {parkingAssignments.map((a) => {
                      const sharerIds = getParkingShareMemberIds(a, bill.selectedRoommateIds);
                      const perPerson = sharerIds.length > 0 ? a.monthlyFee / sharerIds.length : 0;
                      const shareLabel = formatParkingShareLabel(a, bill.selectedRoommateIds, billRoommates);
                      return (
                        <div key={a.spotName} className="p-3 rounded-lg" style={{ background: "white", border: "1px solid rgba(16,185,129,0.1)" }}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Car size={12} style={{ color: "#10B981" }} />
                                <span style={{ fontWeight: 600, fontSize: "12px", color: "#0F0D2A" }}>{a.spotName}</span>
                              </div>
                              <p style={{ color: "#64748B", fontSize: "11px", marginTop: 4 }}>{shareLabel}</p>
                              {a.shareSpace && (
                                <div className="flex items-center gap-1 mt-1.5">
                                  <Users size={10} style={{ color: "#10B981" }} />
                                  <span style={{ color: "#059669", fontSize: "10px", fontWeight: 600 }}>
                                    Split ${a.monthlyFee} among all members
                                  </span>
                                </div>
                              )}
                            </div>
                            <span style={{ color: "#059669", fontWeight: 700, fontSize: "13px" }}>
                              {a.shareSpace ? `${formatCurrencyDetailed(perPerson)}/ea` : formatCurrencyDetailed(a.monthlyFee)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expense table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "white", border: "1px solid rgba(79,70,229,0.1)", boxShadow: "0 2px 20px rgba(79,70,229,0.06)" }}
        >
          <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(79,70,229,0.08)" }}>
            <h2 style={{ color: "#0F0D2A", fontWeight: 700, fontSize: "16px" }}>Expense Summary</h2>
            <p style={{ color: "#64748B", fontSize: "12px", marginTop: 2 }}>
              {expenses.length} line items · {bill.month}
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(79,70,229,0.05)" }}>
            {expenses.map((e) => {
              const color = getCategoryColor(e.category);
              const icon = e.icon ?? getCategoryIcon(e.category);
              const payer = e.paidBy
                ? (sharedPayload
                    ? billRoommates.find((r) => r.id === e.paidBy)
                    : getRoommateById(roommates, e.paidBy))
                : null;
              const sharedLabel =
                e.id === 0
                  ? "All members"
                  : formatSharedByLabel(e, billRoommates, bill.selectedRoommateIds);
              return (
                <div key={e.id} className="flex items-center gap-4 px-6 py-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: color + "18" }}
                  >
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ color: "#0F0D2A", fontWeight: 600, fontSize: "14px" }}>{e.name}</div>
                    <div style={{ color: "#94A3B8", fontSize: "11px", marginTop: 2 }}>
                      {sharedLabel}
                      {payer && ` · Paid by ${payer.name.split(" ")[0]}`}
                    </div>
                  </div>
                  <span style={{ color: "#0F0D2A", fontWeight: 800, fontSize: "16px" }}>${e.amount.toLocaleString()}</span>
                </div>
              );
            })}
            <div className="flex items-center justify-between px-6 py-4" style={{ background: "linear-gradient(135deg, #EEF2FF, #F5F3FF)" }}>
              <span style={{ color: "#0F0D2A", fontWeight: 800, fontSize: "14px" }}>TOTAL</span>
              <span style={{ color: "#4F46E5", fontWeight: 900, fontSize: "20px" }}>
                ${totalToCollect.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Each Share + Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className="rounded-2xl p-5"
            style={{ background: "white", border: "1px solid rgba(79,70,229,0.1)", boxShadow: "0 2px 16px rgba(79,70,229,0.06)" }}
          >
            <h3 style={{ color: "#0F0D2A", fontWeight: 700, fontSize: "14px", marginBottom: 8 }}>Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={60} innerRadius={32} dataKey="value" strokeWidth={0}>
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`$${v}`, ""]} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                  <span style={{ color: "#64748B", fontSize: "10px" }}>
                    {d.name} ${d.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: "linear-gradient(135deg, #EEF2FF, #F5F3FF)", border: "1.5px solid rgba(79,70,229,0.2)" }}
          >
            <h3 style={{ color: "#1E1B4B", fontWeight: 700, fontSize: "14px", marginBottom: 4 }}>Each Share</h3>
            <div style={{ color: "#4F46E5", fontWeight: 900, fontSize: "36px", letterSpacing: "-1px" }}>
              {formatCurrencyDetailed(avgShare)}
            </div>
            <div style={{ color: "#6366F1", fontSize: "12px", marginBottom: 12 }}>average amount per roommate</div>
            <div className="space-y-1.5 pt-3" style={{ borderTop: "1px solid rgba(79,70,229,0.15)" }}>
              <div className="flex justify-between">
                <span style={{ color: "#6366F1", fontSize: "11px" }}>Rent share (each)</span>
                <span style={{ color: "#4F46E5", fontSize: "11px", fontWeight: 600 }}>{formatCurrencyDetailed(rentPerPerson)}</span>
              </div>
              {roommateRows[0] && roommateRows[0].calc.expenseShare > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: "#6366F1", fontSize: "11px" }}>Avg. expenses</span>
                  <span style={{ color: "#4F46E5", fontSize: "11px", fontWeight: 600 }}>
                    {formatCurrencyDetailed(
                      roommateRows.reduce((s, r) => s + r.calc.expenseShare, 0) / roommateRows.length
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ color: "#6366F1", fontSize: "11px" }}>Parking varies</span>
                <span style={{ color: "#94A3B8", fontSize: "11px" }}>see splits below</span>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Splits */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "white", border: "1px solid rgba(79,70,229,0.1)", boxShadow: "0 2px 16px rgba(79,70,229,0.06)" }}
        >
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(79,70,229,0.06)", background: "#F8FAFC" }}>
            <h2 style={{ color: "#0F0D2A", fontWeight: 700, fontSize: "15px" }}>Individual Splits</h2>
            <p style={{ color: "#64748B", fontSize: "11px", marginTop: 2 }}>
              Each member&apos;s share — expand to see the full calculation
            </p>
          </div>
          <div className="p-3 space-y-2.5">
            {roommateRows.map((r) => {
              const sc = statusConfig[r.status];
              return (
                <div
                  key={r.roommateId}
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: `2px solid ${r.color}`,
                    boxShadow: `0 2px 12px ${r.color}14`,
                  }}
                >
                  <div className="flex items-center gap-3 p-3.5" style={{ background: `${r.color}08` }}>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: r.color, boxShadow: `0 3px 10px ${r.color}35` }}
                    >
                      {r.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ color: "#0F0D2A", fontWeight: 600, fontSize: "14px" }}>{r.name}</div>
                      <div style={{ color: "#94A3B8", fontSize: "11px" }}>Room {r.room}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div style={{ fontSize: "10px", color: "#64748B", fontWeight: 600 }}>OWES</div>
                      <div style={{ color: r.color, fontWeight: 800, fontSize: "18px", letterSpacing: "-0.3px" }}>
                        {formatCurrencyDetailed(r.amountDue)}
                      </div>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        {sc.icon}
                        <span style={{ color: sc.text, fontSize: "10px", fontWeight: 600 }}>{sc.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-3.5 py-2 flex flex-wrap gap-2" style={{ background: "white", borderTop: `1px solid ${r.color}18` }}>
                    <span className="px-2 py-0.5 rounded-md" style={{ fontSize: "10px", background: "#EEF2FF", color: "#4F46E5" }}>
                      Rent {formatCurrencyDetailed(r.calc.rentShare)}
                    </span>
                    {r.calc.expenseShare > 0 && (
                      <span className="px-2 py-0.5 rounded-md" style={{ fontSize: "10px", background: "#ECFEFF", color: "#0891B2" }}>
                        Expenses {formatCurrencyDetailed(r.calc.expenseShare)}
                      </span>
                    )}
                    {r.calc.parkingShare > 0 && (
                      <span className="px-2 py-0.5 rounded-md" style={{ fontSize: "10px", background: "#ECFDF5", color: "#059669" }}>
                        Parking {formatCurrencyDetailed(r.calc.parkingShare)}
                      </span>
                    )}
                  </div>
                  <div className="px-3.5 pb-3">
                    <MemberCalculationPanel lines={r.calcLines} roundUp={settings.roundUpAmounts ?? false} accentColor={r.color} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 space-y-1.5">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
            >
              <Home size={13} className="text-white" />
            </div>
            <span style={{ fontWeight: 800, color: "#4F46E5", fontSize: "15px" }}>rent.otipu.com</span>
          </div>
          <p style={{ color: "#94A3B8", fontSize: "11px" }}>
            This bill was generated on {bill.createdAt} · Valid until {validUntil}
          </p>
          <p style={{ color: "#CBD5E1", fontSize: "10px" }}>
            otipu.com · All amounts in {settings.currency}
          </p>
        </div>
      </div>
    </div>
  );
}
