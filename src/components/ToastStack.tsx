import { CheckCircle2, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Toast } from "@/types";

const toastColors: Record<string, { bg: string; icon: string }> = {
  success: { bg: "#0F0D2A", icon: "#10B981" },
  error: { bg: "#FEF2F2", icon: "#EF4444" },
  info: { bg: "#EEF2FF", icon: "#4F46E5" },
};

export function ToastStack() {
  const { toasts, dismissToast } = useApp();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5" style={{ pointerEvents: "none" }}>
      {toasts.map((t: Toast) => {
        const cfg = toastColors[t.type];
        return (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              background: cfg.bg,
              color: t.type === "success" ? "white" : t.type === "error" ? "#EF4444" : "#4F46E5",
              boxShadow: "0 16px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
              fontSize: "13px",
              fontWeight: 500,
              minWidth: 240,
              pointerEvents: "all",
              animation: "slideInRight 0.3s ease",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <CheckCircle2 size={16} style={{ color: cfg.icon, flexShrink: 0 }} />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismissToast(t.id)} style={{ opacity: 0.6 }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
