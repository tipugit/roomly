import { useCallback, useEffect, useState } from "react";
import {
  LifeBuoy, Database, HeartPulse, HardDrive, Bell, Plus, Send,
  Trash2, CheckCheck, AlertCircle,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type {
  SupportTicket, PlatformBackup, PlatformNotification, TicketStatus, TicketPriority,
} from "@/types/admin";
import {
  AdminPageHeader, AdminCard, AdminLoading, AdminBadge, AdminPrimaryBtn,
  healthColor, formatAdminBytes,
} from "./adminShared";

type SystemMode = "support" | "backups" | "health" | "storage" | "notifications";

const ticketStatusStyle: Record<TicketStatus, { color: string; bg: string }> = {
  open: { color: "#4F46E5", bg: "rgba(79,70,229,0.12)" },
  pending: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  resolved: { color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  closed: { color: "#64748B", bg: "rgba(100,116,139,0.12)" },
};

const priorityStyle: Record<TicketPriority, { color: string; bg: string }> = {
  low: { color: "#64748B", bg: "rgba(100,116,139,0.12)" },
  medium: { color: "#4F46E5", bg: "rgba(79,70,229,0.12)" },
  high: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  critical: { color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
};

export function AdminSystemSection({ mode }: { mode: SystemMode }) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [backups, setBackups] = useState<PlatformBackup[]>([]);
  const [health, setHealth] = useState<Record<string, { status: string; label: string }>>({});
  const [storage, setStorage] = useState<{
    totalBytes: number;
    fileCount: number;
    largestFiles: { id: number; filename: string; sizeBytes: number; userName: string }[];
    userUsage: { name: string; email: string; totalBytes: number }[];
  } | null>(null);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [creatingBackup, setCreatingBackup] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "support") {
        const res = await api.adminTickets();
        setTickets(res.tickets);
      } else if (mode === "backups") {
        const res = await api.adminBackups();
        setBackups(res.backups);
      } else if (mode === "health") {
        const res = await api.adminHealth();
        setHealth(res.health);
      } else if (mode === "storage") {
        const res = await api.adminStorage();
        setStorage(res);
      } else {
        const res = await api.adminNotifications();
        setNotifications(res.notifications);
      }
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }, [mode, showToast]);

  useEffect(() => { load(); }, [load]);

  const openTicket = async (id: number) => {
    try {
      const res = await api.adminTicketDetail(id);
      setSelectedTicket(res.ticket);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Failed to load ticket", "error");
    }
  };

  const sendReply = async () => {
    if (!selectedTicket || !reply.trim()) return;
    try {
      await api.adminReplyTicket(selectedTicket.id, { message: reply, status: "pending" });
      showToast("Reply sent", "success");
      setReply("");
      await openTicket(selectedTicket.id);
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Reply failed", "error");
    }
  };

  const resolveTicket = async (id: number) => {
    try {
      await api.adminReplyTicket(id, { message: "Ticket resolved.", status: "resolved" });
      showToast("Ticket resolved", "success");
      setSelectedTicket(null);
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Update failed", "error");
    }
  };

  const createBackup = async () => {
    setCreatingBackup(true);
    try {
      await api.adminCreateBackup();
      showToast("Backup created", "success");
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Backup failed", "error");
    } finally {
      setCreatingBackup(false);
    }
  };

  const deleteFile = async (id: number, name: string) => {
    if (!confirm(`Delete file "${name}"?`)) return;
    try {
      await api.adminDeleteFile(id);
      showToast("File deleted", "success");
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Delete failed", "error");
    }
  };

  const markAllRead = async () => {
    try {
      await api.adminMarkNotificationsRead();
      showToast("All marked as read", "success");
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Update failed", "error");
    }
  };

  const titles: Record<SystemMode, { title: string; subtitle: string; icon: typeof LifeBuoy }> = {
    support: { title: "Support Tickets", subtitle: "Respond to user requests", icon: LifeBuoy },
    backups: { title: "Backups", subtitle: "Database backup history", icon: Database },
    health: { title: "System Health", subtitle: "Service status and diagnostics", icon: HeartPulse },
    storage: { title: "Storage", subtitle: "File usage across the platform", icon: HardDrive },
    notifications: { title: "Notifications", subtitle: "Platform alerts for admins", icon: Bell },
  };

  const { title, subtitle } = titles[mode];

  if (loading) return <AdminLoading />;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      <AdminPageHeader
        title={title}
        subtitle={subtitle}
        onRefresh={load}
        actions={
          mode === "backups" ? (
            <AdminPrimaryBtn onClick={createBackup} disabled={creatingBackup}><Plus size={14} /> Create backup</AdminPrimaryBtn>
          ) : mode === "notifications" ? (
            <button type="button" onClick={markAllRead} className="admin-btn-secondary"><CheckCheck size={14} /> Mark all read</button>
          ) : undefined
        }
      />

      {mode === "support" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-2">
            {tickets.map((t) => {
              const ss = ticketStatusStyle[t.status];
              const ps = priorityStyle[t.priority];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openTicket(t.id)}
                  className="w-full text-left rounded-xl p-4 transition-all"
                  style={{
                    background: selectedTicket?.id === t.id ? "rgba(79,70,229,0.08)" : "var(--card)",
                    border: `1px solid ${selectedTicket?.id === t.id ? "rgba(79,70,229,0.3)" : "var(--border)"}`,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }} className="line-clamp-1">{t.subject}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2 }}>{t.userName ?? t.userEmail}</div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <AdminBadge color={ss.color} bg={ss.bg}>{t.status}</AdminBadge>
                    <AdminBadge color={ps.color} bg={ps.bg}>{t.priority}</AdminBadge>
                  </div>
                </button>
              );
            })}
            {tickets.length === 0 && (
              <AdminCard><p className="text-center py-8" style={{ color: "var(--muted-foreground)" }}>No open tickets</p></AdminCard>
            )}
          </div>
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <AdminCard
                title={selectedTicket.subject}
                action={
                  selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" ? (
                    <button type="button" onClick={() => resolveTicket(selectedTicket.id)} className="admin-btn-secondary" style={{ color: "#10B981" }}>Resolve</button>
                  ) : undefined
                }
              >
                <div className="flex gap-2 mb-4 flex-wrap">
                  <AdminBadge color={ticketStatusStyle[selectedTicket.status].color} bg={ticketStatusStyle[selectedTicket.status].bg}>{selectedTicket.status}</AdminBadge>
                  <AdminBadge color={priorityStyle[selectedTicket.priority].color} bg={priorityStyle[selectedTicket.priority].bg}>{selectedTicket.priority}</AdminBadge>
                  <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{selectedTicket.userEmail}</span>
                </div>
                <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                  {(selectedTicket.messages ?? []).map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl"
                      style={{
                        background: m.isStaff ? "rgba(79,70,229,0.08)" : "var(--muted)",
                        border: `1px solid ${m.isStaff ? "rgba(79,70,229,0.2)" : "var(--border)"}`,
                        marginLeft: m.isStaff ? "2rem" : 0,
                        marginRight: m.isStaff ? 0 : "2rem",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 600, color: m.isStaff ? "#4F46E5" : "var(--muted-foreground)" }}>
                        {m.userName} · {new Date(m.createdAt).toLocaleString()}
                      </div>
                      <p style={{ fontSize: "13px", color: "var(--foreground)", marginTop: 4 }}>{m.message}</p>
                    </div>
                  ))}
                </div>
                {selectedTicket.status !== "closed" && (
                  <div className="flex gap-2">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type a reply…"
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                    />
                    <AdminPrimaryBtn onClick={sendReply}><Send size={14} /> Reply</AdminPrimaryBtn>
                  </div>
                )}
              </AdminCard>
            ) : (
              <AdminCard><p className="text-center py-16" style={{ color: "var(--muted-foreground)" }}>Select a ticket to view conversation</p></AdminCard>
            )}
          </div>
        </div>
      )}

      {mode === "backups" && (
        <AdminCard>
          <div className="space-y-2">
            {backups.map((b) => (
              <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <Database size={18} style={{ color: "#D97706", flexShrink: 0 }} />
                  <div className="min-w-0">
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }} className="truncate">{b.filename}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                      {formatAdminBytes(b.sizeBytes)} · {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <AdminBadge color={b.status === "complete" ? "#10B981" : "#F59E0B"} bg={b.status === "complete" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)"}>
                  {b.status}
                </AdminBadge>
              </div>
            ))}
            {backups.length === 0 && <p className="text-center py-8" style={{ color: "var(--muted-foreground)" }}>No backups yet</p>}
          </div>
        </AdminCard>
      )}

      {mode === "health" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(health).map(([key, h]) => (
            <AdminCard key={key}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${healthColor(h.status)}18` }}>
                  {h.status === "healthy" ? <HeartPulse size={18} style={{ color: healthColor(h.status) }} /> : <AlertCircle size={18} style={{ color: healthColor(h.status) }} />}
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{h.label}</div>
                </div>
                <div className="ml-auto w-3 h-3 rounded-full" style={{ background: healthColor(h.status) }} />
              </div>
            </AdminCard>
          ))}
          {Object.keys(health).length === 0 && (
            <AdminCard><p className="text-center py-8" style={{ color: "var(--muted-foreground)" }}>No health data</p></AdminCard>
          )}
        </div>
      )}

      {mode === "storage" && storage && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <AdminCard>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Total storage</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--foreground)", marginTop: 4 }}>{formatAdminBytes(storage.totalBytes)}</div>
            </AdminCard>
            <AdminCard>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Total files</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--foreground)", marginTop: 4 }}>{storage.fileCount.toLocaleString()}</div>
            </AdminCard>
          </div>
          <AdminCard title="Largest files">
            <div className="space-y-2">
              {storage.largestFiles.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate" style={{ fontWeight: 600, fontSize: "13px" }}>{f.filename}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{f.userName}</div>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#D97706", flexShrink: 0 }}>{formatAdminBytes(f.sizeBytes)}</span>
                  <button type="button" onClick={() => deleteFile(f.id, f.filename)} className="p-2 rounded-lg flex-shrink-0" style={{ color: "#EF4444" }}><Trash2 size={14} /></button>
                </div>
              ))}
              {storage.largestFiles.length === 0 && <p style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>No files</p>}
            </div>
          </AdminCard>
          <AdminCard title="Usage by user">
            <div className="space-y-2">
              {storage.userUsage.map((u, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13px" }}>{u.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#4F46E5" }}>{formatAdminBytes(u.totalBytes)}</span>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      )}

      {mode === "notifications" && (
        <div className="space-y-2">
          {notifications.map((n) => (
            <AdminCard key={n.id}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: n.isRead ? "var(--muted)" : "rgba(245,158,11,0.15)" }}>
                  <Bell size={16} style={{ color: n.isRead ? "var(--muted-foreground)" : "#D97706" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>{n.title}</span>
                    {!n.isRead && <AdminBadge color="#D97706" bg="rgba(245,158,11,0.12)">New</AdminBadge>}
                    <AdminBadge color="#4F46E5" bg="rgba(79,70,229,0.12)">{n.type}</AdminBadge>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: 4 }}>{n.body}</p>
                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{new Date(n.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </AdminCard>
          ))}
          {notifications.length === 0 && (
            <AdminCard><p className="text-center py-8" style={{ color: "var(--muted-foreground)" }}>No notifications</p></AdminCard>
          )}
        </div>
      )}
    </div>
  );
}
