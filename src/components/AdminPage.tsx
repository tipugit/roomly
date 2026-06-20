import { useCallback, useEffect, useState } from "react";
import {
  Shield, Users, Home, FileText, UserPlus, Trash2, KeyRound,
  Loader2, Search, RefreshCw, Crown, Building2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import type { AdminHouse, AdminStats, AdminUser, UserRole } from "@/types";

type Tab = "overview" | "users" | "homes";

export function AdminPage() {
  const { showToast } = useApp();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [houses, setHouses] = useState<AdminHouse[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "user" as UserRole });
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const loadOverview = useCallback(async () => {
    const res = await api.adminStats();
    setStats(res.stats);
    setRecentUsers(res.recentUsers);
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await api.adminUsers();
    setUsers(res.users);
  }, []);

  const loadHouses = useCallback(async () => {
    const res = await api.adminHouses();
    setHouses(res.houses);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "overview") await loadOverview();
      else if (tab === "users") await loadUsers();
      else await loadHouses();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Failed to load admin data", "error");
    } finally {
      setLoading(false);
    }
  }, [tab, loadOverview, loadUsers, loadHouses, showToast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleCreateUser = async () => {
    try {
      await api.adminCreateUser(createForm);
      showToast("User created", "success");
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "", role: "user" });
      await loadUsers();
      await loadOverview();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Create failed", "error");
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

  const handleToggleRole = async (u: AdminUser) => {
    const next: UserRole = u.role === "super_admin" ? "user" : "super_admin";
    try {
      await api.adminSetRole(u.id, next);
      showToast(`Role updated to ${next}`, "success");
      await loadUsers();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Role update failed", "error");
    }
  };

  const handleDeleteUser = async (u: AdminUser) => {
    if (!confirm(`Delete user "${u.name}" (${u.email})? This removes all their data.`)) return;
    try {
      await api.adminDeleteUser(u.id);
      showToast("User deleted", "success");
      await loadUsers();
      await loadOverview();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Delete failed", "error");
    }
  };

  const handleDeleteHouse = async (h: AdminHouse) => {
    if (!confirm(`Delete home "${h.name}"? All roommates, bills, and settings will be removed.`)) return;
    try {
      await api.adminDeleteHouse(h.id);
      showToast("Home deleted", "success");
      await loadHouses();
      await loadOverview();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Delete failed", "error");
    }
  };

  const statCards = stats
    ? [
        { label: "Users", value: stats.users, icon: Users, color: "#4F46E5" },
        { label: "Homes", value: stats.houses, icon: Home, color: "#7C3AED" },
        { label: "Bills", value: stats.bills, icon: FileText, color: "#06B6D4" },
        { label: "Roommates", value: stats.roommates, icon: Building2, color: "#10B981" },
      ]
    : [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={22} style={{ color: "#4F46E5" }} />
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--foreground)" }}>Super Admin</h1>
          </div>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
            Platform control — users, homes, and access
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)" }}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
        {([
          ["overview", "Overview"],
          ["users", "Users"],
          ["homes", "All Homes"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all"
            style={{
              background: tab === id ? "var(--card)" : "transparent",
              color: tab === id ? "#4F46E5" : "var(--muted-foreground)",
              boxShadow: tab === id ? "0 2px 8px rgba(79,70,229,0.12)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: "#4F46E5" }} />
        </div>
      ) : tab === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl p-4"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted-foreground)" }}>{s.label}</span>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--foreground)" }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--foreground)" }}>Recent signups</h2>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {recentUsers.length === 0 ? (
                <div className="p-6 text-center" style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>No users yet</div>
              ) : (
                recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>{u.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{u.email}</div>
                    </div>
                    {u.role === "super_admin" && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(245,158,11,0.15)", color: "#D97706" }}>
                        <Crown size={12} /> Admin
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : tab === "users" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
            >
              <UserPlus size={16} />
              Add user
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    <th className="text-left px-5 py-3 font-semibold">User</th>
                    <th className="text-left px-5 py-3 font-semibold">Role</th>
                    <th className="text-left px-5 py-3 font-semibold">Homes</th>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-5 py-3">
                        <div style={{ fontWeight: 600, color: "var(--foreground)" }}>{u.name}</div>
                        <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{u.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            background: u.role === "super_admin" ? "rgba(245,158,11,0.15)" : "var(--muted)",
                            color: u.role === "super_admin" ? "#D97706" : "var(--muted-foreground)",
                          }}
                        >
                          {u.role === "super_admin" ? <Crown size={11} /> : null}
                          {u.role ?? "user"}
                        </span>
                      </td>
                      <td className="px-5 py-3" style={{ color: "var(--foreground)" }}>{u.houseCount ?? 0}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Reset password"
                            onClick={() => { setResetUserId(u.id); setNewPassword(""); }}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            <KeyRound size={16} />
                          </button>
                          {u.id !== user?.id && (
                            <>
                              <button
                                type="button"
                                title="Toggle super admin"
                                onClick={() => handleToggleRole(u)}
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: "#D97706" }}
                              >
                                <Crown size={16} />
                              </button>
                              <button
                                type="button"
                                title="Delete user"
                                onClick={() => handleDeleteUser(u)}
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: "#EF4444" }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: "11px", textTransform: "uppercase" }}>
                  <th className="text-left px-5 py-3 font-semibold">Home</th>
                  <th className="text-left px-5 py-3 font-semibold">Owner</th>
                  <th className="text-left px-5 py-3 font-semibold">Roommates</th>
                  <th className="text-left px-5 py-3 font-semibold">Bills</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {houses.map((h) => (
                  <tr key={h.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-5 py-3" style={{ fontWeight: 600, color: "var(--foreground)" }}>{h.name}</td>
                    <td className="px-5 py-3">
                      <div style={{ color: "var(--foreground)" }}>{h.ownerName}</div>
                      <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{h.ownerEmail}</div>
                    </td>
                    <td className="px-5 py-3">{h.roommateCount}</td>
                    <td className="px-5 py-3">{h.billCount}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteHouse(h)}
                        className="p-2 rounded-lg inline-flex"
                        style={{ color: "#EF4444" }}
                        title="Delete home"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,13,42,0.5)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--foreground)" }}>Create user</h3>
            {(["name", "email", "password"] as const).map((field) => (
              <input
                key={field}
                type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                value={createForm[field]}
                onChange={(e) => setCreateForm((f) => ({ ...f, [field]: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              />
            ))}
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            >
              <option value="user">User</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm" style={{ color: "var(--muted-foreground)" }}>Cancel</button>
              <button type="button" onClick={handleCreateUser} className="px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {resetUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,13,42,0.5)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--foreground)" }}>Reset password</h3>
            <input
              type="password"
              placeholder="New password (min 6 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setResetUserId(null)} className="px-4 py-2 rounded-xl text-sm" style={{ color: "var(--muted-foreground)" }}>Cancel</button>
              <button type="button" onClick={handleResetPassword} className="px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
