import { useState } from "react";
import {
  Link2,
  Copy,
  Check,
  Edit2,
  Trash2,
  ExternalLink,
  FileText,
  Plus,
  ArrowLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { actionButtonStyle } from "@/lib/themeTokens";
import { calcCollectionSummary, copyBillLink, getShareLink } from "@/lib/utils";

interface BillDetailsPageProps {
  onBack?: () => void;
}

export function BillDetailsPage({ onBack }: BillDetailsPageProps) {
  const {
    bills,
    deleteBill,
    duplicateBill,
    markBillComplete,
    navigate,
    showToast,
    startEditingBill,
    openBillView,
  } = useApp();

  const [linkCopied, setLinkCopied] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const isBillComplete = (bill: (typeof bills)[0]) =>
    bill.completed ?? bill.roommateShares.every((rs) => rs.status === "Paid");

  const openPublicLink = async (billId: string) => {
    const link = await getShareLink(billId);
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const copyLink = async (billId: string) => {
    const ok = await copyBillLink(billId, showToast);
    if (ok) {
      setLinkCopied(billId);
      setTimeout(() => setLinkCopied(null), 2500);
    }
  };

  const handleEdit = (bill: (typeof bills)[0]) => {
    startEditingBill(bill);
    navigate("bills");
    showToast("Editing bill — save to update", "info");
  };

  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 max-w-md mx-auto text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ background: "var(--muted)" }}>
          <FileText size={32} style={{ color: "var(--muted-foreground)" }} />
        </div>
        <h2 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "20px" }}>No bills yet</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: 8 }}>
          Create a monthly bill to track expenses and roommate payments.
        </p>
        <button
          onClick={() => navigate("bills")}
          className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold"
          style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", fontSize: "13px" }}
        >
          <Plus size={15} />
          Create Bill
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1200px] mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <ArrowLeft size={15} />
            </button>
          )}
          <div>
            <h1 style={{ fontWeight: 800, fontSize: "clamp(20px, 5vw, 26px)", letterSpacing: "-0.5px", color: "var(--foreground)" }}>
              All Bills
            </h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>
              {bills.length} bill{bills.length !== 1 ? "s" : ""} · Tap a card to view details
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("bills")}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-semibold self-start"
          style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", fontSize: "13px" }}
        >
          <Plus size={14} />
          New Bill
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {bills.map((bill) => {
          const summary = calcCollectionSummary(bill);
          const complete = isBillComplete(bill);
          const paidShares = bill.roommateShares.filter((s) => s.status === "Paid").length;
          const totalShares = bill.roommateShares.length;
          const progressPct = totalShares > 0 ? Math.round((paidShares / totalShares) * 100) : 0;
          const displayTitle = bill.title || bill.month;
          const copied = linkCopied === bill.id;

          const cardActions = [
            { id: "link", label: copied ? "Copied" : "Link", icon: Link2, onClick: () => void copyLink(bill.id), style: copied ? actionButtonStyle.success : actionButtonStyle.muted },
            { id: "edit", label: "Edit", icon: Edit2, onClick: () => handleEdit(bill), style: actionButtonStyle.warning },
            { id: "copy", label: "Copy", icon: Copy, onClick: () => void duplicateBill(bill.id), style: actionButtonStyle.muted },
            { id: "paid", label: "Paid", icon: Check, onClick: () => void markBillComplete(bill.id), style: actionButtonStyle.success },
            { id: "view", label: "Public", icon: ExternalLink, onClick: () => void openPublicLink(bill.id), style: actionButtonStyle.primary },
            { id: "delete", label: "Delete", icon: Trash2, onClick: () => setDeleteTarget({ id: bill.id, title: displayTitle }), style: actionButtonStyle.danger },
          ];

          return (
            <div
              key={bill.id}
              className="rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 4px 24px var(--surface-tint)",
              }}
            >
              <div className="h-1" style={{ background: complete ? "var(--status-success-text)" : "var(--primary)" }} />

              <button
                type="button"
                onClick={() => openBillView(bill.id)}
                className="w-full p-4 pb-3 text-left transition-opacity hover:opacity-95"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate" style={{ fontWeight: 700, fontSize: "16px", color: "var(--foreground)" }}>
                      {displayTitle}
                    </h3>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 3 }}>
                      {bill.month} · {bill.createdAt}
                    </p>
                  </div>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 uppercase tracking-wide"
                    style={{
                      background: complete ? "var(--status-success-bg)" : "var(--status-info-bg)",
                      color: complete ? "var(--status-success-text)" : "var(--status-info-text)",
                    }}
                  >
                    {complete ? "Done" : "Open"}
                  </span>
                </div>

                <div
                  className="rounded-xl p-3 mb-3"
                  style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: 600, letterSpacing: "0.4px" }}>
                        TOTAL BILL
                      </p>
                      <p style={{ fontWeight: 900, fontSize: "26px", color: "var(--primary)", letterSpacing: "-0.5px", lineHeight: 1.1 }}>
                        ${summary.totalToCollect.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: 600 }}>Collected</p>
                      <p style={{ fontWeight: 700, fontSize: "14px", color: "var(--status-success-text)" }}>
                        ${summary.totalPaid.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: 600 }}>
                        Payment progress
                      </span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)" }}>{progressPct}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--card)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progressPct}%`,
                            background: complete
                              ? "var(--status-success-text)"
                              : "linear-gradient(90deg, var(--primary), var(--chart-3))",
                          }}
                        />
                      </div>
                      <span className="flex items-center gap-0.5 flex-shrink-0" style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: 600 }}>
                        <Users size={10} />
                        {paidShares}/{totalShares}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1" style={{ color: "var(--primary)", fontSize: "11px", fontWeight: 600 }}>
                  View bill details
                  <ChevronRight size={13} />
                </div>
              </button>

              <div
                className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 px-3 pb-3 pt-1 border-t"
                style={{ borderColor: "var(--border)", background: "var(--muted)" }}
              >
                {cardActions.map(({ id, label, icon: Icon, onClick, style }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick();
                    }}
                    className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl transition-all active:scale-95 min-w-0"
                    style={{
                      background: style.bg,
                      color: style.text,
                      border: `1px solid ${style.border}`,
                    }}
                  >
                    <Icon size={14} strokeWidth={2.25} />
                    <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.2px" }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this bill?"
        message={`"${deleteTarget?.title}" will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete Bill"
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void deleteBill(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
