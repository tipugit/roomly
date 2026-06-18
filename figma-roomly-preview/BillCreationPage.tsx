import { useState, useEffect } from "react";
import { Plus, Trash2, Calculator, CheckCircle2, Info, Sparkles, ArrowRight } from "lucide-react";

const allRoommates = [
  { id: 1, name: "Alex Johnson", initials: "AJ", color: "#4F46E5" },
  { id: 2, name: "Sarah Williams", initials: "SW", color: "#06B6D4" },
  { id: 3, name: "Marcus Chen", initials: "MC", color: "#10B981" },
  { id: 4, name: "Emma Davis", initials: "ED", color: "#F59E0B" },
  { id: 5, name: "James Wilson", initials: "JW", color: "#8B5CF6" },
];

interface Expense {
  id: number;
  name: string;
  amount: string;
  paidBy: number;
  category: string;
}

const expenseCategories = ["Internet", "Electricity", "Water", "Cleaning", "Supplies", "Groceries", "Other"];

export function BillCreationPage({ onNavigate }: { onNavigate?: (p: string) => void }) {
  const [month, setMonth] = useState("June 2026");
  const [rent, setRent] = useState("3000");
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: 1, name: "Internet", amount: "80", paidBy: 2, category: "Internet" },
    { id: 2, name: "Electricity", amount: "120", paidBy: 1, category: "Electricity" },
    { id: 3, name: "Water", amount: "60", paidBy: 3, category: "Water" },
    { id: 4, name: "Cleaning", amount: "150", paidBy: 4, category: "Cleaning" },
    { id: 5, name: "Supplies", amount: "40", paidBy: 5, category: "Supplies" },
  ]);
  const [selected, setSelected] = useState<number[]>([1, 2, 3, 4, 5]);
  const [saved, setSaved] = useState(false);

  const addExpense = () =>
    setExpenses(prev => [...prev, { id: Date.now(), name: "", amount: "", paidBy: 1, category: "Other" }]);

  const removeExpense = (id: number) => setExpenses(prev => prev.filter(e => e.id !== id));

  const updateExpense = (id: number, field: keyof Expense, value: string | number) =>
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

  const toggleRoommate = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const rentNum = parseFloat(rent) || 0;
  const extraTotal = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const grandTotal = rentNum + extraTotal;
  const perPerson = selected.length > 0 ? grandTotal / selected.length : 0;

  const breakdown = allRoommates.filter(r => selected.includes(r.id)).map(r => {
    const paid = expenses.filter(e => e.paidBy === r.id).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const owes = perPerson - paid;
    return { ...r, paid, owes, net: owes };
  });

  const SectionCard = ({ title, subtitle, children }: any) => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 20px rgba(79,70,229,0.06)" }}
    >
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)", background: "var(--muted)" }}>
        <h3 style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "15px" }}>{title}</h3>
        {subtitle && <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 style={{ color: "var(--foreground)", fontWeight: 800, fontSize: "clamp(20px, 5vw, 26px)", letterSpacing: "-0.5px" }}>Create Monthly Bill</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "12px", marginTop: 2 }}>Build, split and share house expenses</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0" style={{ background: "#EEF2FF", border: "1px solid rgba(79,70,229,0.2)" }}>
          <Sparkles size={13} style={{ color: "#4F46E5" }} />
          <span style={{ color: "#4F46E5", fontSize: "11px", fontWeight: 600 }}>Auto-split</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* ── LEFT FORM ── */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {/* Month */}
          <SectionCard title="Billing Period" subtitle="Select the month for this bill">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>Month</label>
                <select
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none appearance-none"
                  style={{ background: "var(--muted)", border: "1.5px solid var(--border)", color: "var(--foreground)", fontSize: "13px" }}
                >
                  {["January 2026", "February 2026", "March 2026", "April 2026", "May 2026", "June 2026"].map(m => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600, display: "block", marginBottom: 6 }}>House</label>
                <input
                  type="text"
                  defaultValue="Sunset House"
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{ background: "var(--muted)", border: "1.5px solid var(--border)", color: "var(--foreground)", fontSize: "13px" }}
                />
              </div>
            </div>
          </SectionCard>

          {/* Rent */}
          <SectionCard title="Base Rent" subtitle="Monthly rent amount split among all selected roommates">
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
                onChange={e => setRent(e.target.value)}
                className="w-full pl-16 pr-5 py-4 rounded-xl outline-none"
                style={{
                  background: "var(--muted)",
                  border: "2px solid rgba(79,70,229,0.3)",
                  color: "var(--foreground)",
                  fontSize: "24px",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                }}
                onFocus={e => (e.target.style.borderColor = "#4F46E5")}
                onBlur={e => (e.target.style.borderColor = "rgba(79,70,229,0.3)")}
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >per month</span>
            </div>
          </SectionCard>

          {/* Additional expenses */}
          <SectionCard title="Additional Expenses" subtitle="Add utilities, services, and other shared costs">
            <div className="space-y-2.5 mb-4">
              {expenses.map((exp, idx) => (
                <div
                  key={exp.id}
                  className="rounded-xl p-3"
                  style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  {/* Top row: number + category + delete */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs text-white"
                      style={{ background: `hsl(${(idx * 47) % 360}, 60%, 55%)` }}
                    >{idx + 1}</div>
                    <select
                      value={exp.category}
                      onChange={e => updateExpense(exp.id, "category", e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-lg outline-none appearance-none"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "12px" }}
                    >
                      {expenseCategories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <button
                      onClick={() => removeExpense(exp.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{ background: "#FEF2F2" }}
                    >
                      <Trash2 size={12} style={{ color: "#EF4444" }} />
                    </button>
                  </div>
                  {/* Bottom row: name + amount + paidBy */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Description"
                      value={exp.name}
                      onChange={e => updateExpense(exp.id, "name", e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg outline-none min-w-0"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "12px" }}
                    />
                    <div className="relative w-20 flex-shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>$</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={exp.amount}
                        onChange={e => updateExpense(exp.id, "amount", e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg outline-none"
                        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}
                      />
                    </div>
                    <select
                      value={exp.paidBy}
                      onChange={e => updateExpense(exp.id, "paidBy", parseInt(e.target.value))}
                      className="w-20 sm:w-24 px-2 py-1.5 rounded-lg outline-none appearance-none flex-shrink-0"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "12px" }}
                    >
                      {allRoommates.map(r => <option key={r.id} value={r.id}>{r.name.split(" ")[0]}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addExpense}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all border-2 border-dashed"
              style={{ borderColor: "rgba(79,70,229,0.3)", color: "#4F46E5", background: "rgba(79,70,229,0.03)", fontSize: "13px" }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#EEF2FF";
                e.currentTarget.style.borderStyle = "solid";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(79,70,229,0.03)";
                e.currentTarget.style.borderStyle = "dashed";
              }}
            >
              <Plus size={15} />
              Add Another Expense
            </button>
          </SectionCard>

          {/* Roommate selection */}
          <SectionCard title="Split Among" subtitle="Choose which roommates to include in this bill">
            <div className="flex flex-wrap gap-3">
              {allRoommates.map(r => {
                const isSelected = selected.includes(r.id);
                return (
                  <button
                    key={r.id}
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
                    >{r.initials}</div>
                    <span style={{ color: isSelected ? r.color : "var(--muted-foreground)", fontSize: "13px", fontWeight: isSelected ? 600 : 400 }}>
                      {r.name.split(" ")[0]}
                    </span>
                    {isSelected && <CheckCircle2 size={14} style={{ color: r.color }} />}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#EEF2FF" }}>
              <Info size={13} style={{ color: "#4F46E5" }} />
              <span style={{ color: "#4F46E5", fontSize: "12px" }}>
                {selected.length} roommates selected — each owes <strong>${perPerson.toFixed(2)}</strong>
              </span>
            </div>
          </SectionCard>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="space-y-4">
          {/* Live calc card */}
          <div
            className="rounded-2xl overflow-hidden sticky top-0"
            style={{
              background: "linear-gradient(160deg, #1E1B4B 0%, #312E81 50%, #1E3A5F 100%)",
              boxShadow: "0 20px 60px rgba(79,70,229,0.35)",
            }}
          >
            <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Calculator size={14} className="text-indigo-300" />
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: 500 }}>LIVE CALCULATION</span>
              </div>
              <div className="text-white font-black" style={{ fontSize: "36px", letterSpacing: "-1px" }}>
                ${grandTotal.toLocaleString()}
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>{month} · {selected.length} roommates</div>
            </div>

            <div className="px-6 py-4 space-y-2.5">
              <div className="flex justify-between">
                <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>🏠 Base Rent</span>
                <span className="text-white font-semibold">${rentNum.toLocaleString()}</span>
              </div>
              {expenses.filter(e => e.name).map(e => {
                const payer = allRoommates.find(r => r.id === e.paidBy);
                return (
                  <div key={e.id} className="flex justify-between items-start">
                    <div>
                      <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>{e.name || e.category}</div>
                      {payer && <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px" }}>Paid by {payer.name.split(" ")[0]}</div>}
                    </div>
                    <span className="text-white font-semibold">${parseFloat(e.amount) || 0}</span>
                  </div>
                );
              })}
              <div className="h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
              <div className="flex justify-between items-center">
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", fontWeight: 600 }}>Total</span>
                <span className="text-white font-black" style={{ fontSize: "20px" }}>${grandTotal.toLocaleString()}</span>
              </div>
              <div
                className="flex justify-between items-center px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px" }}>Per person ({selected.length})</span>
                <span style={{ color: "#A5F3FC", fontWeight: 800, fontSize: "18px" }}>${perPerson.toFixed(2)}</span>
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => setSaved(true)}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  background: saved ? "linear-gradient(135deg, #10B981, #059669)" : "white",
                  color: saved ? "white" : "#4F46E5",
                  fontSize: "14px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                }}
              >
                {saved ? <><CheckCircle2 size={16} /> Bill Created!</> : <><Sparkles size={15} /> Create & Share Bill</>}
              </button>
            </div>
          </div>

          {/* Per-roommate breakdown */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 20px rgba(79,70,229,0.06)" }}
          >
            <h3 className="mb-4" style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "14px" }}>Split Preview</h3>
            <div className="space-y-2.5">
              {breakdown.map(r => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "var(--muted)" }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: r.color }}
                  >{r.initials}</div>
                  <div className="flex-1 min-w-0">
                    <div style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}>{r.name.split(" ")[0]}</div>
                    {r.paid > 0 && <div style={{ color: "#10B981", fontSize: "10px" }}>Advanced ${r.paid}</div>}
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-lg font-bold text-xs"
                    style={{
                      background: r.owes > 0 ? "#FEF2F2" : "#ECFDF5",
                      color: r.owes > 0 ? "#EF4444" : "#10B981",
                    }}
                  >
                    {r.owes > 0 ? `Owes $${r.owes.toFixed(0)}` : `Gets $${Math.abs(r.owes).toFixed(0)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expense summary */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 2px 20px rgba(79,70,229,0.06)" }}
          >
            <h3 className="mb-3" style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "14px" }}>Expense Summary</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between py-1">
                <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>Base rent</span>
                <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}>${rentNum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>Extra expenses</span>
                <span style={{ color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}>${extraTotal.toLocaleString()}</span>
              </div>
              <div className="h-px" style={{ background: "var(--border)" }} />
              <div className="flex justify-between py-1">
                <span style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 700 }}>Grand Total</span>
                <span style={{ color: "#4F46E5", fontSize: "15px", fontWeight: 800 }}>${grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
