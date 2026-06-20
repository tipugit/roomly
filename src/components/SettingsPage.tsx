import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  Car,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  Key,
  Mail,
  MessageSquare,
  Plus,
  Save,
  Shield,
  Smartphone,
  Trash2,
  Users,
  FileText,
  Repeat,
  Home,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { MemberCheckboxGrid } from "@/components/MemberCheckboxGrid";
import type { ParkingAssignmentTemplate, Settings } from "@/types";

const sidebarSections = [
  { id: "homes", label: "My Homes", icon: Home, color: "#7C3AED", bg: "#F5F3FF" },
  { id: "general", label: "General", icon: Globe, color: "#4F46E5", bg: "#EEF2FF" },
  { id: "recurring", label: "Default Bill", icon: Repeat, color: "#8B5CF6", bg: "#F5F3FF" },
  { id: "message", label: "General Message", icon: MessageSquare, color: "#6366F1", bg: "#EEF2FF" },
  { id: "parking", label: "Parking Management", icon: Car, color: "#0D9488", bg: "#ECFEFF" },
  { id: "notifications", label: "Notifications", icon: Bell, color: "#06B6D4", bg: "#ECFEFF" },
  { id: "billing", label: "Billing & Plan", icon: CreditCard, color: "#10B981", bg: "#ECFDF5" },
  { id: "members", label: "Member Access", icon: Users, color: "#F59E0B", bg: "#FFFBEB" },
  { id: "security", label: "Security", icon: Shield, color: "#EC4899", bg: "#FDF2F8" },
] as const;

type SectionId = (typeof sidebarSections)[number]["id"];

function Toggle({
  on,
  onToggle,
  color = "#4F46E5",
}: {
  on: boolean;
  onToggle: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0"
      style={{
        background: on ? color : "var(--muted)",
        border: `2px solid ${on ? color : "var(--border)"}`,
      }}
    >
      <div
        className="absolute w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300"
        style={{ top: 2, left: on ? "calc(100% - 18px)" : 2 }}
      />
    </button>
  );
}

function SectionCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 2px 20px rgba(79,70,229,0.06)",
      }}
    >
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
        <h3 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>{title}</h3>
        {desc && <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>{desc}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  sub,
  color,
  children,
  last,
}: {
  icon: typeof Globe;
  label: string;
  sub?: string;
  color: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-4 py-3.5"
      style={{ borderBottom: last ? "none" : "1px solid var(--border)" }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + "18" }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div style={{ color: "var(--foreground)", fontSize: "13.5px", fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 1 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function SettingsInputField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: string[];
}) {
  return (
    <div>
      <label
        style={{
          color: "var(--foreground)",
          fontSize: "12px",
          fontWeight: 600,
          display: "block",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none appearance-none"
          style={{
            background: "var(--muted)",
            border: "1.5px solid var(--border)",
            color: "var(--foreground)",
            fontSize: "13px",
          }}
        >
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl outline-none"
          style={{
            background: "var(--muted)",
            border: "1.5px solid var(--border)",
            color: "var(--foreground)",
            fontSize: "13px",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
      )}
    </div>
  );
}

function syncParkingAssignments(
  assignments: ParkingAssignmentTemplate[],
  totalSpots: number,
  roommates: { id: number }[]
): ParkingAssignmentTemplate[] {
  const next = [...assignments];
  while (next.length < totalSpots) {
    const spotNum = next.length + 1;
    const nextId = Math.max(0, ...next.map((a) => a.id)) + 1;
    next.push({
      id: nextId,
      spotName: `Spot ${String.fromCharCode(64 + spotNum)}`,
      roommateId: roommates[0]?.id ?? null,
      monthlyFee: 0,
      active: true,
      shareSpace: false,
    });
  }
  return next.slice(0, totalSpots);
}

export function SettingsPage() {
  const { settings, updateSettings, showToast, exportData, importData, resetApp, roommates } = useApp();
  const { houses, activeHouseId, switchHouse, createHouse } = useAuth();
  const [active, setActive] = useState<SectionId>("general");
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localState, setLocalState] = useState<Settings>(settings);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [feeDrafts, setFeeDrafts] = useState<Record<number, string>>({});
  const [newHomeName, setNewHomeName] = useState("");
  const [homeBusy, setHomeBusy] = useState(false);

  useEffect(() => {
    setLocalState({
      ...settings,
      defaultRent: settings.defaultRent ?? 3000,
      defaultBillExpenses: settings.defaultBillExpenses?.length
        ? settings.defaultBillExpenses
        : [
            { name: "Internet", amount: 80, category: "Internet", shareMode: "all" as const },
            { name: "Electricity", amount: 120, category: "Electricity", shareMode: "all" as const },
            { name: "Water", amount: 60, category: "Water", shareMode: "all" as const },
          ],
      parkingAssignments:
        settings.parkingAssignments.length >= settings.parkingTotalSpots
          ? settings.parkingAssignments
          : syncParkingAssignments(
              settings.parkingAssignments,
              settings.parkingTotalSpots,
              roommates
            ),
    });
  }, [settings, roommates]);

  const toggle = (k: keyof Settings) => {
    if (typeof localState[k] === "boolean") {
      setLocalState((prev) => ({ ...prev, [k]: !prev[k] }));
    }
  };

  const handleSave = async () => {
    await updateSettings(localState);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updateParkingAssignment = (id: number, patch: Partial<ParkingAssignmentTemplate>) => {
    setLocalState((prev) => ({
      ...prev,
      parkingAssignments: prev.parkingAssignments.map((a) =>
        a.id === id ? { ...a, ...patch } : a
      ),
    }));
  };

  const addParkingSpot = () => {
    if (localState.parkingAssignments.length >= localState.parkingTotalSpots) return;
    const nextNum = localState.parkingAssignments.length + 1;
    const nextId = Math.max(0, ...localState.parkingAssignments.map((a) => a.id)) + 1;
    setLocalState((prev) => ({
      ...prev,
      parkingAssignments: [
        ...prev.parkingAssignments,
        {
          id: nextId,
          spotName: `Spot ${String.fromCharCode(64 + nextNum)}`,
          roommateId: roommates[0]?.id ?? null,
          monthlyFee: 0,
          active: true,
          shareSpace: false,
        },
      ],
    }));
  };

  const removeParkingSpot = (id: number) => {
    setLocalState((prev) => {
      const filtered = prev.parkingAssignments.filter((a) => a.id !== id);
      return {
        ...prev,
        parkingTotalSpots: Math.max(0, prev.parkingTotalSpots - 1),
        parkingAssignments: syncParkingAssignments(filtered, Math.max(0, prev.parkingTotalSpots - 1), roommates),
      };
    });
  };

  const setParkingTotalSpots = (spots: number) => {
    const total = Math.max(0, spots);
    setLocalState((prev) => ({
      ...prev,
      parkingTotalSpots: total,
      parkingAssignments: syncParkingAssignments(prev.parkingAssignments, total, roommates),
    }));
  };

  const renderContent = () => {
    switch (active) {
      case "homes":
        return (
          <div className="space-y-5">
            <SectionCard title="Your Homes" desc="Each home has its own roommates, bills, and settings">
              <div className="space-y-3">
                {houses.map((house) => {
                  const isActive = house.id === activeHouseId;
                  return (
                    <div
                      key={house.id}
                      className="flex items-center gap-3 p-4 rounded-xl"
                      style={{
                        background: isActive ? "rgba(79,70,229,0.08)" : "var(--muted)",
                        border: isActive ? "1px solid rgba(79,70,229,0.25)" : "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
                      >
                        <Home size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--foreground)" }}>{house.name}</div>
                        <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                          {house.roommateCount ?? 0} roommates · {house.billCount ?? 0} bills · {house.role}
                        </div>
                      </div>
                      {isActive ? (
                        <span className="px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: "#4F46E5", color: "white" }}>
                          Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={homeBusy}
                          onClick={async () => {
                            setHomeBusy(true);
                            try {
                              await switchHouse(house.id);
                              showToast(`Switched to ${house.name}`, "success");
                            } catch (e) {
                              showToast(e instanceof Error ? e.message : "Switch failed", "error");
                            } finally {
                              setHomeBusy(false);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                        >
                          Switch
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Create a new home" desc="Start fresh with separate roommates and bills">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={newHomeName}
                  onChange={(e) => setNewHomeName(e.target.value)}
                  placeholder="e.g. Downtown Apartment"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && newHomeName.trim()) {
                      setHomeBusy(true);
                      try {
                        await createHouse(newHomeName.trim());
                        showToast("Home created", "success");
                        setNewHomeName("");
                      } catch (err) {
                        showToast(err instanceof Error ? err.message : "Failed", "error");
                      } finally {
                        setHomeBusy(false);
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={homeBusy || !newHomeName.trim()}
                  onClick={async () => {
                    setHomeBusy(true);
                    try {
                      await createHouse(newHomeName.trim());
                      showToast("Home created", "success");
                      setNewHomeName("");
                    } catch (err) {
                      showToast(err instanceof Error ? err.message : "Failed", "error");
                    } finally {
                      setHomeBusy(false);
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
                >
                  <Plus size={15} />
                  Create home
                </button>
              </div>
            </SectionCard>
          </div>
        );

      case "general":
        return (
          <div className="space-y-5">
            <SectionCard title="House Information" desc="Details about your shared house">
              <div className="space-y-4">
                <SettingsInputField
                  label="House Name"
                  value={localState.houseName}
                  onChange={(v) => setLocalState((prev) => ({ ...prev, houseName: v }))}
                />
                <SettingsInputField
                  label="Address"
                  value={localState.address}
                  onChange={(v) => setLocalState((prev) => ({ ...prev, address: v }))}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <SettingsInputField
                    label="Currency"
                    value={localState.currency}
                    onChange={(v) => setLocalState((prev) => ({ ...prev, currency: v }))}
                    options={["USD", "EUR", "GBP", "BDT", "CAD", "AUD"]}
                  />
                  <SettingsInputField
                    label="Timezone"
                    value={localState.timezone}
                    onChange={(v) => setLocalState((prev) => ({ ...prev, timezone: v }))}
                    options={[
                      "UTC-8 (PST)",
                      "UTC-5 (EST)",
                      "UTC+0 (GMT)",
                      "UTC+6 (BST)",
                      "UTC+5:30 (IST)",
                    ]}
                  />
                  <SettingsInputField
                    label="Language"
                    value={localState.language}
                    onChange={(v) => setLocalState((prev) => ({ ...prev, language: v }))}
                    options={["English", "Spanish", "French", "German", "Bengali"]}
                  />
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Bill Preferences" desc="Configure default bill behaviors">
              <SettingRow
                icon={Users}
                label="Auto-split expenses"
                sub="Automatically divide bills equally among all active roommates"
                color="#4F46E5"
              >
                <Toggle on={localState.autoSplit} onToggle={() => toggle("autoSplit")} />
              </SettingRow>
              <SettingRow
                icon={Globe}
                label="Round up member amounts"
                sub="When on, each member's share rounds up to the nearest dollar (e.g. $5.62 becomes $6)"
                color="#8B5CF6"
                last
              >
                <Toggle
                  on={localState.roundUpAmounts}
                  onToggle={() => toggle("roundUpAmounts")}
                  color="#8B5CF6"
                />
              </SettingRow>
              <SettingRow
                icon={Globe}
                label="Allow data export"
                sub="Roommates can export their bill history"
                color="#06B6D4"
                last
              >
                <Toggle
                  on={localState.dataExport}
                  onToggle={() => toggle("dataExport")}
                  color="#06B6D4"
                />
              </SettingRow>
            </SectionCard>
            <SectionCard title="Data Backup" desc="Export or restore your house data (works on static hosting)">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={exportData}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", fontSize: "13px" }}
                >
                  Download Backup
                </button>
                <label className="flex-1 py-2.5 rounded-xl font-semibold text-center cursor-pointer" style={{ background: "var(--muted)", fontSize: "13px", border: "1px solid var(--border)" }}>
                  Restore Backup
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void importData(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </SectionCard>
          </div>
        );

      case "recurring":
        return (
          <div className="space-y-5">
            <SectionCard
              title="Default Monthly Bill"
              desc="These values auto-fill when you create a new bill. You can still adjust them on each bill."
            >
              <div className="space-y-4">
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Default Rent
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>$</span>
                    <input
                      type="number"
                      value={localState.defaultRent ?? 0}
                      onChange={(e) =>
                        setLocalState((prev) => ({
                          ...prev,
                          defaultRent: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl outline-none"
                      style={{ background: "var(--muted)", border: "1.5px solid var(--border)", fontSize: "16px" }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label style={{ fontSize: "12px", fontWeight: 600 }}>Default Expenses</label>
                    <button
                      type="button"
                      onClick={() =>
                        setLocalState((prev) => ({
                          ...prev,
                          defaultBillExpenses: [
                            ...(prev.defaultBillExpenses ?? []),
                            { name: "", amount: 0, category: "Other", shareMode: "all" },
                          ],
                        }))
                      }
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "#EEF2FF", color: "#4F46E5" }}
                    >
                      <Plus size={12} />
                      Add line
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(localState.defaultBillExpenses ?? []).map((exp, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl"
                        style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                      >
                        <input
                          type="text"
                          placeholder="Name"
                          value={exp.name}
                          onChange={(e) => {
                            const next = [...(localState.defaultBillExpenses ?? [])];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setLocalState((prev) => ({ ...prev, defaultBillExpenses: next }));
                          }}
                          className="flex-1 px-3 py-2 rounded-lg outline-none min-w-0"
                          style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "16px" }}
                        />
                        <select
                          value={exp.category}
                          onChange={(e) => {
                            const next = [...(localState.defaultBillExpenses ?? [])];
                            next[idx] = { ...next[idx], category: e.target.value };
                            setLocalState((prev) => ({ ...prev, defaultBillExpenses: next }));
                          }}
                          className="sm:w-32 px-3 py-2 rounded-lg outline-none"
                          style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "16px" }}
                        >
                          {["Internet", "Electricity", "Water", "Cleaning", "Supplies", "Groceries", "Other"].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                        <div className="relative sm:w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--muted-foreground)" }}>$</span>
                          <input
                            type="number"
                            value={exp.amount || ""}
                            onChange={(e) => {
                              const next = [...(localState.defaultBillExpenses ?? [])];
                              next[idx] = { ...next[idx], amount: parseFloat(e.target.value) || 0 };
                              setLocalState((prev) => ({ ...prev, defaultBillExpenses: next }));
                            }}
                            className="w-full pl-6 pr-2 py-2 rounded-lg outline-none"
                            style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "16px" }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setLocalState((prev) => ({
                              ...prev,
                              defaultBillExpenses: (prev.defaultBillExpenses ?? []).filter((_, i) => i !== idx),
                            }))
                          }
                          className="w-9 h-9 flex items-center justify-center rounded-lg self-end sm:self-auto flex-shrink-0"
                          style={{ background: "#FEF2F2" }}
                        >
                          <Trash2 size={14} style={{ color: "#EF4444" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 10, lineHeight: 1.5 }}>
                    Save settings, then create a new bill — these lines appear automatically. Edit or remove them per bill as needed.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        );

      case "message":
        return (
          <SectionCard
            title="Global Message"
            desc="Appears on every monthly bill, public page, and PDF export (after monthly announcement)"
          >
            <div className="space-y-4">
              <SettingsInputField
                label="Global Title"
                value={localState.globalMessageTitle}
                onChange={(v) => setLocalState((prev) => ({ ...prev, globalMessageTitle: v }))}
              />
              <div>
                <label
                  style={{
                    color: "var(--foreground)",
                    fontSize: "12px",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Global Message
                </label>
                <textarea
                  rows={4}
                  value={localState.globalMessage}
                  onChange={(e) =>
                    setLocalState((prev) => ({ ...prev, globalMessage: e.target.value }))
                  }
                  placeholder="Please keep common areas clean and report maintenance issues promptly."
                  className="w-full px-4 py-3 rounded-xl outline-none resize-none"
                  style={{
                    background: "var(--muted)",
                    border: "1.5px solid var(--border)",
                    color: "var(--foreground)",
                    fontSize: "13px",
                  }}
                />
              </div>
            </div>
          </SectionCard>
        );

      case "parking":
        return (
          <div className="space-y-5">
            <SectionCard title="Parking Settings" desc="Templates copied into each new monthly bill">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    style={{
                      color: "var(--foreground)",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Total Parking Spots
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={localState.parkingTotalSpots}
                    onChange={(e) => setParkingTotalSpots(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl outline-none"
                    style={{
                      background: "var(--muted)",
                      border: "1.5px solid var(--border)",
                      color: "var(--foreground)",
                      fontSize: "13px",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      color: "var(--foreground)",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Parking Included In Rent
                  </label>
                  <div className="flex gap-2">
                    {([true, false] as const).map((val) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() =>
                          setLocalState((prev) => ({ ...prev, parkingIncludedInRent: val }))
                        }
                        className="flex-1 py-2.5 rounded-xl font-semibold transition-all"
                        style={{
                          background: localState.parkingIncludedInRent === val ? "#ECFEFF" : "var(--muted)",
                          border: `2px solid ${localState.parkingIncludedInRent === val ? "#0D9488" : "var(--border)"}`,
                          color: localState.parkingIncludedInRent === val ? "#0D9488" : "var(--muted-foreground)",
                          fontSize: "12px",
                        }}
                      >
                        {val ? "Yes" : "No"}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 px-3 py-2 rounded-xl" style={{ background: "#ECFEFF" }}>
                    <p style={{ color: "#0D9488", fontSize: "11px", lineHeight: 1.5 }}>
                      {localState.parkingIncludedInRent
                        ? "Parking fees are deducted from rent before splitting. Members won't see a separate parking charge."
                        : "Parking fees are added on top of rent. Assigned members pay their spot fee separately."}
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Parking Assignments"
              desc={`${localState.parkingAssignments.length} of ${localState.parkingTotalSpots} spots assigned`}
            >
              <div className="overflow-x-auto mb-4" style={{ scrollbarWidth: "none" }}>
                <table className="w-full" style={{ minWidth: 620 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Spot", "Member", "Monthly Fee", "Share Space", "Status", ""].map((h) => (
                        <th
                          key={h}
                          className="text-left px-3 py-2"
                          style={{
                            color: "var(--muted-foreground)",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          {h.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {localState.parkingAssignments.map((a) => (
                      <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={a.spotName}
                            onChange={(e) =>
                              updateParkingAssignment(a.id, { spotName: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg outline-none"
                            style={{
                              background: "var(--muted)",
                              border: "1px solid var(--border)",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={a.roommateId ?? ""}
                            onChange={(e) =>
                              updateParkingAssignment(a.id, {
                                roommateId: e.target.value ? parseInt(e.target.value, 10) : null,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg outline-none appearance-none"
                            style={{
                              background: "var(--muted)",
                              border: "1px solid var(--border)",
                              fontSize: "12px",
                            }}
                          >
                            <option value="">Unassigned</option>
                            {roommates.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <div className="relative">
                            <span
                              className="absolute left-2 top-1/2 -translate-y-1/2"
                              style={{ color: "var(--muted-foreground)", fontSize: "12px" }}
                            >
                              $
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={feeDrafts[a.id] ?? (a.monthlyFee === 0 ? "" : String(a.monthlyFee))}
                              onChange={(e) =>
                                setFeeDrafts((prev) => ({ ...prev, [a.id]: e.target.value }))
                              }
                              onBlur={() => {
                                const raw = feeDrafts[a.id];
                                const parsed = raw === undefined || raw === "" ? 0 : parseFloat(raw) || 0;
                                updateParkingAssignment(a.id, { monthlyFee: parsed });
                                setFeeDrafts((prev) => {
                                  const next = { ...prev };
                                  delete next[a.id];
                                  return next;
                                });
                              }}
                              placeholder="0"
                              className="w-24 pl-6 pr-2 py-2 rounded-lg outline-none"
                              style={{
                                background: "var(--muted)",
                                border: "1px solid var(--border)",
                                fontSize: "12px",
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="min-w-[160px]">
                            <Toggle
                              on={a.shareSpace ?? false}
                              onToggle={() => {
                                const next = !(a.shareSpace ?? false);
                                updateParkingAssignment(a.id, {
                                  shareSpace: next,
                                  sharedBy: next ? roommates.map((r) => r.id) : [],
                                });
                              }}
                              color="#0D9488"
                            />
                            {(a.shareSpace ?? false) ? (
                              <div className="mt-2 p-2 rounded-xl" style={{ background: "#ECFDF5", border: "1px solid rgba(16,185,129,0.15)" }}>
                                <p style={{ color: "#059669", fontSize: "9px", fontWeight: 700, marginBottom: 6 }}>
                                  WHO PAYS FOR THIS SPOT?
                                </p>
                                <MemberCheckboxGrid
                                  compact
                                  members={roommates.map((r) => ({ id: r.id, name: r.name, color: r.color }))}
                                  selectedIds={a.sharedBy?.length ? a.sharedBy : roommates.map((r) => r.id)}
                                  onChange={(ids) => updateParkingAssignment(a.id, { sharedBy: ids })}
                                />
                              </div>
                            ) : (
                              <p style={{ color: "var(--muted-foreground)", fontSize: "9px", marginTop: 4 }}>
                                Exclusive — assignee pays full fee
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Toggle
                            on={a.active}
                            onToggle={() => updateParkingAssignment(a.id, { active: !a.active })}
                            color="#0D9488"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => removeParkingSpot(a.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg"
                            style={{ background: "#FEF2F2" }}
                          >
                            <Trash2 size={13} style={{ color: "#EF4444" }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {localState.parkingAssignments.length < localState.parkingTotalSpots && (
                <button
                  type="button"
                  onClick={addParkingSpot}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold border-2 border-dashed"
                  style={{
                    borderColor: "rgba(13,148,136,0.3)",
                    color: "#0D9488",
                    background: "rgba(13,148,136,0.03)",
                    fontSize: "13px",
                  }}
                >
                  <Plus size={15} />
                  Add Parking Spot ({localState.parkingAssignments.length}/{localState.parkingTotalSpots})
                </button>
              )}
            </SectionCard>
          </div>
        );

      case "notifications":
        return (
          <SectionCard title="Notification Preferences" desc="Choose when and how you receive alerts">
            <div>
              <div
                style={{
                  color: "var(--muted-foreground)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.6px",
                  marginBottom: 8,
                }}
              >
                EMAIL NOTIFICATIONS
              </div>
              <SettingRow
                icon={Mail}
                label="New bill created"
                sub="Get emailed when a monthly bill is generated"
                color="#4F46E5"
              >
                <Toggle on={localState.emailBill} onToggle={() => toggle("emailBill")} />
              </SettingRow>
              <SettingRow
                icon={Mail}
                label="Expense updates"
                sub="Notifications when shared costs change"
                color="#4F46E5"
              >
                <Toggle on={localState.emailExpense} onToggle={() => toggle("emailExpense")} />
              </SettingRow>
              <SettingRow
                icon={Mail}
                label="Payment reminders"
                sub="Weekly reminder emails for unpaid balances"
                color="#4F46E5"
              >
                <Toggle on={localState.emailReminder} onToggle={() => toggle("emailReminder")} />
              </SettingRow>
              <div
                style={{
                  color: "var(--muted-foreground)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.6px",
                  marginTop: 16,
                  marginBottom: 8,
                }}
              >
                SMS NOTIFICATIONS
              </div>
              <SettingRow
                icon={Smartphone}
                label="SMS bill alerts"
                sub="Text message when new bills are created"
                color="#06B6D4"
              >
                <Toggle on={localState.smsBill} onToggle={() => toggle("smsBill")} color="#06B6D4" />
              </SettingRow>
              <div
                style={{
                  color: "var(--muted-foreground)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.6px",
                  marginTop: 16,
                  marginBottom: 8,
                }}
              >
                PUSH NOTIFICATIONS
              </div>
              <SettingRow
                icon={Bell}
                label="All push notifications"
                sub="Real-time app alerts for all events"
                color="#10B981"
              >
                <Toggle on={localState.pushAll} onToggle={() => toggle("pushAll")} color="#10B981" />
              </SettingRow>
              <SettingRow
                icon={Bell}
                label="Payment confirmations"
                sub="Notify when roommates mark payments"
                color="#10B981"
                last
              >
                <Toggle
                  on={localState.pushPayment}
                  onToggle={() => toggle("pushPayment")}
                  color="#10B981"
                />
              </SettingRow>
            </div>
          </SectionCard>
        );

      case "security":
        return (
          <div className="space-y-5">
            <SectionCard title="Authentication" desc="Secure your account access">
              <SettingRow
                icon={Shield}
                label="Two-Factor Authentication"
                sub="Add an extra layer of security with 2FA via SMS or authenticator app"
                color="#EC4899"
              >
                <Toggle
                  on={localState.twoFactor}
                  onToggle={() => toggle("twoFactor")}
                  color="#EC4899"
                />
              </SettingRow>
              <SettingRow
                icon={Key}
                label="Session Timeout"
                sub="Automatically log out after inactivity"
                color="#8B5CF6"
                last
              >
                <select
                  value={localState.sessionTimeout}
                  onChange={(e) =>
                    setLocalState((prev) => ({ ...prev, sessionTimeout: e.target.value }))
                  }
                  className="px-3 py-1.5 rounded-xl outline-none appearance-none"
                  style={{
                    background: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    fontSize: "12px",
                  }}
                >
                  {["15 minutes", "30 minutes", "1 hour", "4 hours", "Never"].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </SettingRow>
            </SectionCard>

            <SectionCard title="Change Password" desc="Update your account password (stored locally in this browser)">
              <div className="space-y-4">
                {[
                  { key: "current" as const, label: "Current Password" },
                  { key: "next" as const, label: "New Password" },
                  { key: "confirm" as const, label: "Confirm New Password" },
                ].map(({ key, label }) => (
                  <div key={label}>
                    <label style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••"
                        value={passwordForm[key]}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full px-4 py-2.5 pr-10 rounded-xl outline-none"
                        style={{ background: "var(--muted)", border: "1.5px solid var(--border)", color: "var(--foreground)", fontSize: "13px" }}
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword((p) => !p)}>
                        {showPassword ? <EyeOff size={14} style={{ color: "var(--muted-foreground)" }} /> : <Eye size={14} style={{ color: "var(--muted-foreground)" }} />}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    if (!passwordForm.next || passwordForm.next !== passwordForm.confirm) {
                      showToast("Passwords do not match", "error");
                      return;
                    }
                    if (localState.adminPassword && passwordForm.current !== localState.adminPassword) {
                      showToast("Current password is incorrect", "error");
                      return;
                    }
                    setLocalState((p) => ({ ...p, adminPassword: passwordForm.next }));
                    setPasswordForm({ current: "", next: "", confirm: "" });
                    showToast("Password updated", "success");
                  }}
                  className="w-full py-2.5 rounded-xl font-semibold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)", fontSize: "13px" }}
                >
                  Update Password
                </button>
              </div>
            </SectionCard>

            <div
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{ background: "#FEF9EC", border: "1.5px solid rgba(245,158,11,0.3)" }}
            >
              <AlertTriangle size={18} style={{ color: "#D97706", flexShrink: 0, marginTop: 2 }} />
              <div className="flex-1">
                <div style={{ color: "#92400E", fontWeight: 600, fontSize: "14px" }}>Danger Zone</div>
                <p style={{ color: "#B45309", fontSize: "12px", marginTop: 4, marginBottom: 12 }}>
                  Type DELETE to permanently remove all house data from this browser.
                </p>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  className="w-full px-3 py-2 rounded-xl mb-3 outline-none"
                  style={{ background: "white", border: "1px solid rgba(239,68,68,0.3)", fontSize: "13px" }}
                />
                <button
                  type="button"
                  disabled={deleteConfirm !== "DELETE"}
                  onClick={() => {
                    resetApp();
                    setDeleteConfirm("");
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)", fontSize: "12px" }}
                >
                  Delete House Account
                </button>
              </div>
            </div>
          </div>
        );

      case "billing":
        return (
          <div className="space-y-5">
            <SectionCard title="Current Plan" desc="Your Roomly subscription tier">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(["Free", "Pro", "Team"] as const).map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => setLocalState((p) => ({ ...p, plan }))}
                    className="p-4 rounded-2xl text-left transition-all"
                    style={{
                      background: localState.plan === plan ? "#EEF2FF" : "var(--muted)",
                      border: `2px solid ${localState.plan === plan ? "#4F46E5" : "var(--border)"}`,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "15px" }}>{plan}</div>
                    <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 4 }}>
                      {plan === "Free" ? "$0/mo" : plan === "Pro" ? "$9/mo" : "$19/mo"}
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Admin Profile" desc="Displayed in the sidebar and header">
              <div className="space-y-4">
                <SettingsInputField
                  label="Display Name"
                  value={localState.adminName}
                  onChange={(v) => setLocalState((prev) => ({ ...prev, adminName: v }))}
                />
                <SettingsInputField
                  label="Email Address"
                  value={localState.adminEmail}
                  onChange={(v) => setLocalState((prev) => ({ ...prev, adminEmail: v }))}
                />
              </div>
            </SectionCard>
          </div>
        );

      case "members":
        return (
          <SectionCard title="Member Permissions" desc="Control what roommates can do in the app">
            <SettingRow icon={FileText} label="Create bills" sub="Allow members to create monthly bills" color="#4F46E5">
              <Toggle on={localState.memberCanCreateBills} onToggle={() => toggle("memberCanCreateBills")} />
            </SettingRow>
            <SettingRow icon={Globe} label="Edit expenses" sub="Allow members to modify shared expenses" color="#06B6D4">
              <Toggle on={localState.memberCanEditExpenses} onToggle={() => toggle("memberCanEditExpenses")} color="#06B6D4" />
            </SettingRow>
            <SettingRow icon={Users} label="Invite roommates" sub="Allow members to add new roommates" color="#F59E0B" last>
              <Toggle on={localState.memberCanInvite} onToggle={() => toggle("memberCanInvite")} color="#F59E0B" />
            </SettingRow>
          </SectionCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1100px] mx-auto">
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
            Settings
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: 2 }}>
            Manage your house, notifications and security preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold transition-all self-start"
          style={{
            background: saved
              ? "linear-gradient(135deg, #10B981, #059669)"
              : "linear-gradient(135deg, #4F46E5, #7C3AED)",
            fontSize: "13.5px",
            boxShadow: "0 4px 14px rgba(79,70,229,0.25)",
          }}
        >
          {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Mobile: sticky horizontal section tabs */}
      <div
        className="lg:hidden sticky z-10 -mx-4 px-4 py-2"
        style={{ top: 0, background: "var(--background)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {sidebarSections.map((section) => {
            const isActive = active === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActive(section.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full flex-shrink-0 transition-all"
                style={{
                  background: isActive ? section.bg : "var(--card)",
                  border: `1.5px solid ${isActive ? section.color : "var(--border)"}`,
                  color: isActive ? section.color : "var(--muted-foreground)",
                  fontSize: "12px",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <section.icon size={13} />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Desktop sidebar */}
        <div
          className="hidden lg:block rounded-2xl p-3 h-fit"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 20px rgba(79,70,229,0.06)",
          }}
        >
          {sidebarSections.map((section) => {
            const isActive = active === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActive(section.id)}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl mb-0.5 text-left transition-all group"
                style={{
                  background: isActive ? section.bg : "transparent",
                  border: isActive ? `1px solid ${section.color}20` : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "var(--muted)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: isActive ? section.color : "var(--muted)" }}
                >
                  <section.icon
                    size={15}
                    style={{ color: isActive ? "white" : "var(--muted-foreground)" }}
                  />
                </div>
                <span
                  style={{
                    flex: 1,
                    color: isActive ? section.color : "var(--foreground)",
                    fontSize: "13.5px",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {section.label}
                </span>
                {isActive && <ChevronRight size={13} style={{ color: section.color }} />}
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 min-w-0">{renderContent()}</div>
      </div>
    </div>
  );
}
