import { useEffect, useMemo, useState } from "react";
import {
  Search,
  X,
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  BarChart3,
  Settings,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Page } from "@/types";

const pages: { id: Page; label: string; icon: typeof LayoutDashboard; keywords: string[] }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, keywords: ["home", "overview"] },
  { id: "roommates", label: "Roommates", icon: Users, keywords: ["people", "tenants"] },
  { id: "bills", label: "Create Bill", icon: FileText, keywords: ["new bill", "expenses"] },
  { id: "expenses", label: "All Bills", icon: Receipt, keywords: ["bill", "payments"] },
  { id: "analytics", label: "Analytics", icon: BarChart3, keywords: ["charts", "reports"] },
  { id: "settings", label: "Settings", icon: Settings, keywords: ["preferences", "config"] },
];

export function SearchModal() {
  const { searchOpen, setSearchOpen, navigate, roommates, bills, openBillView } = useApp();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!searchOpen) setQuery("");
  }, [searchOpen]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return {
        pages: pages.slice(0, 6),
        roommates: roommates.slice(0, 5),
        bills: bills.slice(0, 5),
      };
    }

    return {
      pages: pages.filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.keywords.some((k) => k.includes(q))
      ),
      roommates: roommates.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.room.includes(q)
      ),
      bills: bills.filter(
        (b) =>
          b.month.toLowerCase().includes(q) ||
          b.houseName.toLowerCase().includes(q)
      ),
    };
  }, [query, roommates, bills]);

  if (!searchOpen) return null;

  const goToPage = (id: Page) => {
    setSearchOpen(false);
    navigate(id);
  };

  const openBill = (billId: string) => {
    setSearchOpen(false);
    openBillView(billId);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-[12vh]"
      style={{ background: "rgba(15,13,42,0.55)", backdropFilter: "blur(4px)" }}
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 32px 80px rgba(79,70,229,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Search size={16} style={{ color: "var(--muted-foreground)" }} />
          <input
            autoFocus
            type="text"
            placeholder="Search pages, roommates, bills…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none"
            style={{ color: "var(--foreground)", fontSize: "14px" }}
          />
          <button type="button" onClick={() => setSearchOpen(false)}>
            <X size={16} style={{ color: "var(--muted-foreground)" }} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {results.pages.length > 0 && (
            <Section title="Pages">
              {results.pages.map((p) => (
                <ResultRow
                  key={p.id}
                  icon={p.icon}
                  label={p.label}
                  onClick={() => goToPage(p.id)}
                />
              ))}
            </Section>
          )}

          {results.roommates.length > 0 && (
            <Section title="Roommates">
              {results.roommates.map((r) => (
                <ResultRow
                  key={r.id}
                  icon={Users}
                  label={r.name}
                  sub={`Room ${r.room}`}
                  onClick={() => goToPage("roommates")}
                />
              ))}
            </Section>
          )}

          {results.bills.length > 0 && (
            <Section title="Bills">
              {results.bills.map((b) => (
                <ResultRow
                  key={b.id}
                  icon={Receipt}
                  label={`${b.month} — ${b.houseName}`}
                  sub={`$${(b.rent + b.expenses.reduce((s, e) => s + e.amount, 0)).toLocaleString()}`}
                  onClick={() => openBill(b.id)}
                />
              ))}
            </Section>
          )}

          {results.pages.length === 0 &&
            results.roommates.length === 0 &&
            results.bills.length === 0 && (
              <p
                className="text-center py-8"
                style={{ color: "var(--muted-foreground)", fontSize: "13px" }}
              >
                No results for &ldquo;{query}&rdquo;
              </p>
            )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div
        className="px-3 py-1.5"
        style={{
          color: "var(--muted-foreground)",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.6px",
        }}
      >
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function ResultRow({
  icon: Icon,
  label,
  sub,
  onClick,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
      style={{ fontSize: "13px" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--muted)" }}
      >
        <Icon size={14} style={{ color: "var(--primary)" }} />
      </div>
      <div className="min-w-0">
        <div style={{ color: "var(--foreground)", fontWeight: 500 }}>{label}</div>
        {sub && (
          <div style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>{sub}</div>
        )}
      </div>
    </button>
  );
}
