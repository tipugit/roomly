import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type { ActivityLog, AuditLog, LoginHistoryEntry } from "@/types/admin";
import { AdminPageHeader, AdminCard, AdminLoading, AdminSearchBar, AdminTable, AdminBadge } from "./adminShared";

type LogsMode = "activity-logs" | "audit-logs" | "login-history";

export function AdminLogsSection({ mode }: { mode: LogsMode }) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "activity-logs") {
        const res = await api.adminActivityLogs({ q: search || undefined });
        setActivityLogs(res.logs);
      } else if (mode === "audit-logs") {
        const res = await api.adminAuditLogs();
        setAuditLogs(res.logs);
      } else {
        const res = await api.adminLoginHistory();
        setLoginHistory(res.history);
      }
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Failed to load logs", "error");
    } finally {
      setLoading(false);
    }
  }, [mode, search, showToast]);

  useEffect(() => {
    const t = setTimeout(load, mode === "activity-logs" ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, mode]);

  const titles: Record<LogsMode, { title: string; subtitle: string }> = {
    "activity-logs": { title: "Activity Logs", subtitle: "User actions across the platform" },
    "audit-logs": { title: "Audit Logs", subtitle: "Administrative changes and data mutations" },
    "login-history": { title: "Login History", subtitle: "Authentication events and suspicious activity" },
  };

  const { title, subtitle } = titles[mode];

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      <AdminPageHeader title={title} subtitle={subtitle} onRefresh={load} />

      {mode === "activity-logs" && (
        <AdminSearchBar value={search} onChange={setSearch} placeholder="Search actions, users, descriptions…" />
      )}

      <AdminCard>
        {loading ? <AdminLoading /> : mode === "activity-logs" ? (
          <AdminTable headers={["Action", "Description", "User", "Entity", "IP", "Time"]}>
            {activityLogs.map((log) => (
              <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-4 py-3">
                  <AdminBadge color="#4F46E5" bg="rgba(79,70,229,0.12)">{log.action}</AdminBadge>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--foreground)", maxWidth: 240 }}>
                  <span className="line-clamp-2">{log.description}</span>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
                  {log.actorName ?? log.userName ?? "—"}
                </td>
                <td className="px-4 py-3" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                  {log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId}` : ""}` : "—"}
                </td>
                <td className="px-4 py-3" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{log.ipAddress ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {activityLogs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>No activity logs</td></tr>
            )}
          </AdminTable>
        ) : mode === "audit-logs" ? (
          <AdminTable headers={["Action", "Entity", "Actor", "IP", "Time", "Changes"]}>
            {auditLogs.map((log) => (
              <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-4 py-3">
                  <AdminBadge color="#D97706" bg="rgba(245,158,11,0.12)">{log.action}</AdminBadge>
                </td>
                <td className="px-4 py-3" style={{ fontSize: "13px", color: "var(--foreground)" }}>
                  {log.entityType} #{log.entityId}
                </td>
                <td className="px-4 py-3" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{log.actorName ?? "—"}</td>
                <td className="px-4 py-3" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{log.ipAddress ?? "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <details className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    <summary className="cursor-pointer" style={{ color: "#4F46E5", fontWeight: 600 }}>View diff</summary>
                    <pre className="mt-2 p-2 rounded-lg overflow-x-auto max-w-xs" style={{ background: "var(--muted)", fontSize: "10px" }}>
                      {JSON.stringify({ before: log.before, after: log.after }, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
            {auditLogs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>No audit logs</td></tr>
            )}
          </AdminTable>
        ) : (
          <AdminTable headers={["User", "IP", "Browser", "Device", "Location", "Suspicious", "Time"]}>
            {loginHistory.map((entry) => (
              <tr key={entry.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-4 py-3">
                  <div style={{ fontWeight: 600, color: "var(--foreground)", fontSize: "13px" }}>{entry.userName}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{entry.email}</div>
                </td>
                <td className="px-4 py-3" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{entry.ipAddress ?? "—"}</td>
                <td className="px-4 py-3" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{entry.browser ?? "—"}</td>
                <td className="px-4 py-3" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{entry.device ?? "—"}</td>
                <td className="px-4 py-3" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{entry.location ?? "—"}</td>
                <td className="px-4 py-3">
                  {entry.isSuspicious ? (
                    <AdminBadge color="#EF4444" bg="rgba(239,68,68,0.12)">
                      <span className="inline-flex items-center gap-1"><AlertTriangle size={10} /> Yes</span>
                    </AdminBadge>
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>No</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {loginHistory.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>No login history</td></tr>
            )}
          </AdminTable>
        )}
      </AdminCard>
    </div>
  );
}
