import { useState } from "react";
import { Home, Mail, Lock, User, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

interface AuthPageProps {
  mode?: "login" | "register";
}

export function AuthPage({ mode: initialMode = "login" }: AuthPageProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(160deg, #F0F4FF 0%, #F8FAFC 50%, #FDF4FF 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => { window.location.hash = "#/"; }}
          className="flex items-center gap-1.5 mb-6 transition-opacity hover:opacity-70"
          style={{ color: "#64748B", fontSize: "13px", fontWeight: 500 }}
        >
          <ArrowLeft size={14} />
          Back to home
        </button>

        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              boxShadow: "0 8px 24px rgba(79,70,229,0.35)",
            }}
          >
            <Home size={24} className="text-white" />
          </div>
          <h1 style={{ fontWeight: 800, fontSize: "28px", color: "#0F0D2A", letterSpacing: "-0.5px" }}>
            Roomly
          </h1>
          <p style={{ color: "#64748B", fontSize: "14px", marginTop: 6 }}>
            {mode === "login" ? "Sign in to your house dashboard" : "Create your account"}
          </p>
        </div>

        <div
          className="rounded-3xl p-8"
          style={{
            background: "white",
            border: "1px solid rgba(79,70,229,0.12)",
            boxShadow: "0 24px 64px rgba(79,70,229,0.12)",
          }}
        >
          <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "#F1F5F9" }}>
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                  window.location.hash = m === "login" ? "#/login" : "#/register";
                }}
                className="flex-1 py-2 rounded-lg font-semibold capitalize transition-all"
                style={{
                  background: mode === m ? "white" : "transparent",
                  color: mode === m ? "#4F46E5" : "#64748B",
                  fontSize: "13px",
                  boxShadow: mode === m ? "0 2px 8px rgba(79,70,229,0.1)" : "none",
                }}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <Field icon={User} label="Full Name">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Johnson"
                  className="w-full pl-10 pr-4 py-3 rounded-xl outline-none"
                  style={inputStyle}
                />
              </Field>
            )}

            <Field icon={Mail} label="Email">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl outline-none"
                style={inputStyle}
              />
            </Field>

            <Field icon={Lock} label="Password">
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full pl-10 pr-4 py-3 rounded-xl outline-none"
                style={inputStyle}
              />
            </Field>

            {error && (
              <p className="text-sm px-3 py-2 rounded-xl" style={{ background: "#FEF2F2", color: "#EF4444" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-70"
              style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                fontSize: "14px",
                boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
              }}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center mt-6" style={{ color: "#94A3B8", fontSize: "12px" }}>
          Data is stored securely in your MySQL database
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  background: "#F8FAFC",
  border: "1.5px solid rgba(79,70,229,0.12)",
  color: "#0F0D2A",
  fontSize: "14px",
};

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ fontSize: "12px", fontWeight: 600, color: "#0F0D2A", display: "block", marginBottom: 6 }}>
        {label}
      </label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }} />
        {children}
      </div>
    </div>
  );
}
