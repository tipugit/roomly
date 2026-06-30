import { useMemo, useState, type FormEvent } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit2,
  Pencil,
  Check,
  Trash2,
  Phone,
  Mail,
  Home,
  MoreVertical,
  X,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatMemberDate, todayISO } from "@/lib/memberDates";
import type { Roommate, RoommateStatus } from "@/types";

const STATUS_ORDER: RoommateStatus[] = ["Active", "Pending", "Inactive"];

const statusStyle: Record<RoommateStatus, { bg: string; text: string; dot: string }> = {
  Active: { bg: "#ECFDF5", text: "#059669", dot: "#10B981" },
  Pending: { bg: "#FFFBEB", text: "#D97706", dot: "#F59E0B" },
  Inactive: { bg: "#F1F5F9", text: "#64748B", dot: "#94A3B8" },
};

const payStyle: Record<string, { bg: string; text: string }> = {
  Paid: { bg: "#ECFDF5", text: "#059669" },
  Partial: { bg: "#FFFBEB", text: "#D97706" },
  Pending: { bg: "#FEF2F2", text: "#EF4444" },
};

type FilterOption = "All" | RoommateStatus;

interface AddModalProps {
  onClose: () => void;
  onAdd: (data: {
    name: string;
    room: string;
    phone: string;
    email: string;
    occupation: string;
    status: RoommateStatus;
    joinDate: string;
    note?: string;
  }) => void;
}

function AddModal({ onClose, onAdd }: AddModalProps) {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [occupation, setOccupation] = useState("");
  const [status, setStatus] = useState<RoommateStatus>("Active");
  const [joinDate, setJoinDate] = useState(todayISO());
  const [note, setNote] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      room: room.trim() || "—",
      phone: phone.trim() || "—",
      email: email.trim() || "—",
      occupation: occupation.trim() || "—",
      status,
      joinDate,
      note: note.trim() || undefined,
    });
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl outline-none transition-all focus:border-[#4F46E5]";
  const inputStyle = {
    background: "var(--muted)",
    border: "1.5px solid var(--border)",
    color: "var(--foreground)",
    fontSize: "13px",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(15,13,42,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg my-auto max-h-[90vh] flex flex-col rounded-3xl overflow-hidden"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 32px 80px rgba(79,70,229,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div
            className="px-7 py-5 flex items-center justify-between flex-shrink-0"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}
          >
            <div>
              <h2 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "18px" }}>
                Add New Roommate
              </h2>
              <p style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
                Fill in the details below
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{ background: "var(--border)" }}
            >
              <X size={15} style={{ color: "var(--foreground)" }} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4 min-h-0">
            <div>
              <label
                style={{
                  color: "var(--foreground)",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  color: "var(--foreground)",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Room Number
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. 106"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  color: "var(--foreground)",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  color: "var(--foreground)",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  color: "var(--foreground)",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Occupation
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Engineer"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Member Since
              </label>
              <input
                type="date"
                required
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
              <p style={{ color: "var(--muted-foreground)", fontSize: "10px", marginTop: 4 }}>
                Only bills from this date onward will include this member
              </p>
            </div>
            <div>
              <label style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Note (optional)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Has a cat, prefers ground floor..."
                className={`${inputClass} resize-none`}
                style={inputStyle}
              />
            </div>
            <div>
              <label
                style={{
                  color: "var(--foreground)",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RoommateStatus)}
                className={`${inputClass} appearance-none`}
                style={inputStyle}
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="px-7 py-5 flex gap-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--card)" }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-semibold transition-all"
              style={{ background: "var(--muted)", color: "var(--foreground)", fontSize: "13px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                boxShadow: "0 4px 14px rgba(79,70,229,0.3)",
                fontSize: "13px",
              }}
            >
              <CheckCircle2 size={15} />
              Add Roommate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({
  roommate,
  onClose,
  onSave,
}: {
  roommate: Roommate;
  onClose: () => void;
  onSave: (data: Partial<Roommate>) => void;
}) {
  const [name, setName] = useState(roommate.name);
  const [room, setRoom] = useState(roommate.room);
  const [phone, setPhone] = useState(roommate.phone);
  const [email, setEmail] = useState(roommate.email);
  const [occupation, setOccupation] = useState(roommate.occupation);
  const [status, setStatus] = useState(roommate.status);
  const [joinDate, setJoinDate] = useState(roommate.joinDate || todayISO());
  const [moveOutDate, setMoveOutDate] = useState(roommate.moveOutDate ?? "");
  const [note, setNote] = useState(roommate.note ?? "");
  const [showMoveOut, setShowMoveOut] = useState(false);
  const [moveOutDraft, setMoveOutDraft] = useState(todayISO());

  const inputStyle = {
    background: "var(--muted)",
    border: "1.5px solid var(--border)",
    color: "var(--foreground)",
    fontSize: "13px",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(15,13,42,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg my-auto max-h-[90vh] flex flex-col rounded-3xl overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 32px 80px rgba(79,70,229,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 py-5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
          <h2 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "18px" }}>Edit Roommate</h2>
          <button type="button" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-4 min-h-0">
          {[
            { label: "Full Name", value: name, set: setName },
            { label: "Room", value: room, set: setRoom },
            { label: "Phone", value: phone, set: setPhone },
            { label: "Email", value: email, set: setEmail },
            { label: "Occupation", value: occupation, set: setOccupation },
          ].map((f) => (
            <div key={f.label}>
              <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>{f.label}</label>
              <input
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl outline-none"
                style={inputStyle}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>Member Since</label>
            <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl outline-none" style={inputStyle} />
          </div>
          {moveOutDate && (
            <div className="p-3 rounded-xl" style={{ background: "#F1F5F9", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Moved out: {formatMemberDate(moveOutDate)}</p>
            </div>
          )}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>Note</label>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="w-full px-4 py-2.5 rounded-xl outline-none resize-none" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as RoommateStatus)} className="w-full px-4 py-2.5 rounded-xl outline-none appearance-none" style={inputStyle}>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          {roommate.status !== "Inactive" && !showMoveOut && (
            <button
              type="button"
              onClick={() => setShowMoveOut(true)}
              className="w-full py-2.5 rounded-xl font-semibold text-sm"
              style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              Record Move Out
            </button>
          )}
          {showMoveOut && (
            <div className="p-4 rounded-xl space-y-3" style={{ background: "#FEF2F2", border: "1px solid rgba(239,68,68,0.15)" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#EF4444" }}>Move-out date</p>
              <input type="date" value={moveOutDraft} onChange={(e) => setMoveOutDraft(e.target.value)} className="w-full px-4 py-2.5 rounded-xl outline-none" style={inputStyle} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowMoveOut(false)} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: "var(--muted)" }}>Cancel</button>
                <button
                  type="button"
                  onClick={() => {
                    setMoveOutDate(moveOutDraft);
                    setStatus("Inactive");
                    setShowMoveOut(false);
                  }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ background: "#EF4444" }}
                >
                  Confirm Move Out
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="px-7 py-5 flex gap-3" style={{ borderTop: "1px solid var(--border)" }}>
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl font-semibold" style={{ background: "var(--muted)", fontSize: "13px" }}>Cancel</button>
          <button
            type="button"
            onClick={() => onSave({ name, room, phone, email, occupation, status, joinDate, moveOutDate: moveOutDate || undefined, note: note || undefined })}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", fontSize: "13px" }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewModal({ roommate, onClose }: { roommate: Roommate; onClose: () => void }) {
  const ps = payStyle[roommate.payStatus];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(15,13,42,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md my-auto max-h-[90vh] flex flex-col rounded-3xl overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 32px 80px rgba(79,70,229,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-2 flex-shrink-0" style={{ background: roommate.avatarGrad }} />
        <div className="flex-1 overflow-y-auto p-7 text-center min-h-0">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4" style={{ background: roommate.avatarGrad }}>
            {roommate.initials}
          </div>
          <h2 style={{ fontWeight: 800, fontSize: "20px" }}>{roommate.name}</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: 4 }}>{roommate.occupation}</p>
          <div className="mt-6 space-y-3 text-left">
            {[
              ["Room", roommate.room],
              ["Phone", roommate.phone],
              ["Email", roommate.email],
              ["Status", roommate.status],
              ["Monthly share", roommate.share],
              ["Member since", formatMemberDate(roommate.joinDate)],
              ...(roommate.moveOutDate ? [["Moved out", formatMemberDate(roommate.moveOutDate)] as const] : []),
              ...(roommate.note ? [["Note", roommate.note] as const] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>{k}</span>
                <span style={{ fontWeight: 600, fontSize: "13px" }}>{v}</span>
              </div>
            ))}
            <div className="flex justify-between py-2">
              <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>Payment</span>
              <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: ps.bg, color: ps.text, fontSize: "11px" }}>{roommate.payStatus}</span>
            </div>
          </div>
        </div>
        <div className="p-5 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl font-semibold text-white" style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", fontSize: "13px" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function nextStatus(current: RoommateStatus): RoommateStatus {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}

export function RoommatesPage() {
  const { roommates, activeBill, addRoommate, deleteRoommate, updateRoommate, updatePayment, showToast } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("All");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Roommate | null>(null);
  const [viewTarget, setViewTarget] = useState<Roommate | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [paymentDraft, setPaymentDraft] = useState("");

  const counts = useMemo(
    () => ({
      All: roommates.length,
      Active: roommates.filter((r) => r.status === "Active").length,
      Pending: roommates.filter((r) => r.status === "Pending").length,
      Inactive: roommates.filter((r) => r.status === "Inactive").length,
    }),
    [roommates]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return roommates.filter((r) => {
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.room.toLowerCase().includes(q);
      const matchFilter = filter === "All" || r.status === filter;
      return matchSearch && matchFilter;
    });
  }, [roommates, search, filter]);

  const activeBillShares = useMemo(() => {
    const shareMap = new Map<number, { paid: number; share: number; status: string }>();
    activeBill?.roommateShares.forEach((share) => {
      shareMap.set(share.roommateId, {
        paid: share.paid,
        share: share.share,
        status: share.status,
      });
    });
    return shareMap;
  }, [activeBill]);

  const handleAdd = (data: Parameters<typeof addRoommate>[0]) => {
    addRoommate(data);
    setShowModal(false);
  };

  const handleEdit = (roommate: Roommate) => {
    setEditTarget(roommate);
  };

  const handleView = (roommate: Roommate) => {
    setViewTarget(roommate);
  };

  const handleDelete = (roommate: Roommate) => {
    deleteRoommate(roommate.id);
  };

  const openPaymentEditor = (roommateId: number, paid: number) => {
    setEditingPaymentId(roommateId);
    setPaymentDraft(paid > 0 ? String(Number(paid.toFixed(2))) : "");
  };

  const closePaymentEditor = () => {
    setEditingPaymentId(null);
    setPaymentDraft("");
  };

  const savePayment = async (roommateId: number) => {
    const raw = paymentDraft.trim();
    const nextPaid = raw === "" ? 0 : Number(raw);
    if (!Number.isFinite(nextPaid) || nextPaid < 0) {
      showToast("Enter a valid payment amount", "error");
      return;
    }
    await updatePayment(roommateId, nextPaid);
    closePaymentEditor();
  };

  const filterOptions: FilterOption[] = ["All", "Active", "Pending", "Inactive"];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1
            style={{
              color: "var(--foreground)",
              fontWeight: 800,
              fontSize: "clamp(20px, 5vw, 26px)",
              letterSpacing: "-0.5px",
            }}
          >
            Roommates
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>
            {roommates.length} total · {counts.Active} active · {counts.Pending} pending
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-white font-semibold transition-all active:scale-95 flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
            boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
            fontSize: "13px",
          }}
        >
          <Plus size={15} />
          <span>Add</span>
          <span className="hidden sm:inline">Roommate</span>
        </button>
      </div>

      {/* Search + Filter bar */}
      <div
        className="flex flex-col gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 12px rgba(79,70,229,0.05)",
        }}
      >
        <div
          className="flex items-center gap-2.5 px-3 sm:px-4 py-2.5 rounded-xl"
          style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
        >
          <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by name, email, or room…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none"
            style={{ color: "var(--foreground)", fontSize: "13px" }}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              <X size={13} style={{ color: "var(--muted-foreground)" }} />
            </button>
          )}
        </div>

        <div
          className="flex items-center gap-2 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: "none" }}
        >
          <SlidersHorizontal size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          {filterOptions.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all flex-shrink-0 active:scale-95"
              style={{
                background: filter === f ? "#4F46E5" : "var(--muted)",
                color: filter === f ? "white" : "var(--muted-foreground)",
                fontSize: "12px",
                border: filter === f ? "none" : "1px solid var(--border)",
              }}
            >
              {f}
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{
                  background: filter === f ? "rgba(255,255,255,0.25)" : "var(--border)",
                  color: filter === f ? "white" : "var(--muted-foreground)",
                  fontSize: "9px",
                }}
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {filtered.map((r) => {
          const ss = statusStyle[r.status];
          const ps = payStyle[r.payStatus];
          const billShare = activeBillShares.get(r.id);
          const isEditingPayment = editingPaymentId === r.id;
          return (
            <div
              key={r.id}
              className="rounded-2xl overflow-hidden transition-all duration-300 group"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 2px 20px rgba(79,70,229,0.06)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 16px 50px rgba(79,70,229,0.16)";
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.borderColor = "rgba(79,70,229,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 20px rgba(79,70,229,0.06)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <div className="h-1.5 w-full" style={{ background: r.avatarGrad }} />

              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0"
                      style={{
                        background: r.avatarGrad,
                        boxShadow: "0 4px 12px rgba(79,70,229,0.25)",
                      }}
                    >
                      {r.initials}
                    </div>
                    <div className="min-w-0">
                      <div style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "14px" }}>
                        {r.name}
                      </div>
                      <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 1 }}>
                        {r.occupation}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Home size={10} style={{ color: "var(--muted-foreground)" }} />
                        <span
                          style={{
                            color: "var(--muted-foreground)",
                            fontSize: "11px",
                            fontWeight: 500,
                          }}
                        >
                          Room {r.room}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const newStatus = nextStatus(r.status);
                        updateRoommate(r.id, { status: newStatus });
                      }}
                      title="Click to cycle status"
                      className="flex items-center gap-1 px-2 py-1 rounded-full font-semibold transition-opacity hover:opacity-80"
                      style={{ background: ss.bg, color: ss.text, fontSize: "10px" }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: ss.dot }} />
                      {r.status}
                    </button>
                    <button type="button" className="p-0.5" aria-label="More options">
                      <MoreVertical size={13} style={{ color: "var(--muted-foreground)" }} />
                    </button>
                  </div>
                </div>

                <div
                  className="space-y-1.5 p-2.5 sm:p-3 rounded-xl mb-3 sm:mb-4"
                  style={{ background: "var(--muted)" }}
                >
                  <div className="flex items-center gap-2">
                    <Phone size={11} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <span style={{ color: "var(--foreground)", fontSize: "12px" }}>{r.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={11} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <span
                      style={{
                        color: "var(--foreground)",
                        fontSize: "12px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <div
                      style={{
                        color: "var(--muted-foreground)",
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "0.3px",
                      }}
                    >
                      MONTHLY
                    </div>
                    <div
                      style={{
                        color: "var(--foreground)",
                        fontWeight: 800,
                        fontSize: "18px",
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {r.share}
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      style={{
                        color: "var(--muted-foreground)",
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "0.3px",
                      }}
                    >
                      PAYMENT
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: (billShare ? payStyle[billShare.status] : ps).bg, color: (billShare ? payStyle[billShare.status] : ps).text, fontSize: "11px" }}
                    >
                      {billShare?.status ?? r.payStatus}
                    </span>
                  </div>
                  <div className="text-right">
                    <div
                      style={{
                        color: "var(--muted-foreground)",
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "0.3px",
                      }}
                    >
                      SINCE
                    </div>
                    <div style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}>
                      {formatMemberDate(r.joinDate)}
                    </div>
                  </div>
                </div>

                {billShare && (
                  <div className="mb-3 sm:mb-4 p-3 rounded-xl" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.3px" }}>
                          PAID THIS MONTH
                        </div>
                        <div style={{ color: "var(--foreground)", fontWeight: 800, fontSize: "16px", letterSpacing: "-0.2px", marginTop: 2 }}>
                          ${billShare.paid.toLocaleString()}
                        </div>
                      </div>
                      {!isEditingPayment && (
                        <button
                          type="button"
                          onClick={() => openPaymentEditor(r.id, billShare.paid)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold"
                          style={{ background: "white", color: "var(--foreground)", fontSize: "11px", border: "1px solid var(--border)" }}
                        >
                          <Pencil size={12} />
                          {billShare.paid > 0 ? "Edit payment" : "Add payment"}
                        </button>
                      )}
                    </div>

                    {isEditingPayment ? (
                      <div className="mt-3 space-y-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={paymentDraft}
                          onChange={(e) => setPaymentDraft(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2.5 rounded-xl outline-none"
                          style={{ background: "white", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "12px" }}
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => void savePayment(r.id)}
                            className="py-2 rounded-xl text-white font-semibold"
                            style={{ background: "#4F46E5", fontSize: "11px" }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentDraft(String(Number(billShare.share.toFixed(2))));
                              void savePayment(r.id);
                            }}
                            className="inline-flex items-center justify-center gap-1 py-2 rounded-xl text-white font-semibold"
                            style={{ background: "#059669", fontSize: "11px" }}
                          >
                            <Check size={12} />
                            Full
                          </button>
                          <button
                            type="button"
                            onClick={closePaymentEditor}
                            className="py-2 rounded-xl font-semibold"
                            style={{ background: "white", color: "var(--muted-foreground)", fontSize: "11px", border: "1px solid var(--border)" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        {billShare.status !== "Paid" && (
                          <button
                            type="button"
                            onClick={() => void updatePayment(r.id, billShare.share)}
                            className="flex-1 py-2 rounded-xl text-white font-semibold"
                            style={{ background: "#059669", fontSize: "11px" }}
                          >
                            Mark paid
                          </button>
                        )}
                        {billShare.paid > 0 && (
                          <button
                            type="button"
                            onClick={() => void updatePayment(r.id, 0)}
                            className="flex-1 py-2 rounded-xl font-semibold"
                            style={{ background: "white", color: "var(--muted-foreground)", fontSize: "11px", border: "1px solid var(--border)" }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleView(r)}
                    className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-xl transition-all font-medium active:scale-95"
                    style={{
                      background: "var(--muted)",
                      color: "var(--foreground)",
                      fontSize: "12px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Eye size={12} />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(r)}
                    className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-xl transition-all font-medium active:scale-95"
                    style={{ background: "#EEF2FF", color: "#4F46E5", fontSize: "12px" }}
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95"
                    style={{ background: "#FEF2F2", color: "#EF4444" }}
                    aria-label={`Delete ${r.name}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: "var(--muted)" }}
            >
              <Search size={28} style={{ color: "var(--muted-foreground)" }} />
            </div>
            <div style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "18px" }}>
              No roommates found
            </div>
            <div style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: 4 }}>
              Try adjusting your search or filter criteria
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("All");
              }}
              className="mt-5 px-5 py-2.5 rounded-xl text-white font-semibold"
              style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                fontSize: "13px",
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <AddModal onClose={() => setShowModal(false)} onAdd={handleAdd} />
      )}
      {editTarget && (
        <EditModal
          roommate={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(data) => {
            updateRoommate(editTarget.id, data);
            setEditTarget(null);
          }}
        />
      )}
      {viewTarget && (
        <ViewModal roommate={viewTarget} onClose={() => setViewTarget(null)} />
      )}
    </div>
  );
}
