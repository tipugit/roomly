import type { CollectionSummary } from "@/lib/utils";
import { formatAmount } from "@/lib/utils";

interface CollectionSummaryCardProps {
  summary: CollectionSummary;
  compact?: boolean;
  variant?: "default" | "dark" | "public";
  roundUp?: boolean;
}

export function CollectionSummaryCard({
  summary,
  compact = false,
  variant = "default",
  roundUp = false,
}: CollectionSummaryCardProps) {
  const isDark = variant === "dark";
  const isPublic = variant === "public";
  const rows = [
    { label: "Base Rent", value: summary.baseRent },
    { label: "Additional Expenses", value: summary.additionalExpenses },
    ...(summary.parkingFees > 0 ? [{ label: "Parking Fees", value: summary.parkingFees }] : []),
  ];

  return (
    <div
      className={`rounded-2xl overflow-hidden ${compact ? "p-4" : ""}`}
      style={{
        background: isDark
          ? "rgba(255,255,255,0.06)"
          : isPublic
            ? "white"
            : "var(--card)",
        border: isDark
          ? "1px solid rgba(255,255,255,0.12)"
          : isPublic
            ? "1px solid rgba(79,70,229,0.1)"
            : "1px solid var(--border)",
        boxShadow: isDark ? "none" : "0 2px 20px rgba(79,70,229,0.06)",
      }}
    >
      {!compact && (
        <div
          className="px-5 py-3.5"
          style={{
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "var(--border)"}`,
            background: isDark ? "transparent" : "var(--muted)",
          }}
        >
          <h3
            style={{
              color: isDark ? "white" : "var(--foreground)",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            Collection Summary
          </h3>
        </div>
      )}
      <div className={compact ? "space-y-2" : "p-5 space-y-2.5"}>
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between items-center">
            <span
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : "var(--muted-foreground)",
                fontSize: compact ? "11px" : "12px",
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                color: isDark ? "white" : "var(--foreground)",
                fontWeight: 600,
                fontSize: compact ? "12px" : "13px",
              }}
            >
              {formatAmount(row.value, roundUp)}
            </span>
          </div>
        ))}
        <div
          className="h-px my-1"
          style={{ background: isDark ? "rgba(255,255,255,0.12)" : "var(--border)" }}
        />
        {[
          { label: "Total To Collect", value: summary.totalToCollect, highlight: "#4F46E5" },
          { label: "Total Paid", value: summary.totalPaid, highlight: "#10B981" },
          { label: "Outstanding Balance", value: summary.outstanding, highlight: "#EF4444" },
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center">
            <span
              style={{
                color: isDark ? "rgba(255,255,255,0.75)" : "var(--foreground)",
                fontSize: compact ? "11px" : "12px",
                fontWeight: row.label === "Total To Collect" ? 700 : 500,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                color: isDark ? row.highlight : row.highlight,
                fontWeight: 800,
                fontSize: row.label === "Total To Collect" ? (compact ? "14px" : "16px") : compact ? "12px" : "14px",
              }}
            >
              {formatAmount(row.value, roundUp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
