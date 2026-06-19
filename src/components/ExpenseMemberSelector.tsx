import { Check } from "lucide-react";
import type { Roommate } from "@/types";

interface ExpenseMemberSelectorProps {
  roommates: Roommate[];
  selectedIds: number[];
  shareMode: "all" | "selected";
  onShareModeChange: (mode: "all" | "selected") => void;
  onSelectedChange: (ids: number[]) => void;
}

export function ExpenseMemberSelector({
  roommates,
  selectedIds,
  shareMode,
  onShareModeChange,
  onSelectedChange,
}: ExpenseMemberSelectorProps) {
  const toggleMember = (id: number) => {
    if (shareMode !== "selected") return;
    onSelectedChange(
      selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]
    );
  };

  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px dashed var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ color: "var(--foreground)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.3px" }}>
          SPLIT AMONG
        </span>
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "var(--muted)" }}>
          {(["all", "selected"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                onShareModeChange(mode);
                if (mode === "all") onSelectedChange([]);
              }}
              className="px-3 py-1 rounded-md font-semibold transition-all"
              style={{
                background: shareMode === mode ? "white" : "transparent",
                color: shareMode === mode ? "#4F46E5" : "var(--muted-foreground)",
                fontSize: "10px",
                boxShadow: shareMode === mode ? "0 1px 4px rgba(79,70,229,0.12)" : "none",
              }}
            >
              {mode === "all" ? "All Members" : "Selected Only"}
            </button>
          ))}
        </div>
      </div>

      {shareMode === "all" ? (
        <p style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>
          Split equally among all members included in this bill.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {roommates.map((r) => {
            const isOn = selectedIds.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleMember(r.id)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left"
                style={{
                  background: isOn ? r.color + "12" : "var(--card)",
                  border: `2px solid ${isOn ? r.color : "var(--border)"}`,
                }}
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: isOn ? r.color : "var(--muted)",
                    border: isOn ? "none" : "1.5px solid var(--border)",
                  }}
                >
                  {isOn && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <div className="min-w-0">
                  <div
                    style={{
                      color: isOn ? r.color : "var(--foreground)",
                      fontSize: "12px",
                      fontWeight: isOn ? 700 : 500,
                    }}
                    className="truncate"
                  >
                    {r.name.split(" ")[0]}
                  </div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: "9px" }}>Room {r.room}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {shareMode === "selected" && (
        <p style={{ color: "#4F46E5", fontSize: "10px", fontWeight: 600, marginTop: 8 }}>
          {selectedIds.length === 0
            ? "Select at least one member"
            : `${selectedIds.length} member${selectedIds.length !== 1 ? "s" : ""} selected`}
        </p>
      )}
    </div>
  );
}
