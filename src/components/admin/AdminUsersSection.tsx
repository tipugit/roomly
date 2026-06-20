import { useCallback, useEffect, useState } from "react";
import {
  UserPlus, KeyRound, Trash2, Crown, Eye, UserCog, Ban, CheckCircle,
  UserX, LogIn, MoreHorizontal, X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import type { AdminUserDetail, UserStatus } from "@/types/admin";
import type { UserRole } from "@/types";
import {
  AdminPageHeader, AdminCard, AdminLoading, AdminSearchBar, AdminTable,
  AdminBadge, AdminPrimaryBtn, AdminExportBtn,
} from "./adminShared";

const inputStyle: React.CSSProperties = {
  background: "var(--background)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
};

const statusStyle: Record<UserStatus, { color: string; bg: string }> = {
  active: { color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  suspended: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  disabled: { color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,13,42,0.5)" }}>
      <div className="w-full max-w-md rounded-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--foreground)" }}>{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg" style={{ color: "var(--muted-foreground)" }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Drawer({ user, onClose }: { user: AdminUserDetail; onClose: () => void }) {
  const fields = [
    ["Email", user.email],
    ["Phone", user.phone ?? "—"],
    ["Role", user.role ?? "user"],
    ["Status", user.status ?? "active"],
    ["Plan", user.planName ?? "—"],
    ["Houses", String(user.houseCount ?? 0)],
    ["Members", String(user.memberCount ?? 0)],
    ["Bills", String(user.billCount ?? 0)],
    ["Expenses", String(user.expenseCount ?? 0)],
    ["Joined", user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"],
    ["Last login", user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(15,13,42,0.45)" }} onClick={onClose}>
      <div
        className="w-full max-w-md h-full overflow-y-auto p-5 sm:p-6"
        style={{ background: "var(--card)", borderLeft: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--foreground)" }}>{user.name}</h3>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl" style={{ border: "1px solid var(--border)" }}><X size={16} /></button>
        </div>
        <div className="space-y-3">
          {fields.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "12px", color: "var(--muted-foreground)", fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500, textAlign: "right" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminUsersSection() {
  const { showToast, navigate } = useApp();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserDetail[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserDetail | null>(null);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserDetail | null>(null);
  const [menuUserId, setMenuUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "user" as UserRole });
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminUsersFiltered({
        q: search || undefined,
        status: statusFilter || undefined,
      });
      setUsers(res.users);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleCreate = async () => {
    try {
      await api.adminCreateUser(createForm);
      showToast("User created", "success");
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "", role: "user" });
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Create failed", "error");
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    try {
      await api.adminUpdateUser(editUser.id, editForm);
      showToast("User updated", "success");
      setEditUser(null);
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Update failed", "error");
    }
  };

  const handleResetPassword = async () => {
    if (!resetUserId || newPassword.length < 6) return;
    try {
      await api.adminResetPassword(resetUserId, newPassword);
      showToast("Password reset", "success");
      setResetUserId(null);
      setNewPassword("");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Reset failed", "error");
    }
  };

  const handleStatus = async (id: number, status: UserStatus) => {
    try {
      await api.adminSetUserStatus(id, status);
      showToast(`User ${status}`, "success");
      setMenuUserId(null);
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Status update failed", "error");
    }
  };

  const handleToggleRole = async (u: AdminUserDetail) => {
    const next: UserRole = u.role === "super_admin" ? "user" : "super_admin";
    try {
      await api.adminSetRole(u.id, next);
      showToast(`Role set to ${next}`, "success");
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Role update failed", "error");
    }
  };

  const handleDelete = async (u: AdminUserDetail) => {
    if (!confirm(`Delete "${u.name}"? This removes all their data.`)) return;
    try {
      await api.adminDeleteUser(u.id);
      showToast("User deleted", "success");
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Delete failed", "error");
    }
  };

  const handleImpersonate = async (u: AdminUserDetail) => {
    if (!confirm(`Impersonate ${u.name}? You will be logged in as this user.`)) return;
    try {
      await api.adminImpersonate(u.id);
      showToast(`Now impersonating ${u.name}`, "info");
      navigate("dashboard");
      window.location.reload();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Impersonation failed", "error");
    }
  };

  const openEdit = (u: AdminUserDetail) => {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, phone: u.phone ?? "" });
    setMenuUserId(null);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      <AdminPageHeader
        title="Users"
        subtitle="Manage accounts, roles, and access"
        onRefresh={load}
        actions={
          <>
            <AdminExportBtn href={api.adminExportUsersUrl()} />
            <AdminPrimaryBtn onClick={() => setShowCreate(true)}><UserPlus size={14} /> Add user</AdminPrimaryBtn>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <AdminSearchBar value={search} onChange={setSearch} placeholder="Search by name or email…" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none sm:w-40"
          style={{ background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <AdminCard>
        {loading ? <AdminLoading /> : (
          <AdminTable headers={["User", "Role", "Status", "Homes", "Joined", "Actions"]}>
            {users.map((u) => {
              const st = (u.status ?? "active") as UserStatus;
              const ss = statusStyle[st];
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3">
                    <div style={{ fontWeight: 600, color: "var(--foreground)" }}>{u.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge color={u.role === "super_admin" ? "#D97706" : "var(--muted-foreground)"} bg={u.role === "super_admin" ? "rgba(245,158,11,0.15)" : "var(--muted)"}>
                      {u.role === "super_admin" ? <span className="inline-flex items-center gap-1"><Crown size={10} /> Admin</span> : (u.role ?? "user")}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge color={ss.color} bg={ss.bg}>{st}</AdminBadge>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>{u.houseCount ?? 0}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 relative">
                      <button type="button" title="View details" onClick={() => setDetailUser(u)} className="p-2 rounded-lg" style={{ color: "#4F46E5" }}><Eye size={15} /></button>
                      <button type="button" title="Edit" onClick={() => openEdit(u)} className="p-2 rounded-lg" style={{ color: "var(--muted-foreground)" }}><UserCog size={15} /></button>
                      <button type="button" title="More actions" onClick={() => setMenuUserId(menuUserId === u.id ? null : u.id)} className="p-2 rounded-lg" style={{ color: "var(--muted-foreground)" }}><MoreHorizontal size={15} /></button>
                      {menuUserId === u.id && (
                        <div
                          className="absolute right-0 top-full mt-1 z-20 rounded-xl py-1 min-w-[180px] shadow-lg"
                          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                        >
                          <ActionItem icon={KeyRound} label="Reset password" onClick={() => { setResetUserId(u.id); setNewPassword(""); setMenuUserId(null); }} />
                          {st !== "suspended" && u.id !== currentUser?.id && (
                            <ActionItem icon={Ban} label="Suspend" onClick={() => handleStatus(u.id, "suspended")} />
                          )}
                          {st === "suspended" && (
                            <ActionItem icon={CheckCircle} label="Activate" onClick={() => handleStatus(u.id, "active")} />
                          )}
                          {st !== "disabled" && u.id !== currentUser?.id && (
                            <ActionItem icon={UserX} label="Disable" onClick={() => handleStatus(u.id, "disabled")} color="#EF4444" />
                          )}
                          {st === "disabled" && (
                            <ActionItem icon={CheckCircle} label="Activate" onClick={() => handleStatus(u.id, "active")} />
                          )}
                          {u.id !== currentUser?.id && (
                            <>
                              <ActionItem icon={LogIn} label="Impersonate" onClick={() => handleImpersonate(u)} color="#D97706" />
                              <ActionItem icon={Crown} label="Toggle admin role" onClick={() => { handleToggleRole(u); setMenuUserId(null); }} color="#D97706" />
                              <ActionItem icon={Trash2} label="Delete" onClick={() => { handleDelete(u); setMenuUserId(null); }} color="#EF4444" />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>No users found</td></tr>
            )}
          </AdminTable>
        )}
      </AdminCard>

      {showCreate && (
        <Modal title="Create user" onClose={() => setShowCreate(false)}>
          {(["name", "email", "password"] as const).map((field) => (
            <input
              key={field}
              type={field === "password" ? "password" : field === "email" ? "email" : "text"}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={createForm[field]}
              onChange={(e) => setCreateForm((f) => ({ ...f, [field]: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          ))}
          <select value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as UserRole }))} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
            <option value="user">User</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="admin-btn-secondary">Cancel</button>
            <button type="button" onClick={handleCreate} className="admin-btn-primary">Create</button>
          </div>
        </Modal>
      )}

      {editUser && (
        <Modal title="Edit user" onClose={() => setEditUser(null)}>
          {(["name", "email", "phone"] as const).map((field) => (
            <input
              key={field}
              type={field === "email" ? "email" : "text"}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={editForm[field]}
              onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          ))}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setEditUser(null)} className="admin-btn-secondary">Cancel</button>
            <button type="button" onClick={handleEdit} className="admin-btn-primary">Save</button>
          </div>
        </Modal>
      )}

      {resetUserId !== null && (
        <Modal title="Reset password" onClose={() => setResetUserId(null)}>
          <input
            type="password"
            placeholder="New password (min 6 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setResetUserId(null)} className="admin-btn-secondary">Cancel</button>
            <button type="button" onClick={handleResetPassword} className="admin-btn-primary">Reset</button>
          </div>
        </Modal>
      )}

      {detailUser && <Drawer user={detailUser} onClose={() => setDetailUser(null)} />}
    </div>
  );
}

function ActionItem({ icon: Icon, label, onClick, color }: { icon: typeof KeyRound; label: string; onClick: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:opacity-80"
      style={{ color: color ?? "var(--foreground)" }}
    >
      <Icon size={14} /> {label}
    </button>
  );
}
