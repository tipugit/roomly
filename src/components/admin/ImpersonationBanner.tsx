import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { LogOut } from "lucide-react";

export function ImpersonationBanner() {
  const { impersonating, stopImpersonation } = useAuth();
  const { showToast } = useApp();

  if (!impersonating) return null;

  const handleStop = async () => {
    try {
      await stopImpersonation();
      showToast("Returned to admin account", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to stop impersonation", "error");
    }
  };

  return (
    <div
      className="flex items-center justify-center gap-3 px-4 py-2 text-sm font-semibold z-50"
      style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "white" }}
    >
      <span>You are viewing the app as another user</span>
      <button
        type="button"
        onClick={handleStop}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg"
        style={{ background: "rgba(255,255,255,0.2)" }}
      >
        <LogOut size={14} /> Exit impersonation
      </button>
    </div>
  );
}

export function PlatformAnnouncementsBanner({ announcements }: { announcements: { id: number; title: string; body: string; type: string }[] }) {
  if (!announcements.length) return null;
  const typeColors: Record<string, string> = {
    info: "#4F46E5", warning: "#F59E0B", maintenance: "#EF4444", update: "#10B981",
  };
  return (
    <div className="space-y-2 mb-4">
      {announcements.slice(0, 3).map((a) => (
        <div
          key={a.id}
          className="rounded-xl px-4 py-3"
          style={{
            background: "var(--card)",
            border: `1px solid ${typeColors[a.type] ?? "#4F46E5"}33`,
            borderLeft: `4px solid ${typeColors[a.type] ?? "#4F46E5"}`,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--foreground)" }}>{a.title}</div>
          <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2 }}>{a.body}</div>
        </div>
      ))}
    </div>
  );
}
