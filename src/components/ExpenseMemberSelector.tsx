import { CheckCircle2 } from "lucide-react";
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
    <div className="mt-2 pt-2" style={{ borderTop: "1px dashed var(--border)" }}>
      <div className="flex items-center justify-between mb-2">
        <span style={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: 600 }}>
          SHARED BY
        </span>
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "var(--card)" }}>
          {(["all", "selected"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                onShareModeChange(mode);
                if (mode === "all") onSelectedChange([]);
              }}
              className="px-2 py-1 rounded-md font-semibold transition-all"
              style={{
                background: shareMode === mode ? "#EEF2FF" : "transparent",
                color: shareMode === mode ? "#4F46E5" : "var(--muted-foreground)",
                fontSize: "10px",
              }}
            >
              {mode === "all" ? "All Members" : "Selected"}
            </button>
          ))}
        </div>
      </div>
      {shareMode === "selected" && (
        <div className="flex flex-wrap gap-1.5">
          {roommates.map((r) => {
            const isOn = selectedIds.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleMember(r.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all"
                style={{
                  background: isOn ? r.color + "18" : "var(--card)",
                  border: `1px solid ${isOn ? r.color : "var(--border)"}`,
                  color: isOn ? r.color : "var(--muted-foreground)",
                  fontSize: "10px",
                  fontWeight: isOn ? 600 : 400,
                }}
              >
                {isOn && <CheckCircle2 size={10} />}
                {r.name.split(" ")[0]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
