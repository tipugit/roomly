import { useState, useEffect, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  Calculator,
  CheckCircle2,
  Check,
  Info,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ExpenseMemberSelector } from "@/components/ExpenseMemberSelector";
import type { DefaultBillExpense, Expense, ParkingAssignment, Settings } from "@/types";
import { formatMonthYear, isRoommateEligibleForBill } from "@/lib/memberDates";
import { MemberCalculationPanel } from "@/components/MemberCalculationPanel";
import {
  buildParkingSnapshotFromSettings,
  buildMemberShareBreakdown,
  buildMemberCalculationSteps,
  buildRoommateShares,
  calcCollectionSummary,
  formatAmount,
  formatParkingShareLabel,
  getMemberAmountDue,
  getParkingShareMemberIds,
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

interface FormExpense {
  id: number;
  name: string;
  amount: string;
  paidBy: number | null;
  category: string;
  shareMode: "all" | "selected";
  sharedBy: number[];
}

function cloneParkingAssignments(assignments: ParkingAssignment[] = []): ParkingAssignment[] {
  return assignments.map((a) => ({
    spotName: a.spotName,
    roommateId: a.roommateId ?? null,
    monthlyFee: a.monthlyFee,
    active: a.active,
    shareSpace: a.shareSpace ?? false,
    sharedBy: [...(a.sharedBy ?? [])],
  }));
}

function buildMonthOptions(): string[] {
  const year = new Date().getFullYear();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return [...months.map((m) => `${m} ${year}`), "Extra Bill"];
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
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
        <h3 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>{title}</h3>
        {subtitle && <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

const monthOptions = buildMonthOptions();

function buildExpensesFromSettings(settings: Settings): FormExpense[] {
  const templates: DefaultBillExpense[] =
    settings.defaultBillExpenses?.length > 0
      ? settings.defaultBillExpenses
      : [
          { name: "Internet", amount: 80, category: "Internet", shareMode: "all" },
          { name: "Electricity", amount: 120, category: "Electricity", shareMode: "all" },
          { name: "Water", amount: 60, category: "Water", shareMode: "all" },
        ];
  return templates.map((t, i) => ({
    id: i + 1,
    name: t.name,
    amount: String(t.amount),
    paidBy: null,
    category: t.category,
    shareMode: t.shareMode ?? "all",
    sharedBy: [],
  }));
}

function ParkingToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
      style={{
        background: on ? "#4F46E5" : "var(--muted)",
        border: `2px solid ${on ? "#4F46E5" : "var(--border)"}`,
      }}
    >
      <div
        className="absolute w-4 h-4 rounded-full bg-white shadow-sm transition-all"
        style={{ top: 2, left: on ? "calc(100% - 18px)" : 2 }}
      />
    </button>
  );
}

export function BillCreationPage({ onCreated }: { onCreated?: (billId?: string) => void }) {
  const {
    roommates,
    settings,
    createBill,
    updateBill,
    showToast,
    editingBill,
    editingBillId,
    setEditingBill,
    clearEditingBillSession,
  } = useApp();

  const defaultMonth = formatMonthYear();
  const [month, setMonth] = useState(defaultMonth);
  const [extraBillMonth, setExtraBillMonth] = useState(defaultMonth);
  const isExtraBill = month === "Extra Bill";
  const [billTitle, setBillTitle] = useState(defaultMonth);
  const [houseName, setHouseName] = useState(settings.houseName);
  const [rent, setRent] = useState(() => String(settings.defaultRent ?? 3000));
  const [expenses, setExpenses] = useState<FormExpense[]>(() => buildExpensesFromSettings(settings));
  const [includeParking, setIncludeParking] = useState(true);
  const [parkingAssignments, setParkingAssignments] = useState<ParkingAssignment[]>(() =>
    cloneParkingAssignments(buildParkingSnapshotFromSettings(settings)?.assignments ?? [])
  );
  const [selected, setSelected] = useState<number[]>(() =>
    roommates.filter((r) => r.status === "Active").map((r) => r.id)
  );
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
        paidBy: null,
        category: "Other",
        shareMode: "all",
        sharedBy: [],
      },
    ]);

  const removeExpense = (id: number) =>
    setExpenses((prev) => prev.filter((e) => e.id !== id));

  const updateExpense = (id: number, field: keyof FormExpense, value: string | number | null) =>
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );

  const toggleRoommate = (id: number) => {
    setSelected((prev) => {
      const removing = prev.includes(id);
      const next = removing ? prev.filter((i) => i !== id) : [...prev, id];
      if (removing) {
        setExpenses((exps) =>
          exps.map((e) => (e.paidBy === id ? { ...e, paidBy: null } : e))
        );
      }
      return next;
    });
  };

  const updateParkingAssignment = (index: number, patch: Partial<ParkingAssignment>) => {
    setParkingAssignments((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const billMonth = isExtraBill ? `Extra Bill — ${extraBillMonth}` : month;

  useEffect(() => {
    if (isExtraBill) {
      setBillTitle(`Extra Bill — ${extraBillMonth}`);
    } else {
      setBillTitle(month);
    }
  }, [month, extraBillMonth, isExtraBill]);

  useEffect(() => {
    const eligible = roommates
      .filter((r) => isRoommateEligibleForBill(r, billMonth))
      .map((r) => r.id);
    setSelected((prev) => {
      const next = prev.filter((id) => eligible.includes(id));
      const removed = prev.filter((id) => !eligible.includes(id));
      if (removed.length > 0) {
        setExpenses((exps) =>
          exps.map((e) => (e.paidBy && removed.includes(e.paidBy) ? { ...e, paidBy: null } : e))
        );
      }
      return next.length > 0 ? next : eligible;
    });
  }, [billMonth, roommates]);

  useEffect(() => {
    if (!editingBill) return;
    const isExtra = editingBill.isExtraBill ?? editingBill.month.startsWith("Extra Bill");
    if (isExtra) {
      setMonth("Extra Bill");
      setExtraBillMonth(editingBill.month.replace(/^Extra Bill\s*—\s*/, ""));
    } else {
      setMonth(editingBill.month);
    }
    setBillTitle(editingBill.title || editingBill.month);
    setHouseName(editingBill.houseName);
    setRent(String(editingBill.rent));
    setExpenses(
      editingBill.expenses.map((e) => ({
        id: e.id,
        name: e.name,
        amount: String(e.amount),
        paidBy: e.paidBy ?? null,
        category: e.category,
        shareMode: e.shareMode ?? "all",
        sharedBy: e.sharedBy ?? [],
      }))
    );
    setSelected(editingBill.selectedRoommateIds);
    setAnnouncementTitle(editingBill.announcementTitle ?? "");
    setAnnouncementMessage(editingBill.announcementMessage ?? "");
    setIncludeParking(!!editingBill.parkingSnapshot?.assignments?.length);
    setParkingAssignments(
      cloneParkingAssignments(
        editingBill.parkingSnapshot?.assignments ??
          buildParkingSnapshotFromSettings(settings)?.assignments ??
          []
      )
    );
    setEditingBill(null);
  }, [editingBill, setEditingBill, settings]);

  useEffect(() => {
    if (editingBillId) return;
    setParkingAssignments(cloneParkingAssignments(buildParkingSnapshotFromSettings(settings)?.assignments ?? []));
  }, [settings, editingBillId]);

  useEffect(() => {
    setParkingAssignments((prev) =>
      prev.map((assignment) => {
        const roommateId = assignment.roommateId && selected.includes(assignment.roommateId)
          ? assignment.roommateId
          : null;
        const sharedBy = (assignment.sharedBy ?? []).filter((id) => selected.includes(id));
        return {
          ...assignment,
          roommateId,
          sharedBy: assignment.shareSpace ? sharedBy : [],
        };
      })
    );
  }, [selected]);

  const rentNum = parseFloat(rent) || 0;
  const extraTotal = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const parkingSnapshot = includeParking
    ? {
        totalSpots: parkingAssignments.length,
        parkingIncludedInRent: settings.parkingIncludedInRent ?? false,
        assignments: cloneParkingAssignments(parkingAssignments),
      }
    : null;

  const parsedExpenses: Expense[] = expenses.map((e) => ({
    id: e.id,
    name: e.name || e.category,
    amount: parseFloat(e.amount) || 0,
    paidBy: e.paidBy ?? undefined,
    category: e.category,
    shareMode: e.shareMode,
    sharedBy: e.shareMode === "selected" ? e.sharedBy : undefined,
  }));

  const roundUp = settings.roundUpAmounts ?? false;

  const eligibleRoommates = roommates.filter((r) => isRoommateEligibleForBill(r, billMonth));

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
  const collectionSummary = calcCollectionSummary(previewBill, roommateShares, roundUp);
  const grandTotal = collectionSummary.totalToCollect;

  const breakdown = roommateShares.map((rs) => {
    const r = roommates.find((rm) => rm.id === rs.roommateId)!;
    const amountDue = getMemberAmountDue(rs, roundUp);
    const calc = buildMemberShareBreakdown(
      rs.roommateId,
      selected,
      rentNum,
      parsedExpenses,
      parkingSnapshot,
      roundUp
    );
    const calcLines = buildMemberCalculationSteps(
      rs.roommateId,
      rentNum,
      parsedExpenses,
      selected,
      parkingSnapshot,
      roommates,
      rs.paid,
      roundUp
    );
    return { ...r, paid: rs.paid, amountDue, share: rs.share, calc, calcLines };
  });

  const handleSave = async () => {
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

    const payload = {
      title: billTitle.trim() || billMonth,
      month: billMonth,
      houseName: houseName.trim(),
      rent: rentNum,
      expenses: parsedExpenses,
      selectedRoommateIds: selected,
      announcementTitle: announcementTitle.trim(),
      announcementMessage: announcementMessage.trim(),
      parkingSnapshot,
      isExtraBill,
    };

    if (editingBillId) {
      const id = editingBillId;
      const ok = await updateBill(id, payload);
      if (ok) {
        setSaved(true);
        clearEditingBillSession();
        onCreated?.(id);
      }
      return;
    }

    const bill = await createBill(payload);
    if (bill) {
      setSaved(true);
      onCreated?.(bill.id);
    }
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
            {editingBillId ? "Edit Bill" : "Create Monthly Bill"}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>
            {editingBillId ? "Update this bill and save changes" : "Build, split and share house expenses"}
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0"
          style={{ background: "var(--status-info-bg)", border: "1px solid var(--action-primary-border)" }}
        >
          <Sparkles size={13} style={{ color: "var(--status-info-text)" }} />
          <span style={{ color: "var(--status-info-text)", fontSize: "11px", fontWeight: 600 }}>
            Auto-split
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          <SectionCard title="Billing Period" subtitle="Set the bill title and billing month">
            <div className="space-y-4">
              <div>
                <label style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Bill Title
                </label>
                <input
                  type="text"
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  placeholder={billMonth}
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{ background: "var(--muted)", border: "1.5px solid var(--border)", color: "var(--foreground)", fontSize: "13px" }}
                />
                <p style={{ color: "var(--muted-foreground)", fontSize: "10px", marginTop: 4 }}>
                  Defaults to the selected month — change to any label you like
                </p>
              </div>
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
            subtitle="Utilities and shared costs — set amount, who paid upfront, and who splits each item"
          >
            <div
              className="flex gap-2.5 p-3 rounded-xl mb-4"
              style={{ background: "#EEF2FF", border: "1px solid rgba(79,70,229,0.15)" }}
            >
              <Info size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#4F46E5" }} />
              <p style={{ color: "#4338CA", fontSize: "11px", lineHeight: 1.5, margin: 0 }}>
                Each expense has three parts: <strong>Amount</strong> to split, <strong>Paid by</strong> (who already paid — leave Unpaid if nobody has), and <strong>Who shares</strong> (all bill members or selected only). Rent is split separately above.
              </p>
            </div>
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
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1 min-w-0">
                      <label style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600, display: "block", marginBottom: 4 }}>
                        DESCRIPTION
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Internet bill"
                        value={exp.name}
                        onChange={(e) => updateExpense(exp.id, "name", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg outline-none"
                        style={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          color: "var(--foreground)",
                          fontSize: "12px",
                        }}
                      />
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <label style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600, display: "block", marginBottom: 4 }}>
                        AMOUNT
                      </label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>$</span>
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
                    </div>
                    <div className="w-32 sm:w-36 flex-shrink-0">
                      <label style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600, display: "block", marginBottom: 4 }}>
                        PAID BY
                      </label>
                      <select
                        value={exp.paidBy ?? ""}
                        onChange={(e) =>
                          updateExpense(
                            exp.id,
                            "paidBy",
                            e.target.value === "" ? null : parseInt(e.target.value, 10)
                          )
                        }
                        className="w-full px-2 py-1.5 rounded-lg outline-none appearance-none"
                        style={{
                          background: exp.paidBy ? "#ECFDF5" : "#FEF2F2",
                          border: `1px solid ${exp.paidBy ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.2)"}`,
                          color: "var(--foreground)",
                          fontSize: "12px",
                        }}
                      >
                        <option value="">Unpaid</option>
                        {selected.map((id) => {
                          const r = roommates.find((rm) => rm.id === id);
                          if (!r) return null;
                          return (
                            <option key={r.id} value={r.id}>
                              {r.name.split(" ")[0]}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                  <p style={{ color: "var(--muted-foreground)", fontSize: "10px", marginTop: 6, marginBottom: 0 }}>
                    Who already paid this expense upfront? Leave as Unpaid if nobody has paid yet.
                  </p>
                  <ExpenseMemberSelector
                    roommates={selected.map((id) => roommates.find((r) => r.id === id)!).filter(Boolean)}
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

          <SectionCard
            title="Parking"
            subtitle="Include parking spot fees from settings in this bill's calculation"
          >
            <div
              className="flex items-center justify-between gap-4 p-4 rounded-xl"
              style={{ background: includeParking ? "#EEF2FF" : "var(--muted)", border: `1px solid ${includeParking ? "rgba(79,70,229,0.2)" : "var(--border)"}` }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px" }}>Calculate parking</div>
                <p style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 4, lineHeight: 1.4 }}>
                  {includeParking
                    ? "Parking assignments from Settings will be split among members"
                    : "Parking fees are excluded from this bill"}
                </p>
              </div>
              <ParkingToggle on={includeParking} onToggle={() => setIncludeParking((p) => !p)} />
            </div>
          </SectionCard>

          {includeParking && parkingSnapshot && parkingSnapshot.assignments.length > 0 && (
            <SectionCard
              title="Parking assignments"
              subtitle="Edit parking for this bill without changing your saved settings"
            >
              <div className="space-y-2">
                {parkingSnapshot.assignments.map((a, idx) => {
                  const member = roommates.find((r) => r.id === a.roommateId);
                  const shareLabel = formatParkingShareLabel(a, selected, roommates);
                  const sharers = getParkingShareMemberIds(a, selected);
                  const perPerson = sharers.length > 0 ? a.monthlyFee / sharers.length : 0;
                  return (
                    <div
                      key={a.spotName}
                      className="p-3 rounded-xl"
                      style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <div>
                          <label style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600, display: "block", marginBottom: 4 }}>
                            SPOT NAME
                          </label>
                          <input
                            type="text"
                            value={a.spotName}
                            onChange={(e) => updateParkingAssignment(idx, { spotName: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg outline-none"
                            style={{
                              background: "var(--card)",
                              border: "1px solid var(--border)",
                              color: "var(--foreground)",
                              fontSize: "12px",
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600, display: "block", marginBottom: 4 }}>
                            ASSIGNED TO
                          </label>
                          <select
                            value={a.roommateId ?? ""}
                            onChange={(e) =>
                              updateParkingAssignment(idx, {
                                roommateId: e.target.value ? parseInt(e.target.value, 10) : null,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg outline-none appearance-none"
                            style={{
                              background: "var(--card)",
                              border: "1px solid var(--border)",
                              color: "var(--foreground)",
                              fontSize: "12px",
                            }}
                          >
                            <option value="">Unassigned</option>
                            {selected.map((id) => {
                              const roommate = roommates.find((rm) => rm.id === id);
                              if (!roommate) return null;
                              return (
                                <option key={roommate.id} value={roommate.id}>
                                  {roommate.name}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div>
                          <label style={{ color: "var(--muted-foreground)", fontSize: "10px", fontWeight: 600, display: "block", marginBottom: 4 }}>
                            MONTHLY FEE
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={a.monthlyFee}
                              onChange={(e) =>
                                updateParkingAssignment(idx, {
                                  monthlyFee: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full pl-7 pr-3 py-2 rounded-lg outline-none"
                              style={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                color: "var(--foreground)",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}>
                            {member?.name ?? "Unassigned"}
                          </div>
                          <div style={{ color: "var(--muted-foreground)", fontSize: "10px" }}>
                            {a.active ? "Included in this bill" : "Excluded from this bill"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span style={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: 600 }}>
                            Active
                          </span>
                          <ParkingToggle
                            on={a.active}
                            onToggle={() => updateParkingAssignment(idx, { active: !a.active })}
                          />
                        </div>
                      </div>
                      {a.shareSpace && selected.length > 0 && (
                        <div className="mt-2 px-2.5 py-1.5 rounded-lg" style={{ background: "#ECFDF5" }}>
                          <p style={{ color: "#059669", fontSize: "10px", fontWeight: 600 }}>
                            Share Space — {shareLabel}
                          </p>
                          <p style={{ color: "#64748B", fontSize: "10px", marginTop: 2 }}>
                            ${perPerson.toFixed(2)} per selected member
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {selected.map((id) => {
                              const roommate = roommates.find((rm) => rm.id === id);
                              if (!roommate) return null;
                              const checked = (a.sharedBy ?? []).includes(id);
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() =>
                                    updateParkingAssignment(idx, {
                                      sharedBy: checked
                                        ? (a.sharedBy ?? []).filter((memberId) => memberId !== id)
                                        : [...(a.sharedBy ?? []), id],
                                    })
                                  }
                                  className="px-2 py-1 rounded-full"
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    background: checked ? "#059669" : "white",
                                    color: checked ? "white" : "#64748B",
                                    border: `1px solid ${checked ? "#059669" : "rgba(100,116,139,0.2)"}`,
                                  }}
                                >
                                  {roommate.name.split(" ")[0]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {!a.shareSpace && (
                        <p style={{ color: "var(--muted-foreground)", fontSize: "10px", marginTop: 8 }}>
                          Exclusive spot — assigned member pays the full fee
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            updateParkingAssignment(idx, {
                              shareSpace: !a.shareSpace,
                              sharedBy: !a.shareSpace ? selected : [],
                            })
                          }
                          className="px-3 py-1.5 rounded-lg font-semibold"
                          style={{
                            background: a.shareSpace ? "#ECFDF5" : "#EEF2FF",
                            color: a.shareSpace ? "#059669" : "#4F46E5",
                            fontSize: "11px",
                          }}
                        >
                          {a.shareSpace ? "Shared spot" : "Make shared"}
                        </button>
                        <span style={{ color: "#4F46E5", fontWeight: 700, fontSize: "13px" }}>
                          ${a.monthlyFee}/mo
                        </span>
                      </div>
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
            subtitle="Active members eligible for this billing period"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {eligibleRoommates.map((r) => {
                const isSelected = selected.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRoommate(r.id)}
                    className="flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all text-left"
                    style={{
                      background: isSelected ? r.color + "12" : "var(--muted)",
                      border: `2px solid ${isSelected ? r.color : "var(--border)"}`,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isSelected ? r.color : "var(--card)",
                        border: isSelected ? "none" : "1.5px solid var(--border)",
                      }}
                    >
                      {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="min-w-0">
                      <div style={{ color: isSelected ? r.color : "var(--foreground)", fontSize: "12px", fontWeight: isSelected ? 700 : 500 }} className="truncate">
                        {r.name.split(" ")[0]}
                      </div>
                      <div style={{ color: "var(--muted-foreground)", fontSize: "9px" }}>Room {r.room}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {roommates.length > eligibleRoommates.length && (
              <p style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: 8 }}>
                {roommates.length - eligibleRoommates.length} member(s) hidden — inactive or not yet joined for this month
              </p>
            )}
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
                  const payer = e.paidBy ? roommates.find((r) => r.id === e.paidBy) : null;
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
                onClick={handleSave}
                disabled={saved}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  background: saved
                    ? "linear-gradient(135deg, #10B981, #059669)"
                    : "white",
                  color: saved ? "white" : "#4F46E5",
                  fontSize: "16px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                  opacity: saved ? 0.9 : 1,
                }}
              >
                {saved ? (
                  <>
                    <CheckCircle2 size={16} />
                    {editingBillId ? "Bill Updated!" : "Bill Created!"}
                  </>
                ) : (
                  <>
                    <Calculator size={16} />
                    {editingBillId ? "Save Changes" : "Create Bill"}
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
            <div className="space-y-3">
              {breakdown.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl overflow-hidden"
                  style={{ background: "var(--muted)", border: `1.5px solid ${r.color}40` }}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: r.color }}
                    >
                      {r.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 600 }}>
                        {r.name.split(" ")[0]}
                      </div>
                      <div style={{ color: "var(--muted-foreground)", fontSize: "10px", marginTop: 2 }}>
                        Room {r.room}
                      </div>
                    </div>
                    <div
                      className="px-2.5 py-1 rounded-lg font-bold text-xs text-right flex-shrink-0"
                      style={{
                        background: r.amountDue > 0 ? "#FEF2F2" : "#ECFDF5",
                        color: r.amountDue > 0 ? "#EF4444" : "#10B981",
                      }}
                    >
                      <div>{formatAmount(r.amountDue, roundUp)}</div>
                      <div style={{ fontSize: "9px", fontWeight: 500, opacity: 0.85 }}>
                        {r.amountDue > 0 ? "Still owed" : "Settled"}
                      </div>
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    <MemberCalculationPanel lines={r.calcLines} roundUp={roundUp} accentColor={r.color} />
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
