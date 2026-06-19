import { useMemo, useState } from "react";
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  FileText,
  RefreshCw,
  Link2,
  Zap,
  ChevronRight,
  Home,
  Wifi,
  Zap as Electric,
  Droplets,
  Sparkles,
  Package,
  type LucideIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useApp } from "@/context/AppContext";
import { calcCollectionSummary, formatCurrency, getCategoryColor } from "@/lib/utils";
import type { Bill, PayStatus } from "@/types";

const SAMPLE_TREND = [
  { month: "Jan", total: 3280, extra: 280 },
  { month: "Feb", total: 3350, extra: 350 },
  { month: "Mar", total: 3190, extra: 190 },
  { month: "Apr", total: 3420, extra: 420 },
  { month: "May", total: 3510, extra: 510 },
  { month: "Jun", total: 3450, extra: 450 },
];

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  UserPlus,
  FileText,
  RefreshCw,
  Link2,
  DollarSign,
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Rent: Home,
  Internet: Wifi,
  Electricity: Electric,
  Water: Droplets,
  Cleaning: Sparkles,
  Supplies: Package,
  Groceries: Package,
  Other: Package,
};

const payStyle: Record<PayStatus, { bg: string; text: string }> = {
  Paid: { bg: "#ECFDF5", text: "#059669" },
  Partial: { bg: "#FFFBEB", text: "#D97706" },
  Pending: { bg: "#FEF2F2", text: "#EF4444" },
};

function shortMonth(monthStr: string) {
  const name = monthStr.split(" ")[0] ?? monthStr;
  const map: Record<string, string> = {
    January: "Jan",
    February: "Feb",
    March: "Mar",
    April: "Apr",
    May: "May",
    June: "Jun",
    July: "Jul",
    August: "Aug",
    September: "Sep",
    October: "Oct",
    November: "Nov",
    December: "Dec",
  };
  return map[name] ?? name.slice(0, 3);
}

function billToTrend(bill: Bill) {
  const total = calcCollectionSummary(bill).totalToCollect;
  const extra = bill.expenses.reduce((sum, e) => sum + e.amount, 0);
  return { month: shortMonth(bill.month), total, extra, fullMonth: bill.month };
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface AreaTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomAreaTooltip = ({ active, payload, label }: AreaTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 24px rgba(79,70,229,0.14)",
        minWidth: 130,
      }}
    >
      <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginBottom: 5, fontWeight: 600 }}>
        {label} 2026
      </div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
            {p.name === "total" ? "Total" : "Extra"}:
          </span>
          <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}>
            ${p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

const RADIAN = Math.PI / 180;

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelProps) => {
  if (percent < 0.07) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 10, fontWeight: 700, fontFamily: "Inter" }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function DashboardPage() {
  const { roommates, activeBill, activities, bills, navigate, settings } = useApp();

  const monthlyTrend = useMemo(() => {
    if (bills.length > 1) {
      return [...bills]
        .reverse()
        .slice(-6)
        .map(billToTrend);
    }
    if (bills.length === 1) {
      const current = billToTrend(bills[0]);
      const others = SAMPLE_TREND.filter((d) => d.month !== current.month).slice(0, 5);
      return [...others, current].sort((a, b) => {
        const order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return order.indexOf(a.month) - order.indexOf(b.month);
      });
    }
    return SAMPLE_TREND;
  }, [bills]);

  const [activeMonth, setActiveMonth] = useState(
    () => (activeBill ? shortMonth(activeBill.month) : monthlyTrend[monthlyTrend.length - 1]?.month ?? "Jun")
  );

  const billTotal = activeBill ? calcCollectionSummary(activeBill).totalToCollect : 0;
  const extraTotal = activeBill ? activeBill.expenses.reduce((s, e) => s + e.amount, 0) : 0;
  const parkingTotal = activeBill
    ? calcCollectionSummary(activeBill).parkingFees
    : 0;

  const paidCount = activeBill?.roommateShares.filter((rs) => rs.status === "Paid").length ?? 0;
  const shareCount = activeBill?.roommateShares.length ?? 0;
  const progressPct = shareCount > 0 ? Math.round((paidCount / shareCount) * 100) : 0;

  const outstanding = activeBill
    ? activeBill.roommateShares
        .filter((rs) => rs.status !== "Paid")
        .reduce((sum, rs) => sum + Math.max(0, rs.share - rs.paid), 0)
    : 0;
  const outstandingCount = activeBill?.roommateShares.filter((rs) => rs.status !== "Paid").length ?? 0;

  const activeRoommates = roommates.filter((r) => r.status === "Active").length;
  const pendingRoommates = roommates.filter((r) => r.status === "Pending").length;

  const statCards = useMemo(
    () => [
      {
        label: "Total Roommates",
        value: String(roommates.length),
        sub: `${activeRoommates} active, ${pendingRoommates} pending`,
        change: roommates.length > 0 ? `${activeRoommates} active` : "None yet",
        up: true,
        icon: Users,
        lightBg: "#EEF2FF",
        iconColor: "#4F46E5",
      },
      {
        label: "Total Collection",
        value: formatCurrency(billTotal),
        sub: activeBill
          ? `${activeBill.month}${parkingTotal > 0 ? ` · $${parkingTotal} parking` : ""}`
          : "No bill",
        change: activeBill ? "Current month" : "—",
        up: true,
        icon: Home,
        lightBg: "#ECFEFF",
        iconColor: "#06B6D4",
      },
      {
        label: "Monthly Rent",
        value: activeBill ? formatCurrency(activeBill.rent) : "$0",
        sub: activeBill ? activeBill.houseName : "No bill",
        change: "Base rent",
        up: true,
        icon: TrendingUp,
        lightBg: "#EEF2FF",
        iconColor: "#4F46E5",
      },
      {
        label: "Extra Expenses",
        value: formatCurrency(extraTotal),
        sub: activeBill ? `${activeBill.expenses.length} categories` : "—",
        change: activeBill ? `${activeBill.expenses.length} items` : "—",
        up: true,
        icon: TrendingUp,
        lightBg: "#ECFDF5",
        iconColor: "#10B981",
      },
      {
        label: "Pending",
        value: formatCurrency(Math.round(outstanding)),
        sub: `${outstandingCount} outstanding`,
        change: outstandingCount > 0 ? "Action needed" : "All clear",
        up: outstandingCount === 0,
        icon: AlertCircle,
        lightBg: "#FDF2F8",
        iconColor: "#EC4899",
      },
    ],
    [roommates.length, activeRoommates, pendingRoommates, activeBill, extraTotal, outstanding, outstandingCount, billTotal, parkingTotal]
  );

  const breakdownData = useMemo(() => {
    if (!activeBill) return [];
    return [
      { name: "Rent", value: activeBill.rent, color: "#4F46E5", icon: Home },
      ...activeBill.expenses.map((e) => ({
        name: e.name,
        value: e.amount,
        color: getCategoryColor(e.category),
        icon: CATEGORY_ICONS[e.category] ?? Package,
      })),
    ];
  }, [activeBill]);

  const paymentRows = useMemo(() => {
    if (!activeBill) return [];
    return activeBill.roommateShares.map((share) => {
      const roommate = roommates.find((r) => r.id === share.roommateId);
      const amount =
        share.status === "Paid"
          ? formatCurrency(share.share)
          : share.status === "Partial"
            ? `${formatCurrency(share.paid)}/${formatCurrency(share.share)}`
            : `${formatCurrency(share.paid)}/${formatCurrency(share.share)}`;
      return {
        id: share.roommateId,
        name: roommate?.name ?? "Unknown",
        initials: roommate?.initials ?? "?",
        color: roommate?.color ?? "#64748B",
        avatarGrad: roommate?.avatarGrad,
        status: share.status,
        amount,
      };
    });
  }, [activeBill, roommates]);

  const pieTotal = breakdownData.reduce((s, d) => s + d.value, 0);
  const monthButtons = monthlyTrend.map((d) => d.month);

  return (
    <div className="space-y-5 sm:space-y-7 max-w-[1400px] mx-auto">
      {/* Hero */}
      <div
        className="relative rounded-2xl sm:rounded-3xl p-5 sm:p-8 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #312E81 0%, #4F46E5 35%, #7C3AED 70%, #0891B2 100%)",
          boxShadow: "0 16px 60px rgba(79,70,229,0.3)",
        }}
      >
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full"
          style={{ background: "rgba(6,182,212,0.25)", filter: "blur(60px)" }}
        />
        <div
          className="absolute -bottom-12 left-1/4 w-40 h-40 rounded-full"
          style={{ background: "rgba(236,72,153,0.2)", filter: "blur(50px)" }}
        />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <Zap size={10} className="text-yellow-300" />
              {activeBill ? `${activeBill.month} — Active` : "No active bill"}
            </span>
          </div>
          <h1
            className="text-white mb-1.5"
            style={{
              fontSize: "clamp(20px, 5vw, 30px)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.3px",
            }}
          >
            Welcome, {settings.adminName?.split(" ")[0] || "there"} 👋
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", lineHeight: 1.5 }}>
            {shareCount > 0
              ? `${paidCount} of ${shareCount} roommates have paid this month.`
              : "Create a bill to start tracking payments."}
          </p>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 sm:mt-6">
            {[
              {
                label: "Total Rent",
                value: activeBill ? formatCurrency(activeBill.rent) : "$0",
                sub: "Fixed",
              },
              {
                label: "Expenses",
                value: formatCurrency(billTotal),
                sub: activeBill?.month ?? "—",
              },
              {
                label: "Outstanding",
                value: formatCurrency(Math.round(outstanding)),
                sub: `${outstandingCount} pending`,
              },
            ].map((m) => (
              <div
                key={m.label}
                className="px-3 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <div
                  className="text-white font-black"
                  style={{
                    fontSize: "clamp(15px, 3.5vw, 22px)",
                    letterSpacing: "-0.3px",
                    lineHeight: 1,
                  }}
                >
                  {m.value}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "clamp(10px, 2vw, 12px)",
                    fontWeight: 500,
                    marginTop: 3,
                  }}
                >
                  {m.label}
                </div>
                <div
                  style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px", marginTop: 1 }}
                  className="hidden sm:block"
                >
                  {m.sub}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 sm:mt-6">
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>Collection progress</span>
              <span style={{ color: "white", fontSize: "12px", fontWeight: 600 }}>
                {paidCount}/{shareCount} paid · {progressPct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, #34D399, #10B981)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl sm:rounded-2xl p-4 sm:p-5 transition-all duration-300 cursor-pointer"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 16px rgba(79,70,229,0.06)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 10px 36px rgba(79,70,229,0.13)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 2px 16px rgba(79,70,229,0.06)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center"
                style={{ background: card.lightBg }}
              >
                <card.icon size={17} style={{ color: card.iconColor }} />
              </div>
              <div
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: card.up ? "#ECFDF5" : "#FEF2F2",
                  color: card.up ? "#059669" : "#EF4444",
                  fontSize: "10px",
                }}
              >
                {card.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                <span className="hidden sm:inline">{card.change}</span>
                <span className="sm:hidden">{card.up ? "↑" : "↓"}</span>
              </div>
            </div>
            <div
              style={{
                color: "var(--foreground)",
                fontSize: "clamp(18px, 4vw, 26px)",
                fontWeight: 800,
                letterSpacing: "-0.5px",
                lineHeight: 1,
              }}
            >
              {card.value}
            </div>
            <div style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600, marginTop: 4 }}>
              {card.label}
            </div>
            <div
              style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 2 }}
              className="hidden sm:block"
            >
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        <div
          className="lg:col-span-3 rounded-xl sm:rounded-2xl p-4 sm:p-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 16px rgba(79,70,229,0.06)",
          }}
        >
          <div className="flex items-start justify-between mb-4 sm:mb-6 gap-2">
            <div>
              <h3 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>Expense Overview</h3>
              <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>
                {monthlyTrend.length}-month trend
                {monthButtons.length > 0 ? ` · ${monthButtons[0]}–${monthButtons[monthButtons.length - 1]}` : ""}
              </p>
            </div>
            <div className="flex gap-1 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: "none" }}>
              {monthButtons.map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveMonth(m)}
                  className="px-2 py-1 rounded-lg font-medium transition-all flex-shrink-0"
                  style={{
                    background: activeMonth === m ? "#4F46E5" : "var(--muted)",
                    color: activeMonth === m ? "white" : "var(--muted-foreground)",
                    fontSize: "11px",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="extraFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,70,229,0.07)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "#94A3B8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94A3B8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                width={42}
              />
              <Tooltip content={<CustomAreaTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#4F46E5"
                strokeWidth={2.5}
                fill="url(#totalFill)"
                dot={false}
                activeDot={{ r: 5, fill: "#4F46E5" }}
              />
              <Area
                type="monotone"
                dataKey="extra"
                stroke="#06B6D4"
                strokeWidth={2}
                fill="url(#extraFill)"
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4, fill: "#06B6D4" }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 sm:gap-5 mt-3">
            {[
              { color: "#4F46E5", label: "Total monthly cost" },
              { color: "#06B6D4", label: "Extra expenses" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <div className="w-3 h-0.5 rounded flex-shrink-0" style={{ background: l.color }} />
                <span style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="lg:col-span-2 rounded-xl sm:rounded-2xl p-4 sm:p-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 16px rgba(79,70,229,0.06)",
          }}
        >
          <h3 className="mb-1" style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>
            Expense Breakdown
          </h3>
          <p className="mb-4" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
            {activeBill ? `${activeBill.month} · $${pieTotal.toLocaleString()} total` : "No bill data"}
          </p>
          {breakdownData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={breakdownData}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={42}
                    dataKey="value"
                    labelLine={false}
                    label={renderPieLabel}
                    strokeWidth={0}
                  >
                    {breakdownData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`$${v.toLocaleString()}`, ""]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-3">
                {breakdownData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <span
                      style={{
                        color: "var(--muted-foreground)",
                        fontSize: "11px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.name}
                    </span>
                    <span
                      style={{
                        color: "var(--foreground)",
                        fontSize: "11px",
                        fontWeight: 600,
                        marginLeft: "auto",
                        flexShrink: 0,
                      }}
                    >
                      ${d.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ height: 170, background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "13px" }}
            >
              No expenses to display
            </div>
          )}
        </div>
      </div>

      {/* Payment status & activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        <div
          className="lg:col-span-2 rounded-xl sm:rounded-2xl p-4 sm:p-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 16px rgba(79,70,229,0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>Payment Status</h3>
            {activeBill && (
              <span
                className="px-2.5 py-1 rounded-full font-semibold"
                style={{ background: "#EEF2FF", color: "#4F46E5", fontSize: "11px" }}
              >
                {activeBill.month}
              </span>
            )}
          </div>
          {paymentRows.length > 0 ? (
            paymentRows.map((r, idx) => (
              <div
                key={r.id}
                className="flex items-center gap-3 py-2.5"
                style={{
                  borderBottom: idx < paymentRows.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: r.avatarGrad ?? r.color }}
                >
                  {r.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 600 }}>
                    {r.name.split(" ")[0]}
                  </div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>{r.amount}</div>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                  style={{
                    background: payStyle[r.status].bg,
                    color: payStyle[r.status].text,
                    fontSize: "11px",
                  }}
                >
                  {r.status}
                </span>
              </div>
            ))
          ) : (
            <p style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>No payment data yet.</p>
          )}
        </div>

        <div
          className="lg:col-span-3 rounded-xl sm:rounded-2xl p-4 sm:p-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 16px rgba(79,70,229,0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <h3 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>Recent Activity</h3>
            <button
              type="button"
              onClick={() => navigate("analytics")}
              className="flex items-center gap-1 font-semibold"
              style={{ color: "#4F46E5", fontSize: "12px" }}
            >
              View all <ChevronRight size={13} />
            </button>
          </div>
          <div className="relative">
            <div
              className="absolute left-[17px] top-4 bottom-4 w-px"
              style={{ background: "linear-gradient(to bottom, #4F46E5, transparent)" }}
            />
            <div className="space-y-3 sm:space-y-4">
              {activities.length > 0 ? (
                activities.map((act) => {
                  const Icon = ACTIVITY_ICONS[act.icon] ?? FileText;
                  return (
                    <div key={act.id} className="flex gap-3 sm:gap-4">
                      <div
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10"
                        style={{ background: act.bg, border: `1.5px solid ${act.color}30` }}
                      >
                        <Icon size={14} style={{ color: act.color }} />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div
                          style={{
                            color: "var(--foreground)",
                            fontSize: "13px",
                            fontWeight: 600,
                            lineHeight: 1.3,
                          }}
                        >
                          {act.label}
                        </div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 1 }}>
                          {act.desc}
                        </div>
                      </div>
                      <div
                        style={{
                          color: "var(--muted-foreground)",
                          fontSize: "11px",
                          flexShrink: 0,
                          paddingTop: 2,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {act.time}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>No recent activity.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
