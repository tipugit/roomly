import { useEffect, useRef, useState } from "react";
import { ChevronDown, Home, Plus, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";

export function HouseSwitcher({ compact = false }: { compact?: boolean }) {
  const { houses, activeHouseId, switchHouse, createHouse } = useAuth();
  const { showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = houses.find((h) => h.id === activeHouseId) ?? houses[0];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleSwitch = async (houseId: number) => {
    if (houseId === activeHouseId || busy) return;
    setBusy(true);
    try {
      await switchHouse(houseId);
      showToast("Switched home", "success");
      setOpen(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to switch", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await createHouse(name);
      showToast(`Created "${name}"`, "success");
      setNewName("");
      setCreating(false);
      setOpen(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to create home", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!active && houses.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl transition-all hover:opacity-90"
        style={{
          padding: compact ? "6px 10px" : "8px 12px",
          background: "var(--muted)",
          border: "1px solid var(--border)",
          maxWidth: compact ? 180 : 240,
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
        >
          <Home size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div
            className="truncate"
            style={{ color: "var(--foreground)", fontSize: compact ? "12px" : "13px", fontWeight: 600 }}
          >
            {active?.name ?? "My Home"}
          </div>
          {!compact && houses.length > 1 && (
            <div style={{ color: "var(--muted-foreground)", fontSize: "10px" }}>
              {houses.length} homes
            </div>
          )}
        </div>
        {busy ? (
          <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: "var(--muted-foreground)" }} />
        ) : (
          <ChevronDown size={14} className="flex-shrink-0" style={{ color: "var(--muted-foreground)" }} />
        )}
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 rounded-xl overflow-hidden shadow-xl"
          style={{
            minWidth: 260,
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 12px 40px rgba(15,13,42,0.15)",
            right: compact ? 0 : undefined,
            left: compact ? undefined : 0,
          }}
        >
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.6px", color: "var(--muted-foreground)" }}>
              YOUR HOMES
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {houses.map((house) => {
              const isActive = house.id === activeHouseId;
              return (
                <button
                  key={house.id}
                  type="button"
                  onClick={() => handleSwitch(house.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                  style={{ background: isActive ? "rgba(79,70,229,0.08)" : "transparent" }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--muted)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{house.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {house.roommateCount ?? 0} roommates · {house.billCount ?? 0} bills
                    </div>
                  </div>
                  {isActive && <Check size={16} style={{ color: "#4F46E5", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", padding: 10 }}>
            {creating ? (
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Home name"
                  className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={busy || !newName.trim()}
                  className="px-3 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ color: "#4F46E5", background: "rgba(79,70,229,0.08)" }}
              >
                <Plus size={15} />
                Create new home
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
