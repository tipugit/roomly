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
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
    setEditingBill,
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
    setEditingBill(bill);
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
            <h1 style={{ fontWeight: 800, fontSize: "clamp(20px, 5vw, 26px)", letterSpacing: "-0.5px" }}>
              All Bills
            </h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>
              {bills.length} bill{bills.length !== 1 ? "s" : ""} · Tap a card to view full details
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bills.map((bill) => {
          const summary = calcCollectionSummary(bill);
          const complete = isBillComplete(bill);
          const paidShares = bill.roommateShares.filter((s) => s.status === "Paid").length;
          const totalShares = bill.roommateShares.length;
          const displayTitle = bill.title || bill.month;

          return (
            <div
              key={bill.id}
              className="rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 4px 20px rgba(79,70,229,0.08)",
              }}
            >
              <button
                type="button"
                onClick={() => openBillView(bill.id)}
                className="w-full p-5 text-left"
                style={{ background: "linear-gradient(135deg, #FAFBFF, #F5F3FF)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="truncate" style={{ fontWeight: 700, fontSize: "16px" }}>
                      {displayTitle}
                    </h3>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 2 }}>
                      {bill.month} · {bill.createdAt}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                    style={{
                      background: complete ? "#ECFDF5" : "#EEF2FF",
                      color: complete ? "#059669" : "#4F46E5",
                    }}
                  >
                    {complete ? "Done" : "Open"}
                  </span>
                </div>

                <div className="p-3 rounded-xl mb-2" style={{ background: "white" }}>
                  <p style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: 600 }}>TOTAL</p>
                  <p style={{ fontWeight: 900, fontSize: "24px", color: "#4F46E5", letterSpacing: "-0.5px" }}>
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
                    <span style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: 600 }}>
                      {paidShares}/{totalShares}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "10px", color: "#4F46E5", fontWeight: 600, textAlign: "center" }}>
                  Tap to open bill →
                </p>
              </button>

              <div
                className="grid grid-cols-6 gap-0.5 px-2 pb-3"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                {[
                  { icon: Link2, label: "Link", action: () => copyLink(bill.id), active: linkCopied === bill.id },
                  { icon: Edit2, label: "Edit", action: () => handleEdit(bill) },
                  { icon: Copy, label: "Copy", action: () => void duplicateBill(bill.id) },
                  { icon: Check, label: "Paid", action: () => void markBillComplete(bill.id) },
                  { icon: ExternalLink, label: "View", action: () => openPublicLink(bill.id) },
                  { icon: Trash2, label: "Delete", action: () => setDeleteTarget({ id: bill.id, title: displayTitle }) },
                ].map(({ icon: Icon, label, action, active }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); action(); }}
                    className="flex flex-col items-center gap-1 py-2 rounded-lg transition-all active:scale-95"
                  >
                    <div
                      className="w-8 h-8 flex items-center justify-center rounded-lg"
                      style={{
                        background: active ? "#ECFDF5" : "var(--muted)",
                        color: active ? "#059669" : "var(--muted-foreground)",
                      }}
                    >
                      <Icon size={13} />
                    </div>
                    <span style={{ fontSize: "8px", fontWeight: 600, color: "var(--muted-foreground)" }}>{label}</span>
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
