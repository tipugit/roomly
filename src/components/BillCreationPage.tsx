import { useState, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  Calculator,
  CheckCircle2,
  Info,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ExpenseMemberSelector } from "@/components/ExpenseMemberSelector";
import type { Expense } from "@/types";
import {
  buildParkingSnapshotFromSettings,
  buildMemberShareBreakdown,
  buildRoommateShares,
  calcCollectionSummary,
  formatAmount,
} from "@/lib/utils";

const expenseCategories = [
  "Internet",
  "Electricity",
  "Water",
  "Cleaning",
  "Supplies",
  "Groceries",
  "Other",
];

const monthOptions = [
  "January 2026",
  "February 2026",
  "March 2026",
  "April 2026",
  "May 2026",
  "June 2026",
  "July 2026",
  "August 2026",
  "September 2026",
  "October 2026",
  "November 2026",
  "December 2026",
  "Extra Bill",
];

interface FormExpense {
  id: number;
  name: string;
  amount: string;
  paidBy: number;
  category: string;
  shareMode: "all" | "selected";
  sharedBy: number[];
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
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
      <div
        className="px-6 py-4"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}
      >
        <h3 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export function BillCreationPage({ onCreated }: { onCreated?: () => void }) {
  const { roommates, settings, createBill, showToast } = useApp();

  const defaultPaidBy = roommates[0]?.id ?? 1;

  const [month, setMonth] = useState("June 2026");
  const [extraBillMonth, setExtraBillMonth] = useState("June 2026");
  const isExtraBill = month === "Extra Bill";
  const [houseName, setHouseName] = useState(settings.houseName);
  const [rent, setRent] = useState("3000");
  const [expenses, setExpenses] = useState<FormExpense[]>([
    { id: 1, name: "Internet", amount: "80", paidBy: 2, category: "Internet", shareMode: "all", sharedBy: [] },
    { id: 2, name: "Electricity", amount: "120", paidBy: 1, category: "Electricity", shareMode: "all", sharedBy: [] },
    { id: 3, name: "Water", amount: "60", paidBy: 3, category: "Water", shareMode: "all", sharedBy: [] },
    { id: 4, name: "Cleaning", amount: "150", paidBy: 4, category: "Cleaning", shareMode: "all", sharedBy: [] },
    { id: 5, name: "Supplies", amount: "40", paidBy: 5, category: "Supplies", shareMode: "all", sharedBy: [] },
  ]);
  const [selected, setSelected] = useState<number[]>(() => roommates.map((r) => r.id));
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [saved, setSaved] = useState(false);

  const addExpense = () =>
    setExpenses((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        amount: "",
        paidBy: defaultPaidBy,
        category: "Other",
        shareMode: "all",
        sharedBy: [],
      },
    ]);

  const removeExpense = (id: number) =>
    setExpenses((prev) => prev.filter((e) => e.id !== id));

  const updateExpense = (id: number, field: keyof FormExpense, value: string | number) =>
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );

  const toggleRoommate = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const rentNum = parseFloat(rent) || 0;
  const extraTotal = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const parkingSnapshot = buildParkingSnapshotFromSettings(settings);

  const parsedExpenses: Expense[] = expenses.map((e) => ({
    id: e.id,
    name: e.name || e.category,
    amount: parseFloat(e.amount) || 0,
    paidBy: e.paidBy,
    category: e.category,
    shareMode: e.shareMode,
    sharedBy: e.shareMode === "selected" ? e.sharedBy : undefined,
  }));

  const roundUp = settings.roundUpAmounts ?? false;
  const billMonth = isExtraBill ? `Extra Bill — ${extraBillMonth}` : month;

  const roommateShares = buildRoommateShares(
    roommates,
    selected,
    rentNum,
    parsedExpenses,
    undefined,
    parkingSnapshot,
    roundUp
  );

  const previewBill = {
    id: "preview",
    month: billMonth,
    houseName,
    rent: rentNum,
    expenses: parsedExpenses,
    selectedRoommateIds: selected,
    roommateShares,
    createdAt: "",
    parkingSnapshot,
  };
  const collectionSummary = calcCollectionSummary(previewBill);
  const grandTotal = collectionSummary.totalToCollect;

  const breakdown = roommateShares.map((rs) => {
    const r = roommates.find((rm) => rm.id === rs.roommateId)!;
    const owes = rs.share - rs.paid;
    const calc = buildMemberShareBreakdown(
      rs.roommateId,
      selected,
      rentNum,
      parsedExpenses,
      parkingSnapshot,
      roundUp
    );
    return { ...r, paid: rs.paid, owes, share: rs.share, calc };
  });

  const handleCreate = async () => {
    if (selected.length === 0) {
      showToast("Select at least one roommate to split the bill", "error");
      return;
    }

    if (!houseName.trim()) {
      showToast("Please enter a house name", "error");
      return;
    }

    for (const exp of expenses) {
      if (exp.shareMode === "selected" && exp.sharedBy.length === 0) {
        showToast(`Select members for "${exp.name || exp.category}" expense`, "error");
        return;
      }
    }

    await createBill({
      month: billMonth,
      houseName: houseName.trim(),
      rent: rentNum,
      expenses: parsedExpenses,
      selectedRoommateIds: selected,
      announcementTitle: announcementTitle.trim(),
      announcementMessage: announcementMessage.trim(),
      parkingSnapshot,
      isExtraBill,
    });

    setSaved(true);
    onCreated?.();
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1
            style={{
              color: "var(--foreground)",
              fontWeight: 800,
              fontSize: "clamp(20px, 5vw, 26px)",
              letterSpacing: "-0.5px",
            }}
          >
            Create Monthly Bill
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>
            Build, split and share house expenses
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0"
          style={{ background: "#EEF2FF", border: "1px solid rgba(79,70,229,0.2)" }}
        >
          <Sparkles size={13} style={{ color: "#4F46E5" }} />
          <span style={{ color: "#4F46E5", fontSize: "11px", fontWeight: 600 }}>
            Auto-split
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          <SectionCard title="Billing Period" subtitle="Select the month for this bill">
            <div className="grid grid-cols-2 gap-4">
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
                  Month
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none appearance-none"
                  style={{
                    background: "var(--muted)",
                    border: "1.5px solid var(--border)",
                    color: "var(--foreground)",
                    fontSize: "13px",
                  }}
                >
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              {isExtraBill && (
                <div className="col-span-2">
                  <label
                    style={{
                      color: "var(--foreground)",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Bill Month (creation date)
                  </label>
                  <select
                    value={extraBillMonth}
                    onChange={(e) => setExtraBillMonth(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl outline-none appearance-none"
                    style={{
                      background: "var(--muted)",
                      border: "1.5px solid var(--border)",
                      color: "var(--foreground)",
                      fontSize: "13px",
                    }}
                  >
                    {monthOptions.filter((m) => m !== "Extra Bill").map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 6 }}>
                    Extra bills are one-off charges outside the regular monthly cycle.
                  </p>
                </div>
              )}
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
                  House
                </label>
                <input
                  type="text"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none"
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

          <SectionCard
            title="Base Rent"
            subtitle="Monthly rent amount split among all selected roommates"
          >
            <div className="relative">
              <div
                className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ background: "#EEF2FF" }}
              >
                <span style={{ color: "#4F46E5", fontWeight: 700, fontSize: "16px" }}>$</span>
              </div>
              <input
                type="number"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="w-full pl-16 pr-5 py-4 rounded-xl outline-none"
                style={{
                  background: "var(--muted)",
                  border: "2px solid rgba(79,70,229,0.3)",
                  color: "var(--foreground)",
                  fontSize: "24px",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#4F46E5";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(79,70,229,0.3)";
                }}
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                per month
              </span>
            </div>
          </SectionCard>

          <SectionCard
            title="Additional Expenses"
            subtitle="Add utilities, services, and other shared costs"
          >
            <div className="space-y-2.5 mb-4">
              {expenses.map((exp, idx) => (
                <div
                  key={exp.id}
                  className="rounded-xl p-3"
                  style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs text-white"
                      style={{ background: `hsl(${(idx * 47) % 360}, 60%, 55%)` }}
                    >
                      {idx + 1}
                    </div>
                    <select
                      value={exp.category}
                      onChange={(e) => updateExpense(exp.id, "category", e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-lg outline-none appearance-none"
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        color: "var(--foreground)",
                        fontSize: "12px",
                      }}
                    >
                      {expenseCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeExpense(exp.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{ background: "#FEF2F2" }}
                    >
                      <Trash2 size={12} style={{ color: "#EF4444" }} />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Description"
                      value={exp.name}
                      onChange={(e) => updateExpense(exp.id, "name", e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg outline-none min-w-0"
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        color: "var(--foreground)",
                        fontSize: "12px",
                      }}
                    />
                    <div className="relative w-20 flex-shrink-0">
                      <span
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        style={{ color: "var(--muted-foreground)", fontSize: "12px" }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        placeholder="0"
                        value={exp.amount}
                        onChange={(e) => updateExpense(exp.id, "amount", e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg outline-none"
                        style={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          color: "var(--foreground)",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      />
                    </div>
                    <select
                      value={exp.paidBy}
                      onChange={(e) =>
                        updateExpense(exp.id, "paidBy", parseInt(e.target.value, 10))
                      }
                      className="w-20 sm:w-24 px-2 py-1.5 rounded-lg outline-none appearance-none flex-shrink-0"
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        color: "var(--foreground)",
                        fontSize: "12px",
                      }}
                    >
                      {roommates.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name.split(" ")[0]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <ExpenseMemberSelector
                    roommates={roommates}
                    selectedIds={exp.sharedBy}
                    shareMode={exp.shareMode}
                    onShareModeChange={(mode) =>
                      setExpenses((prev) =>
                        prev.map((item) =>
                          item.id === exp.id ? { ...item, shareMode: mode, sharedBy: [] } : item
                        )
                      )
                    }
                    onSelectedChange={(ids) =>
                      setExpenses((prev) =>
                        prev.map((item) => (item.id === exp.id ? { ...item, sharedBy: ids } : item))
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addExpense}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all border-2 border-dashed"
              style={{
                borderColor: "rgba(79,70,229,0.3)",
                color: "#4F46E5",
                background: "rgba(79,70,229,0.03)",
                fontSize: "13px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#EEF2FF";
                e.currentTarget.style.borderStyle = "solid";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(79,70,229,0.03)";
                e.currentTarget.style.borderStyle = "dashed";
              }}
            >
              <Plus size={15} />
              Add Another Expense
            </button>
          </SectionCard>

          <SectionCard
            title="Monthly Announcement"
            subtitle="Optional notice shown on bill details, public page, and PDF"
          >
            <div className="space-y-4">
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
                  Announcement Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. July Notice"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none"
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
                    marginBottom: 6,
                  }}
                >
                  Announcement Message
                </label>
                <textarea
                  rows={3}
                  placeholder="Please submit rent before the 5th of the month."
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
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

          {parkingSnapshot.assignments.length > 0 && (
            <SectionCard
              title="Parking (from settings)"
              subtitle="Current assignments will be copied into this month's bill"
            >
              <div className="space-y-2">
                {parkingSnapshot.assignments.map((a) => {
                  const member = roommates.find((r) => r.id === a.roommateId);
                  return (
                    <div
                      key={a.spotName}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                    >
                      <div>
                        <div style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 600 }}>
                          {a.spotName}
                        </div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>
                          {member?.name ?? "Unassigned"}
                        </div>
                      </div>
                      <span style={{ color: "#4F46E5", fontWeight: 700, fontSize: "13px" }}>
                        ${a.monthlyFee}/mo
                      </span>
                    </div>
                  );
                })}
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: "#EEF2FF" }}
                >
                  <Info size={13} style={{ color: "#4F46E5" }} />
                  <span style={{ color: "#4F46E5", fontSize: "11px" }}>
                    Parking {parkingSnapshot.parkingIncludedInRent ? "included in" : "added to"} rent
                  </span>
                </div>
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Split Among"
            subtitle="Choose which roommates to include in this bill"
          >
            <div className="flex flex-wrap gap-3">
              {roommates.map((r) => {
                const isSelected = selected.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRoommate(r.id)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-2xl transition-all duration-200"
                    style={{
                      background: isSelected ? r.color + "15" : "var(--muted)",
                      border: `2px solid ${isSelected ? r.color : "var(--border)"}`,
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: isSelected ? r.color : "#94A3B8" }}
                    >
                      {r.initials}
                    </div>
                    <span
                      style={{
                        color: isSelected ? r.color : "var(--muted-foreground)",
                        fontSize: "13px",
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {r.name.split(" ")[0]}
                    </span>
                    {isSelected && <CheckCircle2 size={14} style={{ color: r.color }} />}
                  </button>
                );
              })}
            </div>
            <div
              className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "#EEF2FF" }}
            >
              <Info size={13} style={{ color: "#4F46E5" }} />
              <span style={{ color: "#4F46E5", fontSize: "12px" }}>
                {selected.length} roommates selected — total to collect{" "}
                <strong>${grandTotal.toFixed(2)}</strong>
              </span>
            </div>
          </SectionCard>
        </div>

        <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #1E1B4B 0%, #312E81 50%, #1E3A5F 100%)",
              boxShadow: "0 20px 60px rgba(79,70,229,0.35)",
            }}
          >
            <div
              className="px-6 pt-6 pb-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Calculator size={14} className="text-indigo-300" />
                <span
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  LIVE CALCULATION
                </span>
              </div>
              <div
                className="text-white font-black"
                style={{ fontSize: "36px", letterSpacing: "-1px" }}
              >
                ${grandTotal.toLocaleString()}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
                {billMonth} · {selected.length} roommates
                {roundUp && " · rounded up"}
              </div>
            </div>

            <div className="px-6 py-4 space-y-2.5">
              <div className="flex justify-between">
                <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>
                  🏠 Base Rent
                </span>
                <span className="text-white font-semibold">${rentNum.toLocaleString()}</span>
              </div>
              {expenses
                .filter((e) => e.name || parseFloat(e.amount))
                .map((e) => {
                  const payer = roommates.find((r) => r.id === e.paidBy);
                  return (
                    <div key={e.id} className="flex justify-between items-start">
                      <div>
                        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>
                          {e.name || e.category}
                        </div>
                        {payer && (
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px" }}>
                            Paid by {payer.name.split(" ")[0]}
                          </div>
                        )}
                      </div>
                      <span className="text-white font-semibold">
                        ${parseFloat(e.amount) || 0}
                      </span>
                    </div>
                  );
                })}
              <div className="h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
              <div className="flex justify-between items-center">
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", fontWeight: 600 }}>
                  Total
                </span>
                <span className="text-white font-black" style={{ fontSize: "20px" }}>
                  ${grandTotal.toLocaleString()}
                </span>
              </div>
              <div
                className="flex justify-between items-center px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>
                  To collect
                </span>
                <span style={{ color: "#A5F3FC", fontWeight: 800, fontSize: "18px" }}>
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
              {collectionSummary.parkingFees > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px" }}>
                    🅿️ Parking
                  </span>
                  <span className="text-white font-semibold text-sm">
                    ${collectionSummary.parkingFees.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <button
                type="button"
                onClick={handleCreate}
                disabled={saved}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  background: saved
                    ? "linear-gradient(135deg, #10B981, #059669)"
                    : "white",
                  color: saved ? "white" : "#4F46E5",
                  fontSize: "14px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                  opacity: saved ? 0.9 : 1,
                }}
              >
                {saved ? (
                  <>
                    <CheckCircle2 size={16} /> Bill Created!
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Create & Share Bill
                  </>
                )}
              </button>
            </div>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 20px rgba(79,70,229,0.06)",
            }}
          >
            <h3
              className="mb-4"
              style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "14px" }}
            >
              Split Preview
            </h3>
            <div className="space-y-2.5">
              {breakdown.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "var(--muted)" }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: r.color }}
                  >
                    {r.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}
                    >
                      {r.name.split(" ")[0]}
                    </div>
                    <div style={{ color: "var(--muted-foreground)", fontSize: "10px", marginTop: 2 }}>
                      Rent {formatAmount(r.calc.rentShare, roundUp)}
                      {r.calc.expenseShare > 0 && ` + Exp ${formatAmount(r.calc.expenseShare, roundUp)}`}
                      {r.calc.parkingShare > 0 && ` + Parking ${formatAmount(r.calc.parkingShare, roundUp)}`}
                    </div>
                    {r.paid > 0 && (
                      <div style={{ color: "#10B981", fontSize: "10px" }}>
                        Advanced ${r.paid}
                      </div>
                    )}
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-lg font-bold text-xs text-right"
                    style={{
                      background: r.owes > 0 ? "#FEF2F2" : "#ECFDF5",
                      color: r.owes > 0 ? "#EF4444" : "#10B981",
                    }}
                  >
                    <div>{formatAmount(r.share, roundUp)}</div>
                    <div style={{ fontSize: "9px", fontWeight: 500, opacity: 0.85 }}>
                      {r.owes > 0
                        ? `Owes ${formatAmount(r.owes, roundUp)}`
                        : r.owes < 0
                          ? `Gets ${formatAmount(Math.abs(r.owes), roundUp)}`
                          : "Settled"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 20px rgba(79,70,229,0.06)",
            }}
          >
            <h3
              className="mb-3"
              style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "14px" }}
            >
              Expense Summary
            </h3>
            <div className="space-y-1.5">
              <div className="flex justify-between py-1">
                <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
                  Base rent
                </span>
                <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}>
                  ${rentNum.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
                  Extra expenses
                </span>
                <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}>
                  ${extraTotal.toLocaleString()}
                </span>
              </div>
              <div className="h-px" style={{ background: "var(--border)" }} />
              <div className="flex justify-between py-1">
                <span style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 700 }}>
                  Total To Collect
                </span>
                <span style={{ color: "#4F46E5", fontSize: "15px", fontWeight: 800 }}>
                  ${grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
