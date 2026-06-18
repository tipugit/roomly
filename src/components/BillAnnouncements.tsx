import { Megaphone, MessageSquare } from "lucide-react";

interface BillAnnouncementsProps {
  announcementTitle?: string;
  announcementMessage?: string;
  globalMessageTitle?: string;
  globalMessage?: string;
  variant?: "default" | "public";
}

export function BillAnnouncements({
  announcementTitle,
  announcementMessage,
  globalMessageTitle,
  globalMessage,
  variant = "default",
}: BillAnnouncementsProps) {
  const hasMonthly = Boolean(announcementTitle?.trim() || announcementMessage?.trim());
  const hasGlobal = Boolean(globalMessageTitle?.trim() || globalMessage?.trim());
  if (!hasMonthly && !hasGlobal) return null;

  const isPublic = variant === "public";

  return (
    <div className="space-y-3">
      {hasMonthly && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: isPublic ? "white" : "var(--card)",
            border: isPublic ? "1px solid rgba(79,70,229,0.15)" : "1px solid var(--border)",
            boxShadow: isPublic ? "0 2px 16px rgba(79,70,229,0.06)" : "0 2px 20px rgba(79,70,229,0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "#EEF2FF" }}
            >
              <Megaphone size={15} style={{ color: "#4F46E5" }} />
            </div>
            <h3
              style={{
                color: isPublic ? "#0F0D2A" : "var(--foreground)",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              {announcementTitle?.trim() || "Monthly Notice"}
            </h3>
          </div>
          {announcementMessage?.trim() && (
            <p
              style={{
                color: isPublic ? "#64748B" : "var(--muted-foreground)",
                fontSize: "13px",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {announcementMessage}
            </p>
          )}
        </div>
      )}
      {hasGlobal && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: isPublic
              ? "linear-gradient(135deg, #F8FAFC, #EEF2FF)"
              : "linear-gradient(135deg, rgba(79,70,229,0.04), rgba(124,58,237,0.03))",
            border: isPublic ? "1px solid rgba(79,70,229,0.12)" : "1px solid rgba(79,70,229,0.15)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(79,70,229,0.12)" }}
            >
              <MessageSquare size={15} style={{ color: "#4F46E5" }} />
            </div>
            <h3
              style={{
                color: isPublic ? "#1E1B4B" : "var(--foreground)",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              {globalMessageTitle?.trim() || "House Notice"}
            </h3>
          </div>
          {globalMessage?.trim() && (
            <p
              style={{
                color: isPublic ? "#6366F1" : "var(--muted-foreground)",
                fontSize: "13px",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {globalMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
