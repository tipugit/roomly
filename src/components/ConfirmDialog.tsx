import { AlertTriangle, X } from "lucide-react";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
  icon?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  icon,
}: ConfirmDialogProps) {
  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(15,13,42,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 32px 80px rgba(79,70,229,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: isDanger ? "#FEF2F2" : "#EEF2FF",
            }}
          >
            {icon ?? (
              <AlertTriangle size={22} style={{ color: isDanger ? "#EF4444" : "#4F46E5" }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "17px" }}>
                {title}
              </h3>
              <button
                type="button"
                onClick={onCancel}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--muted)" }}
              >
                <X size={14} style={{ color: "var(--muted-foreground)" }} />
              </button>
            </div>
            <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: 8, lineHeight: 1.6 }}>
              {message}
            </p>
          </div>
        </div>
        <div
          className="px-6 py-4 flex gap-3"
          style={{ borderTop: "1px solid var(--border)", background: "var(--muted)" }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-semibold"
            style={{ background: "var(--card)", color: "var(--foreground)", fontSize: "13px" }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white"
            style={{
              background: isDanger
                ? "linear-gradient(135deg, #EF4444, #DC2626)"
                : "linear-gradient(135deg, #4F46E5, #7C3AED)",
              fontSize: "13px",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
