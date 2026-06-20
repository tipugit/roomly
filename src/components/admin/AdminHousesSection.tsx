import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type { AdminHouseDetail, HouseStatus } from "@/types/admin";
import {
  AdminPageHeader, AdminCard, AdminLoading, AdminSearchBar, AdminTable,
  AdminBadge, AdminPrimaryBtn,
} from "./adminShared";

const inputStyle: React.CSSProperties = {
  background: "var(--background)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
};

const statusStyle: Record<HouseStatus, { color: string; bg: string }> = {
  active: { color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  suspended: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  archived: { color: "#64748B", bg: "rgba(100,116,139,0.12)" },
};

export function AdminHousesSection() {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [houses, setHouses] = useState<AdminHouseDetail[]>([]);
  const [search, setSearch] = useState("");
  const [editHouse, setEditHouse] = useState<AdminHouseDetail | null>(null);
  const [editForm, setEditForm] = useState({ name: "", status: "active" as HouseStatus });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminHouses();
      setHouses(res.houses as AdminHouseDetail[]);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Failed to load houses", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = houses.filter((h) => {
    const q = search.toLowerCase();
    return h.name.toLowerCase().includes(q) || h.ownerName.toLowerCase().includes(q) || h.ownerEmail.toLowerCase().includes(q);
  });

  const openEdit = (h: AdminHouseDetail) => {
    setEditHouse(h);
    setEditForm({ name: h.name, status: (h.status ?? "active") as HouseStatus });
  };

  const handleSave = async () => {
    if (!editHouse) return;
    try {
      await api.adminUpdateHouse(editHouse.id, editForm);
      showToast("House updated", "success");
      setEditHouse(null);
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Update failed", "error");
    }
  };

  const handleDelete = async (h: AdminHouseDetail) => {
    if (!confirm(`Delete "${h.name}"? All roommates, bills, and settings will be removed.`)) return;
    try {
      await api.adminDeleteHouse(h.id);
      showToast("House deleted", "success");
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Delete failed", "error");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      <AdminPageHeader title="Houses" subtitle="Manage all homes on the platform" onRefresh={load} />

      <AdminSearchBar value={search} onChange={setSearch} placeholder="Search by name or owner…" />

      <AdminCard>
        {loading ? <AdminLoading /> : (
          <AdminTable headers={["Home", "Owner", "Status", "Roommates", "Bills", "Actions"]}>
            {filtered.map((h) => {
              const st = (h.status ?? "active") as HouseStatus;
              const ss = statusStyle[st];
              return (
                <tr key={h.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3">
                    <div style={{ fontWeight: 600, color: "var(--foreground)" }}>{h.name}</div>
                    {h.createdAt && <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Created {new Date(h.createdAt).toLocaleDateString()}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div style={{ color: "var(--foreground)" }}>{h.ownerName}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{h.ownerEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge color={ss.color} bg={ss.bg}>{st}</AdminBadge>
                  </td>
                  <td className="px-4 py-3">{h.roommateCount}</td>
                  <td className="px-4 py-3">{h.billCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" title="Edit" onClick={() => openEdit(h)} className="p-2 rounded-lg" style={{ color: "#4F46E5" }}><Pencil size={15} /></button>
                      <button type="button" title="Delete" onClick={() => handleDelete(h)} className="p-2 rounded-lg" style={{ color: "#EF4444" }}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>No houses found</td></tr>
            )}
          </AdminTable>
        )}
      </AdminCard>

      {editHouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,13,42,0.5)" }}>
          <div className="w-full max-w-md rounded-2xl p-5 sm:p-6 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--foreground)" }}>Edit house</h3>
              <button type="button" onClick={() => setEditHouse(null)} className="p-1"><X size={18} style={{ color: "var(--muted-foreground)" }} /></button>
            </div>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="House name"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
            <select
              value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as HouseStatus }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setEditHouse(null)} className="admin-btn-secondary">Cancel</button>
              <AdminPrimaryBtn onClick={handleSave}>Save</AdminPrimaryBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
