import { Check } from "lucide-react";

interface MemberOption {
  id: number;
  name: string;
  room?: string;
  color: string;
}

interface MemberCheckboxGridProps {
  members: MemberOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  compact?: boolean;
}

export function MemberCheckboxGrid({
  members,
  selectedIds,
  onChange,
  compact = false,
}: MemberCheckboxGridProps) {
  const toggle = (id: number) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"} gap-2`}>
      {members.map((r) => {
        const isOn = selectedIds.includes(r.id);
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => toggle(r.id)}
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all text-left"
            style={{
              background: isOn ? r.color + "12" : "var(--card)",
              border: `2px solid ${isOn ? r.color : "var(--border)"}`,
            }}
          >
            <div
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
              style={{
                background: isOn ? r.color : "var(--muted)",
                border: isOn ? "none" : "1.5px solid var(--border)",
              }}
            >
              {isOn && <Check size={10} className="text-white" strokeWidth={3} />}
            </div>
            <span
              className="truncate"
              style={{
                fontSize: compact ? "10px" : "11px",
                fontWeight: isOn ? 700 : 500,
                color: isOn ? r.color : "var(--foreground)",
              }}
            >
              {r.name.split(" ")[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
