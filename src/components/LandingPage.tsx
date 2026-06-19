import {
  Home,
  Users,
  PieChart,
  Link2,
  Shield,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  FileText,
  Zap,
  ChevronRight,
} from "lucide-react";
import {
  demoBill,
  demoExpenses,
  demoHouse,
  demoRent,
  demoTotal,
  getDemoMemberShares,
  openDemoBill,
} from "@/lib/demo";
import { SiteFooter, SITE_URL } from "@/components/SiteFooter";

const features = [
  {
    icon: Users,
    title: "Roommate management",
    desc: "Track who's in each room, contact info, and payment status at a glance.",
    color: "#4F46E5",
    bg: "#EEF2FF",
  },
  {
    icon: FileText,
    title: "Monthly bill builder",
    desc: "Split rent and utilities fairly — add expenses, assign payers, auto-calculate shares.",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    icon: PieChart,
    title: "Analytics & insights",
    desc: "See spending trends, category breakdowns, and who still owes what.",
    color: "#06B6D4",
    bg: "#ECFEFF",
  },
  {
    icon: Link2,
    title: "Shareable bill links",
    desc: "Send a public link so roommates can view and download the bill — no account needed.",
    color: "#EC4899",
    bg: "#FDF2F8",
  },
];

const steps = [
  { n: "01", title: "Create your house", desc: "Sign up and add your property details in seconds." },
  { n: "02", title: "Add roommates & bills", desc: "Invite roommates, build monthly bills, split costs automatically." },
  { n: "03", title: "Share & collect", desc: "Generate a share link, track payments, and keep everyone aligned." },
];

function goLogin() {
  window.location.hash = "#/login";
}

function goRegister() {
  window.location.hash = "#/register";
}

export function LandingPage() {
  const paidCount = demoBill.roommateShares.filter((s) => s.status === "Paid").length;
  const pendingCount = demoBill.roommateShares.length - paidCount;
  const memberShares = getDemoMemberShares();

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#FAFBFF",
        fontFamily: "'Inter', sans-serif",
        color: "#0F0D2A",
      }}
    >
      {/* Nav */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{
          background: "rgba(255,255,255,0.85)",
          borderBottom: "1px solid rgba(79,70,229,0.08)",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => { window.location.hash = "#/"; }}
              className="flex items-center gap-2.5"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                  boxShadow: "0 4px 12px rgba(79,70,229,0.3)",
                }}
              >
                <Home size={18} className="text-white" />
              </div>
              <div className="text-left">
                <span style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "-0.3px", display: "block" }}>Roomly</span>
                <span style={{ fontSize: "10px", color: "#94A3B8" }}>by Otipu</span>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goLogin}
              className="px-4 py-2 rounded-xl font-semibold transition-all hover:opacity-80"
              style={{ color: "#4F46E5", fontSize: "14px" }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={goRegister}
              className="px-4 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                fontSize: "14px",
                boxShadow: "0 4px 14px rgba(79,70,229,0.3)",
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(79,70,229,0.15) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 90% 20%, rgba(124,58,237,0.1) 0%, transparent 60%)",
          }}
        />
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                style={{ background: "#EEF2FF", border: "1px solid rgba(79,70,229,0.15)" }}
              >
                <Sparkles size={14} style={{ color: "#4F46E5" }} />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#4F46E5" }}>
                  Built for shared houses & roommates
                </span>
              </div>
              <h1
                style={{
                  fontWeight: 800,
                  fontSize: "clamp(36px, 5vw, 52px)",
                  lineHeight: 1.1,
                  letterSpacing: "-1.5px",
                  marginBottom: 20,
                }}
              >
                Split rent & bills{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  without the hassle
                </span>
              </h1>
              <p style={{ fontSize: "17px", color: "#64748B", lineHeight: 1.7, maxWidth: 480, marginBottom: 32 }}>
                Roomly helps shared houses split rent, track utilities, and share beautiful bills —
                live at{" "}
                <a href={SITE_URL} style={{ color: "#4F46E5", fontWeight: 600 }}>
                  rent.otipu.com
                </a>
                .
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <button
                  type="button"
                  onClick={goRegister}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-white transition-all hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                    fontSize: "15px",
                    boxShadow: "0 8px 24px rgba(79,70,229,0.35)",
                  }}
                >
                  Create free account
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={openDemoBill}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold transition-all hover:scale-[1.02]"
                  style={{
                    background: "white",
                    color: "#4F46E5",
                    fontSize: "15px",
                    border: "1.5px solid rgba(79,70,229,0.2)",
                    boxShadow: "0 4px 16px rgba(79,70,229,0.08)",
                  }}
                >
                  <Link2 size={18} />
                  View demo bill
                </button>
              </div>
              <div className="flex flex-wrap gap-6">
                {[
                  { label: "5 roommates", sub: "per house" },
                  { label: "$3,450", sub: "demo bill total" },
                  { label: "No card", sub: "free to start" },
                ].map((s) => (
                  <div key={s.label}>
                    <p style={{ fontWeight: 800, fontSize: "20px", letterSpacing: "-0.3px" }}>{s.label}</p>
                    <p style={{ fontSize: "12px", color: "#94A3B8" }}>{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Demo bill preview card */}
            <div
              className="rounded-3xl p-6 relative"
              style={{
                background: "white",
                border: "1px solid rgba(79,70,229,0.12)",
                boxShadow: "0 32px 80px rgba(79,70,229,0.14)",
              }}
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Live demo preview
                  </p>
                  <h3 style={{ fontWeight: 800, fontSize: "22px", marginTop: 4 }}>{demoHouse}</h3>
                  <p style={{ fontSize: "13px", color: "#64748B" }}>{demoBill.month} · {demoBill.selectedRoommateIds.length} roommates</p>
                </div>
                <div
                  className="px-3 py-1.5 rounded-xl"
                  style={{ background: "#EEF2FF", color: "#4F46E5", fontSize: "12px", fontWeight: 700 }}
                >
                  Demo
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: "Total bill", value: `$${demoTotal.toLocaleString()}`, color: "#4F46E5" },
                  { label: "Rent", value: `$${demoRent.toLocaleString()}`, color: "#7C3AED" },
                  { label: "Utilities", value: `$${demoExpenses.toLocaleString()}`, color: "#06B6D4" },
                  { label: "Per person", value: "$690", color: "#10B981" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-3 rounded-2xl"
                    style={{ background: "#F8FAFC", border: "1px solid rgba(79,70,229,0.06)" }}
                  >
                    <p style={{ fontSize: "11px", color: "#94A3B8", marginBottom: 4 }}>{item.label}</p>
                    <p style={{ fontWeight: 800, fontSize: "18px", color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-5">
                {memberShares.map(({ roommate: r, share, status, calc }) => {
                  const statusColor =
                    status === "Paid" ? "#059669" : status === "Partial" ? "#D97706" : "#EF4444";
                  const statusBg =
                    status === "Paid" ? "#ECFDF5" : status === "Partial" ? "#FFFBEB" : "#FEF2F2";
                  return (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-xl"
                      style={{ background: "#F8FAFC" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: r.avatarGrad }}
                          >
                            {r.initials}
                          </div>
                          <div>
                            <p style={{ fontSize: "13px", fontWeight: 600 }}>{r.name}</p>
                            <p style={{ fontSize: "10px", color: "#94A3B8" }}>
                              Rent ${calc.rentShare} · Exp ${calc.expenseShare}
                              {calc.parkingShare > 0 && ` · Parking $${calc.parkingShare}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p style={{ fontSize: "14px", fontWeight: 800, color: "#4F46E5" }}>${share}</p>
                          <span
                            className="px-2 py-0.5 rounded-lg font-semibold"
                            style={{ fontSize: "10px", background: statusBg, color: statusColor }}
                          >
                            {status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={openDemoBill}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                  color: "white",
                  fontSize: "14px",
                }}
              >
                Open full demo bill
                <ChevronRight size={16} />
              </button>
              <p className="text-center mt-3" style={{ fontSize: "11px", color: "#94A3B8" }}>
                {paidCount} paid · {pendingCount} pending — no login required
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20" style={{ background: "white" }}>
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <h2 style={{ fontWeight: 800, fontSize: "32px", letterSpacing: "-0.8px", marginBottom: 12 }}>
              Everything you need to run your house
            </h2>
            <p style={{ color: "#64748B", fontSize: "16px", maxWidth: 520, margin: "0 auto" }}>
              From adding roommates to sharing bills — Roomly keeps shared living organized and transparent.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-3xl transition-all hover:-translate-y-1"
                style={{
                  background: "#FAFBFF",
                  border: "1px solid rgba(79,70,229,0.08)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: f.bg }}
                >
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-14">
            <h2 style={{ fontWeight: 800, fontSize: "32px", letterSpacing: "-0.8px", marginBottom: 12 }}>
              Up and running in minutes
            </h2>
            <p style={{ color: "#64748B", fontSize: "16px" }}>Three simple steps to stress-free bill splitting</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={step.n} className="relative">
                {i < steps.length - 1 && (
                  <div
                    className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px"
                    style={{ background: "linear-gradient(90deg, rgba(79,70,229,0.3), transparent)" }}
                  />
                )}
                <div
                  className="p-7 rounded-3xl h-full"
                  style={{
                    background: "white",
                    border: "1px solid rgba(79,70,229,0.1)",
                    boxShadow: "0 8px 32px rgba(79,70,229,0.06)",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "28px",
                      background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {step.n}
                  </span>
                  <h3 style={{ fontWeight: 700, fontSize: "17px", marginTop: 12, marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: "14px", color: "#64748B", lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / benefits */}
      <section className="py-16" style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}>
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 style={{ fontWeight: 800, fontSize: "28px", color: "white", letterSpacing: "-0.5px", marginBottom: 16 }}>
                Transparent bills everyone can trust
              </h2>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "15px", lineHeight: 1.7, marginBottom: 24 }}>
                Share a public link with your roommates so they can see exactly how the bill was calculated —
                rent, utilities, and individual shares included.
              </p>
              <button
                type="button"
                onClick={openDemoBill}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all hover:scale-[1.02]"
                style={{ background: "white", color: "#4F46E5", fontSize: "14px" }}
              >
                <Zap size={16} />
                Try the demo bill now
              </button>
            </div>
            <div className="space-y-3">
              {[
                "Auto-split rent and expenses across roommates",
                "Track paid, partial, and pending payments",
                "Export and print bills for records",
                "Secure accounts with database-backed storage",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 size={18} style={{ color: "rgba(255,255,255,0.9)", flexShrink: 0 }} />
                  <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              boxShadow: "0 8px 24px rgba(79,70,229,0.35)",
            }}
          >
            <Shield size={24} className="text-white" />
          </div>
          <h2 style={{ fontWeight: 800, fontSize: "32px", letterSpacing: "-0.8px", marginBottom: 12 }}>
            Ready to simplify your house?
          </h2>
          <p style={{ color: "#64748B", fontSize: "16px", marginBottom: 32 }}>
            Join Roomly free — or explore the demo bill first to see how it works.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={goRegister}
              className="px-7 py-3.5 rounded-2xl font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                fontSize: "15px",
                boxShadow: "0 8px 24px rgba(79,70,229,0.35)",
              }}
            >
              Sign up free
            </button>
            <button
              type="button"
              onClick={goLogin}
              className="px-7 py-3.5 rounded-2xl font-bold"
              style={{
                background: "white",
                color: "#4F46E5",
                fontSize: "15px",
                border: "1.5px solid rgba(79,70,229,0.2)",
              }}
            >
              Sign in
            </button>
          </div>
        </div>
      </section>

      <SiteFooter variant="landing" />
    </div>
  );
}
