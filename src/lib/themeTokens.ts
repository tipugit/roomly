import type { PayStatus } from "@/types";

/** Semantic colors that adapt via CSS variables in theme.css */
export const payStatusStyle: Record<PayStatus, { bg: string; text: string }> = {
  Paid: { bg: "var(--status-success-bg)", text: "var(--status-success-text)" },
  Partial: { bg: "var(--status-warning-bg)", text: "var(--status-warning-text)" },
  Pending: { bg: "var(--status-danger-bg)", text: "var(--status-danger-text)" },
};

export const actionButtonStyle = {
  success: { bg: "var(--action-success-bg)", text: "var(--action-success-text)", border: "var(--action-success-border)" },
  primary: { bg: "var(--action-primary-bg)", text: "var(--action-primary-text)", border: "var(--action-primary-border)" },
  warning: { bg: "var(--action-warning-bg)", text: "var(--action-warning-text)", border: "var(--action-warning-border)" },
  muted: { bg: "var(--muted)", text: "var(--muted-foreground)", border: "var(--border)" },
  danger: { bg: "var(--action-danger-bg)", text: "var(--action-danger-text)", border: "var(--action-danger-border)" },
} as const;

export function chartAxisColor(darkMode: boolean) {
  return darkMode ? "#94A3B8" : "#64748B";
}

export function chartGridColor(darkMode: boolean) {
  return darkMode ? "rgba(99, 102, 241, 0.14)" : "rgba(79, 70, 229, 0.08)";
}

export const chartSeries = {
  total: { stroke: "var(--chart-1)", fill: "var(--chart-1)" },
  rent: { stroke: "var(--chart-3)", fill: "var(--chart-3)" },
  expenses: { stroke: "var(--chart-2)", fill: "var(--chart-2)" },
  parking: { stroke: "var(--chart-4)", fill: "var(--chart-4)" },
} as const;
