import { useEffect, useState } from "react";
import { parseHashRoute, setAdminRoute } from "@/lib/share";
import type { AdminSection } from "@/types/admin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminUsersSection } from "@/components/admin/AdminUsersSection";
import { AdminHousesSection } from "@/components/admin/AdminHousesSection";
import { AdminPlatformSection } from "@/components/admin/AdminPlatformSection";
import { AdminContentSection } from "@/components/admin/AdminContentSection";
import { AdminLogsSection } from "@/components/admin/AdminLogsSection";
import { AdminSystemSection } from "@/components/admin/AdminSystemSection";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";

const VALID: AdminSection[] = [
  "dashboard", "users", "houses", "features", "announcements", "branding",
  "email-templates", "activity-logs", "audit-logs", "login-history",
  "support", "backups", "health", "plans", "global-settings", "storage", "notifications",
];

function parseSection(): AdminSection {
  const { adminSection } = parseHashRoute();
  return VALID.includes(adminSection as AdminSection) ? (adminSection as AdminSection) : "dashboard";
}

export function AdminPage() {
  const [section, setSection] = useState<AdminSection>(parseSection);

  useEffect(() => {
    const sync = () => setSection(parseSection());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (!window.location.hash.includes("/admin")) {
      setAdminRoute(section);
    }
  }, [section]);

  const renderSection = () => {
    switch (section) {
      case "dashboard": return <AdminDashboard />;
      case "users": return <AdminUsersSection />;
      case "houses": return <AdminHousesSection />;
      case "features": return <AdminPlatformSection mode="features" />;
      case "branding": return <AdminPlatformSection mode="branding" />;
      case "global-settings": return <AdminPlatformSection mode="global-settings" />;
      case "plans": return <AdminPlatformSection mode="plans" />;
      case "announcements": return <AdminContentSection mode="announcements" />;
      case "email-templates": return <AdminContentSection mode="email-templates" />;
      case "activity-logs": return <AdminLogsSection mode="activity-logs" />;
      case "audit-logs": return <AdminLogsSection mode="audit-logs" />;
      case "login-history": return <AdminLogsSection mode="login-history" />;
      case "support": return <AdminSystemSection mode="support" />;
      case "backups": return <AdminSystemSection mode="backups" />;
      case "health": return <AdminSystemSection mode="health" />;
      case "storage": return <AdminSystemSection mode="storage" />;
      case "notifications": return <AdminSystemSection mode="notifications" />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <>
      <ImpersonationBanner />
      <AdminLayout section={section} onSection={setSection}>
        <div key={section}>{renderSection()}</div>
      </AdminLayout>
    </>
  );
}
