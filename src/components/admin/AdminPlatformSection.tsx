import { useCallback, useEffect, useState } from "react";
import { Save, ToggleLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type {
  PlatformFeatures, PlatformBranding, PlatformGlobalSettings, SubscriptionPlan,
} from "@/types/admin";
import { AdminPageHeader, AdminCard, AdminLoading, AdminBadge, AdminPrimaryBtn } from "./adminShared";

const inputStyle: React.CSSProperties = {
  background: "var(--background)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
};

const FEATURE_LABELS: Record<keyof PlatformFeatures, string> = {
  parking: "Parking fees",
  announcements: "Announcements",
  pdfExport: "PDF export",
  emailNotifications: "Email notifications",
  qrSharing: "QR sharing",
  analytics: "Analytics dashboard",
  attachments: "File attachments",
  supportCenter: "Support center",
  publicBillLinks: "Public bill links",
};

type PlatformMode = "features" | "branding" | "global-settings" | "plans";

export function AdminPlatformSection({ mode }: { mode: PlatformMode }) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [features, setFeatures] = useState<PlatformFeatures | null>(null);
  const [branding, setBranding] = useState<PlatformBranding | null>(null);
  const [settings, setSettings] = useState<PlatformGlobalSettings | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === "features") {
        const res = await api.adminFeatures();
        setFeatures(res.features);
      } else if (mode === "branding") {
        const res = await api.adminBranding();
        setBranding(res.branding);
      } else if (mode === "global-settings") {
        const res = await api.adminGlobalSettings();
        setSettings(res.settings);
      } else {
        const res = await api.adminPlans();
        setPlans(res.plans);
      }
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }, [mode, showToast]);

  useEffect(() => { load(); }, [load]);

  const saveFeatures = async () => {
    if (!features) return;
    setSaving(true);
    try {
      await api.adminUpdateFeatures(features);
      showToast("Features saved", "success");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveBranding = async () => {
    if (!branding) return;
    setSaving(true);
    try {
      await api.adminUpdateBranding(branding);
      showToast("Branding saved", "success");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.adminUpdateGlobalSettings(settings);
      showToast("Settings saved", "success");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const savePlan = async (plan: SubscriptionPlan) => {
    setSaving(true);
    try {
      await api.adminUpdatePlan(plan.id, plan);
      showToast(`Plan "${plan.name}" saved`, "success");
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const titles: Record<PlatformMode, { title: string; subtitle: string }> = {
    features: { title: "Feature Toggles", subtitle: "Enable or disable platform capabilities" },
    branding: { title: "Branding", subtitle: "Platform identity and contact info" },
    "global-settings": { title: "Global Settings", subtitle: "Defaults for all users" },
    plans: { title: "Subscription Plans", subtitle: "Manage plan limits and pricing" },
  };

  const { title, subtitle } = titles[mode];

  if (loading) return <AdminLoading />;

  return (
    <div className="max-w-[900px] mx-auto space-y-4">
      <AdminPageHeader title={title} subtitle={subtitle} onRefresh={load} />

      {mode === "features" && features && (
        <AdminCard title="Platform features" action={<AdminPrimaryBtn onClick={saveFeatures} disabled={saving}><Save size={14} /> Save</AdminPrimaryBtn>}>
          <div className="space-y-2">
            {(Object.keys(FEATURE_LABELS) as (keyof PlatformFeatures)[]).map((key) => (
              <label
                key={key}
                className="flex items-center justify-between gap-4 p-3 sm:p-4 rounded-xl cursor-pointer transition-colors"
                style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ToggleLeft size={16} style={{ color: features[key] ? "#D97706" : "var(--muted-foreground)", flexShrink: 0 }} />
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>{FEATURE_LABELS[key]}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={features[key]}
                  onClick={() => setFeatures((f) => f && { ...f, [key]: !f[key] })}
                  className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors"
                  style={{ background: features[key] ? "linear-gradient(135deg, #4F46E5, #7C3AED)" : "var(--border)" }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                    style={{ left: features[key] ? "22px" : "2px", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
                  />
                </button>
              </label>
            ))}
          </div>
        </AdminCard>
      )}

      {mode === "branding" && branding && (
        <AdminCard title="Brand settings" action={<AdminPrimaryBtn onClick={saveBranding} disabled={saving}><Save size={14} /> Save</AdminPrimaryBtn>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              ["platformName", "Platform name"],
              ["logoUrl", "Logo URL"],
              ["faviconUrl", "Favicon URL"],
              ["loginLogoUrl", "Login logo URL"],
              ["footerText", "Footer text"],
              ["supportEmail", "Support email"],
              ["supportPhone", "Support phone"],
              ["websiteUrl", "Website URL"],
            ] as const).map(([key, label]) => (
              <div key={key} className={key === "footerText" ? "sm:col-span-2" : ""}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
                <input
                  value={branding[key]}
                  onChange={(e) => setBranding((b) => b && { ...b, [key]: e.target.value })}
                  className="w-full mt-1.5 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      {mode === "global-settings" && settings && (
        <AdminCard title="Global defaults" action={<AdminPrimaryBtn onClick={saveSettings} disabled={saving}><Save size={14} /> Save</AdminPrimaryBtn>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              ["defaultCurrency", "Default currency", "text"],
              ["dateFormat", "Date format", "text"],
              ["timezone", "Timezone", "text"],
              ["language", "Language", "text"],
              ["defaultTheme", "Default theme", "text"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</label>
                <input
                  value={settings[key]}
                  onChange={(e) => setSettings((s) => s && { ...s, [key]: e.target.value })}
                  className="w-full mt-1.5 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="flex items-center justify-between gap-4 p-4 rounded-xl cursor-pointer" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>Allow new registrations</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.registrationEnabled}
                  onClick={() => setSettings((s) => s && { ...s, registrationEnabled: !s.registrationEnabled })}
                  className="relative w-11 h-6 rounded-full flex-shrink-0"
                  style={{ background: settings.registrationEnabled ? "linear-gradient(135deg, #4F46E5, #7C3AED)" : "var(--border)" }}
                >
                  <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ left: settings.registrationEnabled ? "22px" : "2px" }} />
                </button>
              </label>
            </div>
          </div>
        </AdminCard>
      )}

      {mode === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onChange={(p) => setPlans((prev) => prev.map((x) => (x.id === p.id ? p : x)))} onSave={() => savePlan(plan)} saving={saving} />
          ))}
          {plans.length === 0 && (
            <AdminCard><p className="text-center py-8" style={{ color: "var(--muted-foreground)" }}>No plans configured</p></AdminCard>
          )}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, onChange, onSave, saving }: { plan: SubscriptionPlan; onChange: (p: SubscriptionPlan) => void; onSave: () => void; saving: boolean }) {
  const fields: { key: keyof SubscriptionPlan; label: string; type?: string }[] = [
    { key: "name", label: "Name" },
    { key: "slug", label: "Slug" },
    { key: "memberLimit", label: "Member limit", type: "number" },
    { key: "houseLimit", label: "House limit", type: "number" },
    { key: "billLimit", label: "Bill limit", type: "number" },
    { key: "storageLimitMb", label: "Storage (MB)", type: "number" },
    { key: "priceMonthly", label: "Price / month", type: "number" },
  ];

  return (
    <AdminCard
      title={plan.name}
      action={
        <div className="flex items-center gap-2">
          <AdminBadge color={plan.isActive ? "#10B981" : "#64748B"} bg={plan.isActive ? "rgba(16,185,129,0.12)" : "var(--muted)"}>
            {plan.isActive ? "Active" : "Inactive"}
          </AdminBadge>
          <AdminPrimaryBtn onClick={onSave} disabled={saving}><Save size={14} /></AdminPrimaryBtn>
        </div>
      }
    >
      <div className="space-y-3">
        {fields.map(({ key, label, type }) => (
          <div key={key}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)" }}>{label}</label>
            <input
              type={type ?? "text"}
              value={plan[key] as string | number}
              onChange={(e) => onChange({ ...plan, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          </div>
        ))}
        <label className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
          <span style={{ fontSize: "13px", fontWeight: 500 }}>Active</span>
          <button
            type="button"
            role="switch"
            aria-checked={plan.isActive}
            onClick={() => onChange({ ...plan, isActive: !plan.isActive })}
            className="relative w-11 h-6 rounded-full"
            style={{ background: plan.isActive ? "linear-gradient(135deg, #F59E0B, #D97706)" : "var(--border)" }}
          >
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white" style={{ left: plan.isActive ? "22px" : "2px" }} />
          </button>
        </label>
      </div>
    </AdminCard>
  );
}
