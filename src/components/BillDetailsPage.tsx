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
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "@/context/AppContext";
import { BillAnnouncements } from "@/components/BillAnnouncements";
import { CollectionSummaryCard } from "@/components/CollectionSummaryCard";
import { printPage } from "@/lib/print";
import {
  calcBillTotal,
  calcCollectionSummary,
  copyToClipboard,
  formatSharedByLabel,
  getBillExpensesWithRent,
  getCategoryColor,
  getCategoryIcon,
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
  const { activeBill, roommates, settings, updatePayment, showToast, navigate } = useApp();
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"expenses" | "roommates">("expenses");

  const expenseRows = useMemo(
    () => (activeBill ? getBillExpensesWithRent(activeBill) : []),
    [activeBill]
  );

  const roommateBreakdown = useMemo(() => {
    if (!activeBill) return [];
    return activeBill.roommateShares.map((rs) => {
      const roommate = getRoommateById(roommates, rs.roommateId);
      return {
        roommateId: rs.roommateId,
        name: roommate?.name ?? "Unknown",
        room: roommate?.room ?? "—",
        initials: roommate?.initials ?? "?",
        color: roommate?.color ?? "#64748B",
        share: rs.share,
        paid: rs.paid,
        status: rs.status,
      };
    });
  }, [activeBill, roommates]);

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

  const copyLink = async () => {
    if (!activeBill) return;
    const link = await getShareLink(activeBill.id);
    const ok = await copyToClipboard(link);
    if (ok) {
      setLinkCopied(true);
      showToast("Share link copied! Anyone with this link can view the bill.");
      setTimeout(() => setLinkCopied(false), 2500);
    } else {
      showToast("Failed to copy link", "error");
    }
  };

  const handleExportPdf = () => {
    printPage();
    showToast("Use Save as PDF in the print dialog", "info");
  };

  if (!activeBill) {
    return (
      <div className="flex flex-col items-center justify-center py-24 max-w-md mx-auto text-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
          style={{ background: "var(--muted)" }}
        >
          <FileText size={32} style={{ color: "var(--muted-foreground)" }} />
        </div>
        <h2 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "20px" }}>No bill yet</h2>
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

  const houseLabel = activeBill.houseName || settings.houseName;
  const roommateCount = activeBill.selectedRoommateIds.length;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
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
              Bill Details
            </h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>
              {activeBill.month} · {houseLabel} · {roommateCount} roommates
            </p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all flex-shrink-0 active:scale-95"
            style={{
              background: linkCopied ? "#ECFDF5" : "var(--card)",
              border: `1.5px solid ${linkCopied ? "#10B981" : "var(--border)"}`,
              color: linkCopied ? "#059669" : "var(--foreground)",
              fontSize: "12px",
            }}
          >
            {linkCopied ? <CheckCircle2 size={13} /> : <Link2 size={13} />}
            {linkCopied ? "Copied!" : "Copy Link"}
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

      {/* Summary hero */}
      <div
        className="rounded-3xl p-7 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F0D2A 0%, #1E1B4B 50%, #162044 100%)",
          boxShadow: "0 20px 60px rgba(15,13,42,0.35)",
        }}
      >
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full" style={{ background: "rgba(79,70,229,0.2)", filter: "blur(60px)" }} />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full" style={{ background: "rgba(236,72,153,0.15)", filter: "blur(40px)" }} />

        <div className="relative flex flex-wrap gap-8 items-center">
          <div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.8px" }}>TOTAL TO COLLECT</div>
            <div style={{ color: "white", fontWeight: 900, fontSize: "44px", letterSpacing: "-1.5px", lineHeight: 1 }}>
              ${totalToCollect.toLocaleString()}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: 4 }}>{activeBill.month}</div>
          </div>
          {[
            { label: "Collected", value: `$${totalPaid.toLocaleString()}`, color: "#34D399", pct: null },
            { label: "Remaining", value: `$${Math.max(0, collectionSummary?.outstanding ?? 0).toLocaleString()}`, color: "#F87171", pct: null },
            { label: "Parking", value: `$${(collectionSummary?.parkingFees ?? 0).toLocaleString()}`, color: "#A5B4FC", pct: null },
            { label: "Collection Rate", value: `${collectPct}%`, color: "#FCD34D", pct: collectPct },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px", fontWeight: 500, marginBottom: 4 }}>{s.label}</div>
              <div style={{ color: s.color, fontWeight: 800, fontSize: "22px", letterSpacing: "-0.3px" }}>{s.value}</div>
              {s.pct !== null && (
                <div className="w-20 h-1 rounded-full mt-2" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
              )}
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

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main table area */}
        <div className="lg:col-span-2 space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--muted)" }}>
            {(["expenses", "roommates"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-5 py-2 rounded-xl font-semibold capitalize transition-all"
                style={{
                  background: activeTab === tab ? "var(--card)" : "transparent",
                  color: activeTab === tab ? "var(--foreground)" : "var(--muted-foreground)",
                  fontSize: "13px",
                  boxShadow: activeTab === tab ? "0 2px 8px rgba(79,70,229,0.08)" : "none",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "expenses" && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 20px rgba(79,70,229,0.06)" }}
            >
              <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                <table className="w-full" style={{ minWidth: 540 }}>
                  <thead>
                    <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                      {["Category", "Amount", "Paid By", "Shared By", "Note"].map((h) => (
                        <th
                          key={h}
                          className="text-left px-5 py-3.5"
                          style={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.4px" }}
                        >
                          {h.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenseRows.map((row, i) => {
                      const color = getCategoryColor(row.category);
                      const icon = row.icon ?? getCategoryIcon(row.category);
                      const payer = row.paidBy ? getRoommateById(roommates, row.paidBy) : null;
                      return (
                        <tr
                          key={row.id}
                          style={{ borderBottom: i < expenseRows.length - 1 ? "1px solid var(--border)" : "none" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                                style={{ background: color + "18" }}
                              >
                                {icon}
                              </div>
                              <span style={{ color: "var(--foreground)", fontSize: "13.5px", fontWeight: 600 }}>{row.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>
                              ${row.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {payer ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: color + "18", color }}>
                                {payer.name.split(" ")[0]} {payer.name.split(" ")[1]?.[0]}.
                              </span>
                            ) : (
                              <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>Split evenly</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
                              {row.id === 0
                                ? "All members"
                                : formatSharedByLabel(
                                    row,
                                    roommates,
                                    activeBill.selectedRoommateIds
                                  )}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>{row.note ?? "—"}</span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.06), rgba(124,58,237,0.04))", borderTop: "2px solid var(--border)" }}>
                      <td className="px-5 py-4">
                        <span style={{ color: "var(--foreground)", fontWeight: 800, fontSize: "14px" }}>TOTAL</span>
                      </td>
                      <td className="px-5 py-4">
                        <span style={{ color: "#4F46E5", fontWeight: 900, fontSize: "18px" }}>
                          ${totalToCollect.toLocaleString()}
                        </span>
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "roommates" && (
            <div className="space-y-3">
              {roommateBreakdown.map((r) => {
                const sc = statusConfig[r.status];
                const pct = r.share > 0 ? Math.min((r.paid / r.share) * 100, 100) : 0;
                const remaining = Math.max(0, r.share - r.paid);
                return (
                  <div
                    key={r.roommateId}
                    className="rounded-2xl p-5 transition-all"
                    style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 16px rgba(79,70,229,0.05)" }}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: r.color, boxShadow: `0 4px 12px ${r.color}40` }}
                      >
                        {r.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ color: "var(--foreground)", fontWeight: 600, fontSize: "14px" }}>{r.name}</div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>Room {r.room}</div>
                      </div>
                      <div className="text-right">
                        <div style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "16px" }}>
                          ${r.paid.toLocaleString()}{" "}
                          <span style={{ color: "var(--muted-foreground)", fontSize: "12px", fontWeight: 400 }}>/ ${r.share}</span>
                        </div>
                        {remaining > 0 && (
                          <div style={{ color: "#EF4444", fontSize: "11px", fontWeight: 500 }}>Still owes ${remaining.toFixed(0)}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: sc.bg }}>
                        {sc.icon}
                        <span style={{ color: sc.text, fontSize: "12px", fontWeight: 600 }}>{r.status}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full mb-3" style={{ background: "var(--muted)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: r.status === "Paid" ? "#10B981" : r.status === "Partial" ? "#F59E0B" : "var(--muted-foreground)",
                        }}
                      />
                    </div>
                    {r.status !== "Paid" && (
                      <div className="flex gap-2">
                        {r.status === "Pending" && (
                          <button
                            onClick={() => updatePayment(r.roommateId, Math.round(r.share / 2))}
                            className="flex-1 py-2 rounded-xl font-semibold transition-all active:scale-95"
                            style={{ background: "#FFFBEB", color: "#D97706", fontSize: "12px", border: "1px solid rgba(245,158,11,0.3)" }}
                          >
                            Mark Partial
                          </button>
                        )}
                        <button
                          onClick={() => updatePayment(r.roommateId, r.share)}
                          className="flex-1 py-2 rounded-xl font-semibold text-white transition-all active:scale-95"
                          style={{ background: "linear-gradient(135deg, #10B981, #059669)", fontSize: "12px", boxShadow: "0 2px 8px rgba(16,185,129,0.3)" }}
                        >
                          Mark Paid
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie + Generate link */}
        <div className="space-y-5">
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 20px rgba(79,70,229,0.06)" }}
          >
            <h3 className="mb-1" style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>Distribution</h3>
            <p className="mb-4" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>By category</p>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} innerRadius={45} dataKey="value" strokeWidth={0}>
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [`$${v}`, ""]}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-1">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}>${d.value}</span>
                    <span style={{ color: "var(--muted-foreground)", fontSize: "10px" }}>
                      ({((d.value / total) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate share link */}
          <div
            className="rounded-2xl p-5 text-center"
            style={{
              background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)",
              border: "1.5px solid rgba(79,70,229,0.2)",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", boxShadow: "0 4px 14px rgba(79,70,229,0.3)" }}
            >
              <Share2 size={20} className="text-white" />
            </div>
            <h3 style={{ color: "#1E1B4B", fontWeight: 700, fontSize: "15px", marginBottom: 4 }}>Share with Roommates</h3>
            <p style={{ color: "#4338CA", fontSize: "12px", marginBottom: 16 }}>
              Generate a public link for roommates to view and confirm their share
            </p>
            <button
              onClick={() => {
                copyLink();
                onShareView?.();
              }}
              className="w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 active:scale-95"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", fontSize: "13px", boxShadow: "0 4px 14px rgba(79,70,229,0.3)" }}
            >
              <Link2 size={14} />
              Generate Share Link
            </button>
            {onShareView && (
              <button
                onClick={onShareView}
                className="mt-2 w-full py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 active:scale-95"
                style={{ background: "white", color: "#4F46E5", fontSize: "13px", border: "1px solid rgba(79,70,229,0.2)" }}
              >
                <ExternalLink size={13} />
                View Public Page
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
