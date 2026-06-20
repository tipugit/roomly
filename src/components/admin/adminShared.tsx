import type { ReactNode } from "react";
import { Loader2, Search, Download, RefreshCw } from "lucide-react";

export function AdminPageHeader({
  title,
  subtitle,
  onRefresh,
  actions,
}: {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.5px" }}>
          {title}
        </h1>
        {subtitle && <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: 2 }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {onRefresh && (
          <button type="button" onClick={onRefresh} className="admin-btn-secondary">
            <RefreshCw size={14} /> Refresh
          </button>
        )}
        {actions}
      </div>
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  color = "#4F46E5",
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
          {label}
        </span>
        <Icon size={16} style={{ color }} />
      </div>
      <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--foreground)" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function AdminCard({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      {title && (
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function AdminLoading() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 size={32} className="animate-spin" style={{ color: "#4F46E5" }} />
    </div>
  );
}

export function AdminSearchBar({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--foreground)" }}
      />
    </div>
  );
}

export function AdminTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function AdminBadge({ children, color = "#4F46E5", bg = "rgba(79,70,229,0.12)" }: { children: ReactNode; color?: string; bg?: string }) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: bg, color }}>
      {children}
    </span>
  );
}

export function AdminPrimaryBtn({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="admin-btn-primary" style={{ opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

export function AdminExportBtn({ href }: { href: string }) {
  return (
    <a href={href} className="admin-btn-secondary no-underline" download>
      <Download size={14} /> Export CSV
    </a>
  );
}

export function formatAdminBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

export const healthColor = (s: string) =>
  s === "healthy" ? "#10B981" : s === "warning" ? "#F59E0B" : "#EF4444";
