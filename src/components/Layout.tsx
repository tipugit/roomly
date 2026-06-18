import { useState } from "react";
import {
  LayoutDashboard, Users, FileText, Receipt, BarChart3,
  Settings, Bell, Search, Sun, Moon, ChevronDown, LogOut,
  Home, X, Plus, Star, Zap, Menu
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { SearchModal } from "@/components/SearchModal";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", badgeKey: null as string | null },
  { icon: Users, label: "Roommates", id: "roommates", badgeKey: "roommates" },
  { icon: FileText, label: "Create Bill", id: "bills", badgeKey: null },
  { icon: Receipt, label: "Bill Details", id: "expenses", badgeKey: "pending" },
  { icon: BarChart3, label: "Analytics", id: "analytics", badgeKey: null },
  { icon: Settings, label: "Settings", id: "settings", badgeKey: null },
];

const mobileNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Users, label: "Roommates", id: "roommates" },
  { icon: FileText, label: "Bills", id: "bills" },
  { icon: Receipt, label: "Expenses", id: "expenses" },
  { icon: BarChart3, label: "Analytics", id: "analytics" },
];

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
}

export function Layout({ children, activePage }: LayoutProps) {
  const {
    navigate, darkMode, toggleDark, roommates, pendingBillsCount,
    activeBill, settings, activities, setSearchOpen, showToast, logout,
  } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const getBadge = (key: string | null) => {
    if (!key) return null;
    if (key === "roommates") return String(roommates.length);
    if (key === "pending" && pendingBillsCount > 0) return String(pendingBillsCount);
    return null;
  };

  const notifications = activities.slice(0, 4).map((a, i) => ({
    title: a.label,
    sub: a.desc,
    time: a.time,
    color: a.color,
    dot: i < 2,
  }));

  const newNotifCount = notifications.filter((n) => n.dot).length;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: "var(--background)" }}
    >
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "rgba(15,13,42,0.55)", backdropFilter: "blur(4px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static z-40 h-full flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          width: 252,
          minWidth: 252,
          background: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
          boxShadow: "6px 0 32px rgba(79,70,229,0.07)",
        }}
      >
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)", boxShadow: "0 4px 12px rgba(79,70,229,0.4)" }}
          >
            <Home size={17} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "16px", letterSpacing: "-0.3px" }}>Roomly</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: "10px", letterSpacing: "0.5px" }}>MANAGEMENT SYSTEM</div>
          </div>
          <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
            <X size={16} style={{ color: "var(--muted-foreground)" }} />
          </button>
        </div>

        <div className="px-4 py-4">
          <button
            onClick={() => { navigate("bills"); setSidebarOpen(false); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              fontSize: "13px",
              fontWeight: 600,
              boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
            }}
          >
            <Plus size={15} />
            Create New Bill
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.8px", padding: "4px 12px 8px" }}>NAVIGATION</div>
          {navItems.map(({ icon: Icon, label, id, badgeKey }) => {
            const isActive = activePage === id;
            const badge = getBadge(badgeKey);
            return (
              <button
                key={id}
                onClick={() => { navigate(id); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 active:scale-95"
                style={{
                  background: isActive ? "linear-gradient(135deg, rgba(79,70,229,0.12), rgba(124,58,237,0.08))" : "transparent",
                  border: isActive ? "1px solid rgba(79,70,229,0.2)" : "1px solid transparent",
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "var(--sidebar-accent)"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: isActive ? "linear-gradient(135deg, #4F46E5, #7C3AED)" : "var(--muted)",
                    boxShadow: isActive ? "0 2px 8px rgba(79,70,229,0.3)" : "none",
                  }}
                >
                  <Icon size={15} style={{ color: isActive ? "white" : "var(--muted-foreground)" }} />
                </div>
                <span className="flex-1" style={{ color: isActive ? "var(--primary)" : "var(--foreground)", fontSize: "13.5px", fontWeight: isActive ? 600 : 400 }}>
                  {label}
                </span>
                {badge && (
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                    style={{ background: isActive ? "#4F46E5" : "#94A3B8", fontSize: "10px", fontWeight: 700 }}
                  >{badge}</span>
                )}
              </button>
            );
          })}

          <div style={{ height: 16 }} />
          <div style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.8px", padding: "4px 12px 8px" }}>QUICK LINKS</div>
          {[
            { label: settings.houseName, icon: Star, color: "#F59E0B", action: () => navigate("settings") },
            {
              label: activeBill ? `${activeBill.month} Bill` : "No bill",
              icon: Zap,
              color: "#10B981",
              action: () => (activeBill ? navigate("expenses") : navigate("bills")),
            },
          ].map(item => (
            <button
              key={item.label}
              type="button"
              onClick={() => { item.action(); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all"
              style={{ color: "var(--muted-foreground)", fontSize: "13px" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--sidebar-accent)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <item.icon size={13} style={{ color: item.color, flexShrink: 0 }} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "var(--sidebar-accent)" }}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", boxShadow: "0 2px 8px rgba(79,70,229,0.3)" }}
            >A</div>
            <div className="flex-1 min-w-0">
              <div style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 600 }}>{settings.adminName}</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>{settings.adminEmail}</div>
            </div>
            <button type="button" onClick={() => logout()} aria-label="Sign out">
              <LogOut size={14} style={{ color: "var(--muted-foreground)" }} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="no-print flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 z-10 flex-shrink-0"
          style={{
            background: "rgba(248,250,252,0.9)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border)",
            boxShadow: "0 1px 20px rgba(79,70,229,0.05)",
          }}
        >
          <button
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={17} style={{ color: "var(--foreground)" }} />
          </button>

          <div className="flex items-center gap-2 lg:hidden flex-shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}>
              <Home size={13} className="text-white" />
            </div>
            <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>Roomly</span>
          </div>

          <div
            className="hidden sm:flex items-center gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl flex-1 max-w-sm transition-all cursor-pointer"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}
            onClick={() => setSearchOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && setSearchOpen(true)}
            role="button"
            tabIndex={0}
          >
            <Search size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <span className="flex-1" style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>
              Search…
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-xs flex-shrink-0 hidden md:block"
              style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "11px" }}
            >⌘K</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            <button
              onClick={toggleDark}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              {darkMode
                ? <Sun size={15} style={{ color: "#F59E0B" }} />
                : <Moon size={15} style={{ color: "var(--muted-foreground)" }} />}
            </button>

            <div className="relative">
              <button
                onClick={() => { setNotifOpen(n => !n); setProfileOpen(false); }}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <Bell size={15} style={{ color: "var(--foreground)" }} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2" style={{ background: "#EF4444", borderColor: "var(--card)" }} />
              </button>
              {notifOpen && (
                <div
                  className="absolute right-0 top-full mt-2 rounded-2xl overflow-hidden z-50"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 16px 48px rgba(79,70,229,0.15)",
                    width: "min(320px, calc(100vw - 32px))",
                  }}
                >
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "14px" }}>Notifications</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "#EEF2FF", color: "#4F46E5" }}>
                      {newNotifCount} new
                    </span>
                  </div>
                  {notifications.map((n, i) => (
                    <button
                      key={i}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-all"
                      style={{ borderBottom: i < notifications.length - 1 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.dot ? n.color : "var(--muted-foreground)" }} />
                      <div className="flex-1 min-w-0">
                        <div style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: n.dot ? 600 : 400 }}>{n.title}</div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>{n.sub}</div>
                      </div>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "11px", flexShrink: 0 }}>{n.time}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl transition-all active:scale-95"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
                >A</div>
                <span className="hidden sm:block" style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 500 }}>Admin</span>
                <ChevronDown size={13} style={{ color: "var(--muted-foreground)" }} className="hidden sm:block" />
              </button>
              {profileOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden z-50"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 16px 48px rgba(79,70,229,0.15)" }}
                >
                  {[
                    { label: "View Profile", action: () => navigate("settings") },
                    { label: "Preferences", action: () => navigate("settings") },
                    { label: "Help & Support", action: () => showToast("Email support@roomly.app", "info") },
                    { label: "Sign out", action: () => logout(), color: "#EF4444" },
                  ].map(item => (
                    <button
                      key={item.label}
                      type="button"
                      className="w-full text-left px-4 py-2.5 transition-all"
                      style={{ color: item.color ?? "var(--foreground)", fontSize: "13px" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--muted)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      onClick={() => { item.action(); setProfileOpen(false); }}
                    >{item.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 pb-20 lg:pb-6"
          style={{ scrollbarWidth: "none" }}
          onClick={() => { setProfileOpen(false); setNotifOpen(false); }}
        >
          {children}
        </main>

        <nav
          className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-20 flex items-stretch"
          style={{
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid var(--border)",
            boxShadow: "0 -4px 24px rgba(79,70,229,0.1)",
            height: 60,
          }}
        >
          {mobileNavItems.map(({ icon: Icon, label, id }) => {
            const isActive = activePage === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90"
                style={{ minWidth: 0 }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: isActive ? "linear-gradient(135deg, #4F46E5, #7C3AED)" : "transparent",
                    boxShadow: isActive ? "0 2px 8px rgba(79,70,229,0.3)" : "none",
                  }}
                >
                  <Icon size={16} style={{ color: isActive ? "white" : "#94A3B8" }} />
                </div>
                <span style={{ fontSize: "9px", fontWeight: isActive ? 700 : 400, color: isActive ? "#4F46E5" : "#94A3B8", letterSpacing: "0.2px" }}>
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
      <SearchModal />
    </div>
  );
}
