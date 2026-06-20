import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { CalculationLine } from "@/lib/utils";
import { formatAmount } from "@/lib/utils";

const lineStyles: Record<
  CalculationLine["type"],
  { sign: string; color: string; bg: string; weight: number }
> = {
  add: { sign: "+", color: "var(--status-info-text)", bg: "var(--status-info-bg)", weight: 500 },
  subtract: { sign: "−", color: "var(--status-success-text)", bg: "var(--status-success-bg)", weight: 500 },
  info: { sign: "", color: "var(--muted-foreground)", bg: "var(--muted)", weight: 400 },
  subtotal: { sign: "=", color: "var(--foreground)", bg: "var(--muted)", weight: 700 },
  total: { sign: "=", color: "var(--primary)", bg: "var(--status-info-bg)", weight: 800 },
  balance: { sign: "=", color: "var(--status-danger-text)", bg: "var(--status-danger-bg)", weight: 800 },
};

interface MemberCalculationPanelProps {
  lines: CalculationLine[];
  roundUp?: boolean;
  accentColor?: string;
}

export function MemberCalculationPanel({ lines, roundUp = false, accentColor = "#4F46E5" }: MemberCalculationPanelProps) {
  const [open, setOpen] = useState(false);

  if (lines.length === 0) return null;

  return (
    <div className="mt-3" style={{ borderTop: `1px dashed ${accentColor}33` }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-2.5 text-left transition-opacity hover:opacity-80"
      >
        <span style={{ fontSize: "11px", fontWeight: 700, color: accentColor, letterSpacing: "0.3px" }}>
          See calculation
        </span>
        {open ? <ChevronUp size={14} style={{ color: accentColor }} /> : <ChevronDown size={14} style={{ color: accentColor }} />}
      </button>

      {open && (
        <div
          className="rounded-xl overflow-hidden mb-1"
          style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
        >
          {lines.map((line, i) => {
            const style = lineStyles[line.type];
            const isEmphasis = line.type === "subtotal" || line.type === "total" || line.type === "balance";
            return (
              <div
                key={`${line.label}-${i}`}
                className="px-3 py-2.5"
                style={{
                  background: isEmphasis ? style.bg : "transparent",
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div style={{ fontSize: "12px", fontWeight: style.weight, color: style.color }}>
                      {style.sign && line.amount != null ? `${style.sign} ` : ""}
                      {line.label}
                    </div>
                    {line.detail && (
                      <div style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: 3, lineHeight: 1.4 }}>
                        {line.detail}
                      </div>
                    )}
                  </div>
                  {line.amount != null && (
                    <span
                      className="flex-shrink-0 tabular-nums"
                      style={{ fontSize: isEmphasis ? "14px" : "12px", fontWeight: style.weight, color: style.color }}
                    >
                      {formatAmount(line.amount, roundUp)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
