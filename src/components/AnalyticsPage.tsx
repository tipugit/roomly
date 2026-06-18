import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { calcCollectionSummary, formatCurrency, getCategoryColor } from "@/lib/utils";
import type { Bill } from "@/types";

type Period = "3M" | "6M" | "1Y";

function parseMonthYear(monthStr: string): Date {
  return new Date(`${monthStr} 1`);
}

function getPeriodMonths(period: Period) {
  return period === "3M" ? 3 : period === "6M" ? 6 : 12;
}

function filterBillsByPeriod(bills: Bill[], period: Period): Bill[] {
  const months = getPeriodMonths(period);
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  return [...bills]
    .filter((b) => parseMonthYear(b.month) >= cutoff)
    .sort((a, b) => parseMonthYear(a.month).getTime() - parseMonthYear(b.month).getTime());
}

function getPreviousPeriodBills(bills: Bill[], period: Period): Bill[] {
  const months = getPeriodMonths(period);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const start = new Date(now.getFullYear(), now.getMonth() - months * 2 + 1, 1);

  return bills.filter((b) => {
    const d = parseMonthYear(b.month);
    return d >= start && d < end;
  });
}

function pctChange(current: number, previous: number): { text: string; up: boolean } {
  if (previous === 0 && current === 0) return { text: "No change", up: true };
  if (previous === 0) return { text: "+100% vs last period", up: true };
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return { text: `${up ? "+" : ""}${pct.toFixed(1)}% vs last period`, up };
}

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color?: string; fill?: string }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 12px 36px rgba(79,70,229,0.15)",
      }}
    >
      <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginBottom: 6, fontWeight: 600 }}>
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>{p.name}:</span>
          <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}>
            ${(p.value || 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const { bills, roommates, activeBill, settings } = useApp();
  const [period, setPeriod] = useState<Period>("6M");

  const filteredBills = useMemo(() => filterBillsByPeriod(bills, period), [bills, period]);
  const previousBills = useMemo(() => getPreviousPeriodBills(bills, period), [bills, period]);

  const monthlyData = useMemo(
    () =>
      filteredBills.map((bill) => {
        const expenses = bill.expenses.reduce((sum, e) => sum + e.amount, 0);
        const total = calcCollectionSummary(bill).totalToCollect;
        const count = bill.selectedRoommateIds.length;
        const perPerson = count > 0 ? Math.round((total / count) * 100) / 100 : 0;
        const month = parseMonthYear(bill.month).toLocaleDateString("en-US", { month: "short" });
        return { month, rent: bill.rent, expenses, total, perPerson, fullMonth: bill.month };
      }),
    [filteredBills]
  );

  const categoryData = useMemo(() => {
    const totals = new Map<string, number>();
    const monthCount = filteredBills.length || 1;

    filteredBills.forEach((bill) => {
      totals.set("Rent", (totals.get("Rent") ?? 0) + bill.rent);
      bill.expenses.forEach((e) => {
        totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
      });
    });

    const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0) || 1;

    return Array.from(totals.entries())
      .map(([name, total]) => ({
        name,
        total,
        avg: Math.round(total / monthCount),
        color: getCategoryColor(name),
        pct: Math.round((total / grandTotal) * 1000) / 10,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredBills]);

  const roommatePayments = useMemo(() => {
    const totals = new Map<number, { paid: number; pending: number }>();

    const sourceBills = filteredBills.length > 0 ? filteredBills : activeBill ? [activeBill] : [];

    sourceBills.forEach((bill) => {
      bill.roommateShares.forEach((rs) => {
        const existing = totals.get(rs.roommateId) ?? { paid: 0, pending: 0 };
        existing.paid += rs.paid;
        existing.pending += Math.max(0, rs.share - rs.paid);
        totals.set(rs.roommateId, existing);
      });
    });

    return Array.from(totals.entries())
      .map(([id, data]) => {
        const roommate = roommates.find((r) => r.id === id);
        return {
          name: roommate?.name.split(" ")[0] ?? `R${id}`,
          paid: Math.round(data.paid),
          pending: Math.round(data.pending),
          total: Math.round(data.paid + data.pending),
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredBills, activeBill, roommates]);

  const analytics = useMemo(() => {
    const periodTotal = filteredBills.reduce(
      (sum, b) => sum + calcCollectionSummary(b).totalToCollect,
      0
    );
    const prevTotal = previousBills.reduce(
      (sum, b) => sum + calcCollectionSummary(b).totalToCollect,
      0
    );
    const extraTotal = filteredBills.reduce(
      (sum, b) => sum + b.expenses.reduce((s, e) => s + e.amount, 0),
      0
    );
    const prevExtra = previousBills.reduce(
      (sum, b) => sum + b.expenses.reduce((s, e) => s + e.amount, 0),
      0
    );
    const avgMonthly = filteredBills.length > 0 ? periodTotal / filteredBills.length : 0;
    const prevAvg =
      previousBills.length > 0
        ? previousBills.reduce((sum, b) => sum + calcCollectionSummary(b).totalToCollect, 0) /
          previousBills.length
        : 0;
    const activeCount = roommates.filter((r) => r.status === "Active").length;

    return {
      periodTotal,
      avgMonthly,
      extraTotal,
      activeCount,
      totalChange: pctChange(periodTotal, prevTotal),
      avgChange: pctChange(avgMonthly, prevAvg),
      extraChange: pctChange(extraTotal, prevExtra),
    };
  }, [filteredBills, previousBills, roommates]);

  const kpis = [
    {
      label: `${period} Total`,
      value: formatCurrency(analytics.periodTotal),
      change: analytics.totalChange.text,
      up: analytics.totalChange.up,
      icon: DollarSign,
      bg: "#EEF2FF",
      color: "#4F46E5",
    },
    {
      label: "Avg Monthly Cost",
      value: formatCurrency(Math.round(analytics.avgMonthly)),
      change: analytics.avgChange.text,
      up: analytics.avgChange.up,
      icon: TrendingUp,
      bg: "#ECFDF5",
      color: "#10B981",
    },
    {
      label: "Extra Expenses",
      value: formatCurrency(analytics.extraTotal),
      change: analytics.extraChange.text,
      up: analytics.extraChange.up,
      icon: TrendingDown,
      bg: "#FFFBEB",
      color: "#F59E0B",
    },
    {
      label: "Active Roommates",
      value: `${analytics.activeCount}/${roommates.length}`,
      change: `${analytics.activeCount} active now`,
      up: true,
      icon: Users,
      bg: "#FDF2F8",
      color: "#EC4899",
    },
  ];

  const dateRange =
    monthlyData.length > 0
      ? `${monthlyData[0].fullMonth} – ${monthlyData[monthlyData.length - 1].fullMonth}`
      : "No bills in selected period";

  const categoryGrandTotal = categoryData.reduce((s, c) => s + c.total, 0);
  const perPersonDomain = monthlyData.length
    ? [
        Math.floor(Math.min(...monthlyData.map((d) => d.perPerson)) * 0.95),
        Math.ceil(Math.max(...monthlyData.map((d) => d.perPerson)) * 1.05),
      ]
    : [0, 1000];

  const houseName = settings.houseName || activeBill?.houseName || "Your House";

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1
            style={{
              color: "var(--foreground)",
              fontWeight: 800,
              fontSize: "clamp(20px, 5vw, 26px)",
              letterSpacing: "-0.5px",
            }}
          >
            Analytics
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>
            Financial insights for {houseName} · {dateRange}
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl self-start" style={{ background: "var(--muted)" }}>
          {(["3M", "6M", "1Y"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: period === p ? "var(--card)" : "transparent",
                color: period === p ? "var(--foreground)" : "var(--muted-foreground)",
                fontSize: "12px",
                boxShadow: period === p ? "0 2px 8px rgba(79,70,229,0.08)" : "none",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl p-4 sm:p-5 transition-all duration-300"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 20px rgba(79,70,229,0.06)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: k.bg }}
              >
                <k.icon size={18} style={{ color: k.color }} />
              </div>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: k.up ? "#ECFDF5" : "#FEF2F2",
                  color: k.up ? "#059669" : "#EF4444",
                }}
              >
                {k.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              </div>
            </div>
            <div
              style={{
                color: "var(--foreground)",
                fontWeight: 800,
                fontSize: "clamp(18px, 4vw, 26px)",
                letterSpacing: "-0.5px",
              }}
            >
              {k.value}
            </div>
            <div style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 600, marginTop: 2 }}>
              {k.label}
            </div>
            <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 2 }}>{k.change}</div>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl p-4 sm:p-6"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 20px rgba(79,70,229,0.06)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
          <div>
            <h3 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "16px" }}>
              Monthly Cost Trend
            </h3>
            <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>
              Total house expenses · {dateRange}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {[
              { color: "#4F46E5", label: "Total" },
              { color: "#06B6D4", label: "Extra" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-3 h-1 rounded" style={{ background: l.color }} />
                <span style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="aGrad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="aGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,70,229,0.07)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                name="Total"
                stroke="#4F46E5"
                strokeWidth={2.5}
                fill="url(#aGrad1)"
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Extra"
                stroke="#06B6D4"
                strokeWidth={2}
                fill="url(#aGrad2)"
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex items-center justify-center rounded-xl py-16"
            style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "13px" }}
          >
            No bill data for the selected period
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <div
          className="rounded-2xl p-4 sm:p-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 20px rgba(79,70,229,0.06)",
          }}
        >
          <h3 className="mb-1" style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "16px" }}>
            Spending by Category
          </h3>
          <p className="mb-5" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
            {period} cumulative · ${categoryGrandTotal.toLocaleString()} total
          </p>
          {categoryData.length > 0 ? (
            <div className="space-y-4">
              {categoryData.map((c) => (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c.color }} />
                      <span
                        style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 500 }}
                        className="truncate"
                      >
                        {c.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <span style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>
                        avg ${c.avg}/mo
                      </span>
                      <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 700 }}>
                        ${c.total.toLocaleString()}
                      </span>
                      <span
                        style={{ color: "var(--muted-foreground)", fontSize: "11px", width: 32, textAlign: "right" }}
                      >
                        {c.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 rounded-full" style={{ background: "var(--muted)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${c.pct}%`, background: c.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>No expense data available</div>
          )}
        </div>

        <div
          className="rounded-2xl p-4 sm:p-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 20px rgba(79,70,229,0.06)",
          }}
        >
          <h3 className="mb-1" style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "16px" }}>
            Payments by Roommate
          </h3>
          <p className="mb-5" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
            Paid vs. pending {period} totals
          </p>
          {roommatePayments.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={roommatePayments} barSize={24} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,70,229,0.07)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="paid" name="Paid" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#FCA5A5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-5 mt-2">
                {[
                  { color: "#4F46E5", label: "Paid" },
                  { color: "#FCA5A5", label: "Pending" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                    <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              className="flex items-center justify-center rounded-xl py-16"
              style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "13px" }}
            >
              No payment data available
            </div>
          )}
        </div>
      </div>

      <div
        className="rounded-2xl p-4 sm:p-6"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 20px rgba(79,70,229,0.06)",
        }}
      >
        <h3 className="mb-1" style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "16px" }}>
          Per-Person Cost Trend
        </h3>
        <p className="mb-5" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
          Monthly amount owed by each roommate
        </p>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(79,70,229,0.07)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={perPersonDomain}
                tickFormatter={(v) => `$${v}`}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="perPerson"
                name="Per Person"
                stroke="#EC4899"
                strokeWidth={2.5}
                dot={{ fill: "#EC4899", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex items-center justify-center rounded-xl py-12"
            style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "13px" }}
          >
            No per-person data for the selected period
          </div>
        )}
      </div>
    </div>
  );
}
