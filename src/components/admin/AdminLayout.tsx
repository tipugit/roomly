import { useState, type ReactNode } from "react";
import {
  Shield, LayoutDashboard, Users, Home, ToggleLeft, Megaphone, Palette,
  Mail, Activity, FileSearch, LogIn, LifeBuoy, Database, HeartPulse,
  CreditCard, Settings, HardDrive, Bell, ArrowLeft, Menu, X, LogOut,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import type { AdminSection } from "@/types/admin";
import { setAdminRoute } from "@/lib/share";

const navGroups: { label: string; items: { id: AdminSection; label: string; icon: typeof Shield }[] }[] = [
  {
    label: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Management",
    items: [
      { id: "users", label: "Users", icon: Users },
      { id: "houses", label: "Houses", icon: Home },
      { id: "plans", label: "Plans", icon: CreditCard },
    ],
  },
  {
    label: "Platform",
    items: [
      { id: "features", label: "Feature Toggles", icon: ToggleLeft },
      { id: "announcements", label: "Announcements", icon: Megaphone },
      { id: "branding", label: "Branding", icon: Palette },
      { id: "email-templates", label: "Email Templates", icon: Mail },
      { id: "global-settings", label: "Global Settings", icon: Settings },
    ],
  },
  {
    label: "Security & Logs",
    items: [
      { id: "activity-logs", label: "Activity Logs", icon: Activity },
      { id: "audit-logs", label: "Audit Logs", icon: FileSearch },
      { id: "login-history", label: "Login History", icon: LogIn },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "support", label: "Support Tickets", icon: LifeBuoy },
      { id: "backups", label: "Backups", icon: Database },
      { id: "health", label: "System Health", icon: HeartPulse },
      { id: "storage", label: "Storage", icon: HardDrive },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
];

export function AdminLayout({
  section,
  onSection,
  children,
}: {
  section: AdminSection;
  onSection: (s: AdminSection) => void;
  children: ReactNode;
}) {
  const { navigate, logout } = useApp();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const go = (id: AdminSection) => {
    onSection(id);
    setAdminRoute(id);
    setOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden" style={{ background: "rgba(15,13,42,0.55)" }} onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed lg:static z-40 h-full flex flex-col transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ width: 260, minWidth: 260, background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
            <Shield size={17} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--foreground)" }}>Super Admin</div>
            <div style={{ fontSize: "10px", color: "var(--muted-foreground)", letterSpacing: "0.5px" }}>PLATFORM CONTROL</div>
          </div>
          <button type="button" className="lg:hidden" onClick={() => setOpen(false)}><X size={16} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navGroups.map((g) => (
            <div key={g.label}>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.7px", color: "var(--muted-foreground)", padding: "4px 12px 6px" }}>{g.label}</div>
              {g.items.map(({ id, label, icon: Icon }) => {
                const active = section === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => go(id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left mb-0.5 transition-all"
                    style={{
                      background: active ? "rgba(245,158,11,0.12)" : "transparent",
                      border: active ? "1px solid rgba(245,158,11,0.25)" : "1px solid transparent",
                    }}
                  >
                    <Icon size={15} style={{ color: active ? "#D97706" : "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "13px", fontWeight: active ? 600 : 400, color: active ? "#D97706" : "var(--foreground)" }}>{label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 space-y-2" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <button type="button" onClick={() => navigate("dashboard")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl admin-btn-secondary">
            <ArrowLeft size={14} /> Back to App
          </button>
          <div className="flex items-center gap-2 px-3 py-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span className="truncate flex-1">{user?.email}</span>
            <button type="button" onClick={() => logout()} aria-label="Logout"><LogOut size={14} /></button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
          <button type="button" onClick={() => setOpen(true)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ border: "1px solid var(--border)" }}>
            <Menu size={16} />
          </button>
          <span style={{ fontWeight: 700, fontSize: "15px" }}>Super Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
