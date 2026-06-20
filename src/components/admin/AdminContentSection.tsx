import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Eye } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type { PlatformAnnouncement, EmailTemplate, AnnouncementType } from "@/types/admin";
import { AdminPageHeader, AdminCard, AdminLoading, AdminBadge, AdminPrimaryBtn } from "./adminShared";

const inputStyle: React.CSSProperties = {
  background: "var(--background)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
};

const typeColors: Record<AnnouncementType, { color: string; bg: string }> = {
  info: { color: "#4F46E5", bg: "rgba(79,70,229,0.12)" },
  warning: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  maintenance: { color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  update: { color: "#10B981", bg: "rgba(16,185,129,0.12)" },
};

type ContentMode = "announcements" | "email-templates";

const emptyAnnouncement = (): Partial<PlatformAnnouncement> => ({
  title: "", body: "", type: "info", isPinned: false, expiresAt: null,
});

export function AdminContentSection({ mode }: { mode: ContentMode }) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editAnn, setEditAnn] = useState<Partial<PlatformAnnouncement> | null>(null);
  const [editTpl, setEditTpl] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "announcements") {
        const res = await api.adminAnnouncements();
        setAnnouncements(res.announcements);
      } else {
        const res = await api.adminEmailTemplates();
        setTemplates(res.templates);
      }
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }, [mode, showToast]);

  useEffect(() => { load(); }, [load]);

  const saveAnnouncement = async () => {
    if (!editAnn?.title?.trim()) return;
    setSaving(true);
    try {
      if (editAnn.id) {
        await api.adminUpdateAnnouncement(editAnn.id, editAnn);
        showToast("Announcement updated", "success");
      } else {
        await api.adminCreateAnnouncement(editAnn);
        showToast("Announcement created", "success");
      }
      setEditAnn(null);
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteAnnouncement = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await api.adminDeleteAnnouncement(id);
      showToast("Deleted", "success");
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Delete failed", "error");
    }
  };

  const saveTemplate = async () => {
    if (!editTpl) return;
    setSaving(true);
    try {
      await api.adminUpdateEmailTemplate(editTpl.key, { subject: editTpl.subject, bodyHtml: editTpl.bodyHtml });
      showToast("Template saved", "success");
      setEditTpl(null);
      setShowPreview(false);
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoading />;

  return (
    <div className="max-w-[900px] mx-auto space-y-4">
      <AdminPageHeader
        title={mode === "announcements" ? "Announcements" : "Email Templates"}
        subtitle={mode === "announcements" ? "Broadcast messages to all users" : "Customize transactional emails"}
        onRefresh={load}
        actions={
          mode === "announcements" ? (
            <AdminPrimaryBtn onClick={() => setEditAnn(emptyAnnouncement())}><Plus size={14} /> New</AdminPrimaryBtn>
          ) : undefined
        }
      />

      {mode === "announcements" && (
        <div className="space-y-3">
          {announcements.map((a) => {
            const tc = typeColors[a.type];
            return (
              <AdminCard key={a.id}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--foreground)" }}>{a.title}</h3>
                      <AdminBadge color={tc.color} bg={tc.bg}>{a.type}</AdminBadge>
                      {a.isPinned && <AdminBadge color="#D97706" bg="rgba(245,158,11,0.12)">Pinned</AdminBadge>}
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.5 }}>{a.body}</p>
                    <div className="flex gap-3 mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                      {a.expiresAt && <span>Expires {new Date(a.expiresAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button type="button" onClick={() => setEditAnn(a)} className="p-2 rounded-lg" style={{ color: "#4F46E5" }}><Pencil size={15} /></button>
                    <button type="button" onClick={() => deleteAnnouncement(a.id)} className="p-2 rounded-lg" style={{ color: "#EF4444" }}><Trash2 size={15} /></button>
                  </div>
                </div>
              </AdminCard>
            );
          })}
          {announcements.length === 0 && (
            <AdminCard><p className="text-center py-8" style={{ color: "var(--muted-foreground)" }}>No announcements yet</p></AdminCard>
          )}
        </div>
      )}

      {mode === "email-templates" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setEditTpl({ ...t }); setShowPreview(false); }}
              className="text-left rounded-2xl p-4 transition-all"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>{t.name}</div>
              <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 4 }}>{t.subject}</div>
              {t.updatedAt && <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: 8 }}>Updated {new Date(t.updatedAt).toLocaleDateString()}</div>}
            </button>
          ))}
        </div>
      )}

      {editAnn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,13,42,0.5)" }}>
          <div className="w-full max-w-lg rounded-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: "18px", fontWeight: 700 }}>{editAnn.id ? "Edit" : "New"} announcement</h3>
              <button type="button" onClick={() => setEditAnn(null)}><X size={18} style={{ color: "var(--muted-foreground)" }} /></button>
            </div>
            <input value={editAnn.title ?? ""} onChange={(e) => setEditAnn((a) => a && { ...a, title: e.target.value })} placeholder="Title" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            <textarea value={editAnn.body ?? ""} onChange={(e) => setEditAnn((a) => a && { ...a, body: e.target.value })} placeholder="Body" rows={4} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-y" style={inputStyle} />
            <select value={editAnn.type ?? "info"} onChange={(e) => setEditAnn((a) => a && { ...a, type: e.target.value as AnnouncementType })} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="maintenance">Maintenance</option>
              <option value="update">Update</option>
            </select>
            <input type="datetime-local" value={editAnn.expiresAt?.slice(0, 16) ?? ""} onChange={(e) => setEditAnn((a) => a && { ...a, expiresAt: e.target.value || null })} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--foreground)" }}>
              <input type="checkbox" checked={editAnn.isPinned ?? false} onChange={(e) => setEditAnn((a) => a && { ...a, isPinned: e.target.checked })} />
              Pin to top
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditAnn(null)} className="admin-btn-secondary">Cancel</button>
              <AdminPrimaryBtn onClick={saveAnnouncement} disabled={saving}><Save size={14} /> Save</AdminPrimaryBtn>
            </div>
          </div>
        </div>
      )}

      {editTpl && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(15,13,42,0.5)" }}>
          <div className="w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl max-h-[95vh] overflow-hidden flex flex-col" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700 }}>{editTpl.name}</h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowPreview(!showPreview)} className="admin-btn-secondary"><Eye size={14} /> {showPreview ? "Edit" : "Preview"}</button>
                <button type="button" onClick={() => { setEditTpl(null); setShowPreview(false); }}><X size={18} style={{ color: "var(--muted-foreground)" }} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {showPreview ? (
                <div>
                  <div className="mb-3 p-3 rounded-xl" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--muted-foreground)", fontWeight: 600 }}>SUBJECT</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginTop: 4 }}>{editTpl.subject}</div>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "white", border: "1px solid var(--border)", minHeight: 200 }} dangerouslySetInnerHTML={{ __html: editTpl.bodyHtml }} />
                </div>
              ) : (
                <>
                  <input value={editTpl.subject} onChange={(e) => setEditTpl((t) => t && { ...t, subject: e.target.value })} placeholder="Subject" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  <textarea value={editTpl.bodyHtml} onChange={(e) => setEditTpl((t) => t && { ...t, bodyHtml: e.target.value })} placeholder="HTML body" rows={12} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-mono resize-y" style={inputStyle} />
                </>
              )}
            </div>
            <div className="flex gap-2 justify-end px-5 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
              <button type="button" onClick={() => { setEditTpl(null); setShowPreview(false); }} className="admin-btn-secondary">Cancel</button>
              <AdminPrimaryBtn onClick={saveTemplate} disabled={saving}><Save size={14} /> Save</AdminPrimaryBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
