import { useState } from "react";
import {
  Search, Plus, Filter, Eye, Edit2, Trash2, Phone, Mail,
  Home, MoreVertical, X, CheckCircle2, ChevronDown, UserCheck,
  SlidersHorizontal
} from "lucide-react";

interface Roommate {
  id: number;
  name: string;
  room: string;
  phone: string;
  email: string;
  status: "Active" | "Pending" | "Inactive";
  joinDate: string;
  share: string;
  initials: string;
  avatarGrad: string;
  payStatus: "Paid" | "Partial" | "Pending";
  occupation: string;
}

const roommates: Roommate[] = [
  {
    id: 1, name: "Alex Johnson", room: "101",
    phone: "+1 (555) 012-3456", email: "alex.johnson@gmail.com",
    status: "Active", joinDate: "Jan 2026", share: "$690",
    initials: "AJ", avatarGrad: "linear-gradient(135deg, #4F46E5, #7C3AED)",
    payStatus: "Partial", occupation: "Software Engineer",
  },
  {
    id: 2, name: "Sarah Williams", room: "102",
    phone: "+1 (555) 023-4567", email: "sarah.w@gmail.com",
    status: "Active", joinDate: "Feb 2026", share: "$690",
    initials: "SW", avatarGrad: "linear-gradient(135deg, #06B6D4, #0891B2)",
    payStatus: "Paid", occupation: "Graphic Designer",
  },
  {
    id: 3, name: "Marcus Chen", room: "103",
    phone: "+1 (555) 034-5678", email: "marcus.chen@gmail.com",
    status: "Active", joinDate: "Jan 2026", share: "$690",
    initials: "MC", avatarGrad: "linear-gradient(135deg, #10B981, #059669)",
    payStatus: "Paid", occupation: "Data Analyst",
  },
  {
    id: 4, name: "Emma Davis", room: "104",
    phone: "+1 (555) 045-6789", email: "emma.davis@gmail.com",
    status: "Pending", joinDate: "Jun 2026", share: "$690",
    initials: "ED", avatarGrad: "linear-gradient(135deg, #F59E0B, #D97706)",
    payStatus: "Pending", occupation: "Marketing Manager",
  },
  {
    id: 5, name: "James Wilson", room: "105",
    phone: "+1 (555) 056-7890", email: "james.w@gmail.com",
    status: "Inactive", joinDate: "Mar 2026", share: "$690",
    initials: "JW", avatarGrad: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
    payStatus: "Paid", occupation: "Product Manager",
  },
];

const statusStyle: Record<string, { bg: string; text: string; dot: string }> = {
  Active: { bg: "#ECFDF5", text: "#059669", dot: "#10B981" },
  Pending: { bg: "#FFFBEB", text: "#D97706", dot: "#F59E0B" },
  Inactive: { bg: "#F1F5F9", text: "#64748B", dot: "#94A3B8" },
};

const payStyle: Record<string, { bg: string; text: string }> = {
  Paid: { bg: "#ECFDF5", text: "#059669" },
  Partial: { bg: "#FFFBEB", text: "#D97706" },
  Pending: { bg: "#FEF2F2", text: "#EF4444" },
};

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const fields = [
    { label: "Full Name", placeholder: "e.g. Alex Johnson", type: "text" },
    { label: "Room Number", placeholder: "e.g. 106", type: "text" },
    { label: "Phone", placeholder: "+1 (555) 000-0000", type: "tel" },
    { label: "Email Address", placeholder: "name@email.com", type: "email" },
    { label: "Occupation", placeholder: "e.g. Engineer", type: "text" },
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,13,42,0.65)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 32px 80px rgba(79,70,229,0.25)" }}
      >
        <div
          className="px-7 py-5 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}
        >
          <div>
            <h2 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "18px" }}>Add New Roommate</h2>
            <p style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>Fill in the details below</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "var(--border)" }}
          >
            <X size={15} style={{ color: "var(--foreground)" }} />
          </button>
        </div>
        <div className="px-7 py-6 space-y-4">
          {fields.map(f => (
            <div key={f.label}>
              <label style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all"
                style={{
                  background: "var(--muted)",
                  border: "1.5px solid var(--border)",
                  color: "var(--foreground)",
                  fontSize: "13px",
                }}
                onFocus={e => (e.target.style.borderColor = "#4F46E5")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          ))}
          <div>
            <label style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>Status</label>
            <select
              className="w-full px-4 py-2.5 rounded-xl outline-none appearance-none"
              style={{ background: "var(--muted)", border: "1.5px solid var(--border)", color: "var(--foreground)", fontSize: "13px" }}
            >
              <option>Active</option>
              <option>Pending</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
        <div className="px-7 py-5 flex gap-3" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-semibold transition-all"
            style={{ background: "var(--muted)", color: "var(--foreground)", fontSize: "13px" }}
          >Cancel</button>
          <button
            onClick={() => { onAdd(); onClose(); }}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", boxShadow: "0 4px 14px rgba(79,70,229,0.3)", fontSize: "13px" }}
          >
            <CheckCircle2 size={15} />
            Add Roommate
          </button>
        </div>
      </div>
    </div>
  );
}

export function RoommatesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showModal, setShowModal] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const filtered = roommates.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.room.includes(q);
    const matchFilter = filter === "All" || r.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    All: roommates.length,
    Active: roommates.filter(r => r.status === "Active").length,
    Pending: roommates.filter(r => r.status === "Pending").length,
    Inactive: roommates.filter(r => r.status === "Inactive").length,
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1400px] mx-auto">
      {/* Toast */}
      {toastMsg && (
        <div
          className="fixed top-16 right-4 sm:top-5 sm:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
          style={{ background: "#0F0D2A", color: "white", fontSize: "13px", fontWeight: 500, boxShadow: "0 12px 40px rgba(0,0,0,0.3)", maxWidth: "calc(100vw - 32px)" }}
        >
          <CheckCircle2 size={16} style={{ color: "#10B981" }} />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 style={{ color: "var(--foreground)", fontWeight: 800, fontSize: "clamp(20px, 5vw, 26px)", letterSpacing: "-0.5px" }}>Roommates</h1>
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
            fontSize: "13px"
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
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 12px rgba(79,70,229,0.05)" }}
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
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none"
            style={{ color: "var(--foreground)", fontSize: "13px" }}
          />
          {search && (
            <button onClick={() => setSearch("")}><X size={13} style={{ color: "var(--muted-foreground)" }} /></button>
          )}
        </div>
        {/* Filters — scrollable row on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          <SlidersHorizontal size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          {(["All", "Active", "Pending", "Inactive"] as const).map(f => (
            <button
              key={f}
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
                style={{ background: filter === f ? "rgba(255,255,255,0.25)" : "var(--border)", color: filter === f ? "white" : "var(--muted-foreground)", fontSize: "9px" }}
              >{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {filtered.map(r => {
          const ss = statusStyle[r.status];
          const ps = payStyle[r.payStatus];
          return (
            <div
              key={r.id}
              className="rounded-2xl overflow-hidden transition-all duration-300 group"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 2px 20px rgba(79,70,229,0.06)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = "0 16px 50px rgba(79,70,229,0.16)";
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.borderColor = "rgba(79,70,229,0.25)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "0 2px 20px rgba(79,70,229,0.06)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {/* Gradient header strip */}
              <div className="h-1.5 w-full" style={{ background: r.avatarGrad }} />

              <div className="p-4 sm:p-5">
                {/* Top row */}
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0"
                      style={{ background: r.avatarGrad, boxShadow: "0 4px 12px rgba(79,70,229,0.25)" }}
                    >{r.initials}</div>
                    <div className="min-w-0">
                      <div style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "14px" }}>{r.name}</div>
                      <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 1 }}>{r.occupation}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <Home size={10} style={{ color: "var(--muted-foreground)" }} />
                        <span style={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: 500 }}>Room {r.room}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span
                      className="flex items-center gap-1 px-2 py-1 rounded-full font-semibold"
                      style={{ background: ss.bg, color: ss.text, fontSize: "10px" }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: ss.dot }} />
                      {r.status}
                    </span>
                    <button className="p-0.5">
                      <MoreVertical size={13} style={{ color: "var(--muted-foreground)" }} />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-1.5 p-2.5 sm:p-3 rounded-xl mb-3 sm:mb-4" style={{ background: "var(--muted)" }}>
                  <div className="flex items-center gap-2">
                    <Phone size={11} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <span style={{ color: "var(--foreground)", fontSize: "12px" }}>{r.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={11} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <span style={{ color: "var(--foreground)", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</span>
                  </div>
                </div>

                {/* Financial row */}
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <div style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.3px" }}>MONTHLY</div>
                    <div style={{ color: "var(--foreground)", fontWeight: 800, fontSize: "18px", letterSpacing: "-0.3px" }}>{r.share}</div>
                  </div>
                  <div className="text-center">
                    <div style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.3px" }}>PAYMENT</div>
                    <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: ps.bg, color: ps.text, fontSize: "11px" }}>
                      {r.payStatus}
                    </span>
                  </div>
                  <div className="text-right">
                    <div style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.3px" }}>SINCE</div>
                    <div style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}>{r.joinDate}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => showToast(`Viewing ${r.name}'s profile`)}
                    className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-xl transition-all font-medium active:scale-95"
                    style={{ background: "var(--muted)", color: "var(--foreground)", fontSize: "12px", border: "1px solid var(--border)" }}
                  >
                    <Eye size={12} />View
                  </button>
                  <button
                    onClick={() => showToast(`Editing ${r.name}`)}
                    className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-xl transition-all font-medium active:scale-95"
                    style={{ background: "#EEF2FF", color: "#4F46E5", fontSize: "12px" }}
                  >
                    <Edit2 size={12} />Edit
                  </button>
                  <button
                    onClick={() => showToast(`${r.name} removed`)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95"
                    style={{ background: "#FEF2F2", color: "#EF4444" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: "var(--muted)" }}
            >
              <Search size={28} style={{ color: "var(--muted-foreground)" }} />
            </div>
            <div style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "18px" }}>No roommates found</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: 4 }}>Try adjusting your search or filter criteria</div>
            <button
              onClick={() => { setSearch(""); setFilter("All"); }}
              className="mt-5 px-5 py-2.5 rounded-xl text-white font-semibold"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", fontSize: "13px" }}
            >Clear filters</button>
          </div>
        )}
      </div>

      {showModal && <AddModal onClose={() => setShowModal(false)} onAdd={() => showToast("Roommate added successfully!")} />}
    </div>
  );
}
