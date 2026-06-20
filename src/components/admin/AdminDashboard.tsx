import { useCallback, useEffect, useState, type ComponentType, type CSSProperties } from "react";
import {
  Users, UserCheck, Home, Building2, FileText, Receipt, HardDrive, Files,
  UserPlus, Megaphone, LifeBuoy, Crown,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { chartAxisColor, chartGridColor } from "@/lib/themeTokens";
import type { AdminCharts, AdminDashboardStats, AdminUserDetail } from "@/types/admin";
import {
  AdminPageHeader, AdminStatCard, AdminCard, AdminLoading, AdminBadge, healthColor, formatAdminBytes,
} from "./adminShared";

const CHART_COLORS = ["#4F46E5", "#7C3AED", "#06B6D4", "#D97706"];

function shortMonth(month: string) {
  const name = month.split(" ")[0] ?? month;
  const map: Record<string, string> = {
    January: "Jan", February: "Feb", March: "Mar", April: "Apr",
    May: "May", June: "Jun", July: "Jul", August: "Aug",
    September: "Sep", October: "Oct", November: "Nov", December: "Dec",
  };
  return map[name] ?? name.slice(0, 3);
}

function GrowthChart({
  title,
  data,
  dataKey,
  color,
  darkMode,
}: {
  title: string;
  data: { month: string; [k: string]: string | number }[];
  dataKey: string;
  color: string;
  darkMode: boolean;
}) {
  const axis = chartAxisColor(darkMode);
  const grid = chartGridColor(darkMode);
  const chartData = data.map((d) => ({ ...d, label: shortMonth(d.month) }));

  return (
    <AdminCard title={title}>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#fill-${dataKey})`} dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center rounded-xl py-12" style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "13px" }}>
          No data yet
        </div>
      )}
    </AdminCard>
  );
}

export function AdminDashboard() {
  const { showToast, darkMode } = useApp();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [charts, setCharts] = useState<AdminCharts | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUserDetail[]>([]);
  const [health, setHealth] = useState<Record<string, { status: string; label: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminDashboard();
      setStats(res.stats);
      setCharts(res.charts);
      setRecentUsers(res.recentUsers);
      setHealth(res.health);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Failed to load dashboard", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <AdminLoading />;

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.totalUsers, icon: Users, color: "#4F46E5" },
        { label: "Active Users", value: stats.activeUsers, icon: UserCheck, color: "#10B981", sub: `${stats.activeUsers} of ${stats.totalUsers}` },
        { label: "Houses", value: stats.totalHouses, icon: Home, color: "#7C3AED" },
        { label: "Members", value: stats.totalMembers, icon: Building2, color: "#06B6D4" },
        { label: "Bills", value: stats.totalBills, icon: FileText, color: "#4F46E5" },
        { label: "Expenses", value: stats.totalExpenses, icon: Receipt, color: "#EC4899" },
        { label: "Storage", value: formatAdminBytes(stats.storageBytes), icon: HardDrive, color: "#D97706" },
        { label: "Files", value: stats.fileCount, icon: Files, color: "#8B5CF6" },
        { label: "New This Month", value: stats.newRegistrationsThisMonth, icon: UserPlus, color: "#10B981" },
        { label: "Announcements", value: stats.totalAnnouncements, icon: Megaphone, color: "#F59E0B" },
        { label: "Open Tickets", value: stats.openSupportTickets, icon: LifeBuoy, color: "#EF4444" },
      ]
    : [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <AdminPageHeader title="Platform Dashboard" subtitle="Overview of users, homes, and system health" onRefresh={load} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((s) => (
          <AdminStatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon as ComponentType<{ size?: number; style?: CSSProperties }>}
            color={s.color}
            sub={s.sub}
          />
        ))}
      </div>

      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GrowthChart title="User Growth" data={charts.userGrowth} dataKey="users" color={CHART_COLORS[0]} darkMode={darkMode} />
          <GrowthChart title="Bill Growth" data={charts.billGrowth} dataKey="bills" color={CHART_COLORS[1]} darkMode={darkMode} />
          <GrowthChart title="House Growth" data={charts.houseGrowth} dataKey="houses" color={CHART_COLORS[2]} darkMode={darkMode} />
          <GrowthChart title="Active User Trend" data={charts.activeUserTrend} dataKey="active" color={CHART_COLORS[3]} darkMode={darkMode} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AdminCard title="System Health" action={<AdminBadge color="#D97706" bg="rgba(245,158,11,0.12)">Live</AdminBadge>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(health).map(([key, h]) => (
              <div
                key={key}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: healthColor(h.status) }} />
                <div className="min-w-0">
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)", textTransform: "capitalize" }}>
                    {key.replace(/_/g, " ")}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{h.label}</div>
                </div>
              </div>
            ))}
            {Object.keys(health).length === 0 && (
              <p style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>No health data available</p>
            )}
          </div>
        </AdminCard>

        <div className="lg:col-span-2">
          <AdminCard title="Recent Users">
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {recentUsers.length === 0 ? (
                <p className="text-center py-6" style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>No users yet</p>
              ) : (
                recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--foreground)" }}>{u.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{u.email}</div>
                    </div>
                    {u.role === "super_admin" && (
                      <AdminBadge color="#D97706" bg="rgba(245,158,11,0.15)">
                        <span className="inline-flex items-center gap-1"><Crown size={11} /> Admin</span>
                      </AdminBadge>
                    )}
                    {u.createdAt && (
                      <span className="hidden sm:block text-xs flex-shrink-0" style={{ color: "var(--muted-foreground)" }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
