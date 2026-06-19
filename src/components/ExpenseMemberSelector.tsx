import { Users, UserCheck } from "lucide-react";
import { MemberCheckboxGrid } from "@/components/MemberCheckboxGrid";
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
  const modes = [
    { id: "all" as const, label: "All Members", icon: Users, desc: "Split equally among everyone on this bill" },
    { id: "selected" as const, label: "Selected Only", icon: UserCheck, desc: "Pick specific members who share this expense" },
  ];

  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px dashed var(--border)" }}>
      <p style={{ color: "var(--foreground)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.3px", marginBottom: 8 }}>
        WHO SHARES THIS EXPENSE?
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {modes.map((mode) => {
          const active = shareMode === mode.id;
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                onShareModeChange(mode.id);
                if (mode.id === "all") onSelectedChange([]);
              }}
              className="p-3 rounded-xl text-left transition-all"
              style={{
                background: active ? "#EEF2FF" : "var(--card)",
                border: `2px solid ${active ? "#4F46E5" : "var(--border)"}`,
                boxShadow: active ? "0 4px 12px rgba(79,70,229,0.12)" : "none",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} style={{ color: active ? "#4F46E5" : "#94A3B8" }} />
                <span style={{ fontSize: "11px", fontWeight: 700, color: active ? "#4F46E5" : "var(--foreground)" }}>
                  {mode.label}
                </span>
              </div>
              <p style={{ fontSize: "9px", color: active ? "#6366F1" : "var(--muted-foreground)", lineHeight: 1.4 }}>
                {mode.desc}
              </p>
            </button>
          );
        })}
      </div>

      {shareMode === "selected" && (
        <>
          <MemberCheckboxGrid
            members={roommates.map((r) => ({ id: r.id, name: r.name, room: r.room, color: r.color }))}
            selectedIds={selectedIds}
            onChange={onSelectedChange}
          />
          <p style={{ color: "#4F46E5", fontSize: "10px", fontWeight: 600, marginTop: 8 }}>
            {selectedIds.length === 0
              ? "Select at least one member"
              : `${selectedIds.length} member${selectedIds.length !== 1 ? "s" : ""} selected`}
          </p>
        </>
      )}
    </div>
  );
}
