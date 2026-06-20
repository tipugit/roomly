import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider, useApp } from "@/context/AppContext";
import { AuthPage } from "@/components/AuthPage";
import { LandingPage } from "@/components/LandingPage";
import { Layout } from "@/components/Layout";
import { ToastStack } from "@/components/ToastStack";
import { SearchModal } from "@/components/SearchModal";
import { DashboardPage } from "@/components/DashboardPage";
import { RoommatesPage } from "@/components/RoommatesPage";
import { BillCreationPage } from "@/components/BillCreationPage";
import { BillDetailsPage } from "@/components/BillDetailsPage";
import { BillViewPage } from "@/components/BillViewPage";
import { SharedBillPage } from "@/components/SharedBillPage";
import { AnalyticsPage } from "@/components/AnalyticsPage";
import { SettingsPage } from "@/components/SettingsPage";
import { AdminPage } from "@/components/AdminPage";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useHashRoute } from "@/hooks/useHashRoute";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <Loader2 size={32} className="animate-spin" style={{ color: "#4F46E5" }} />
    </div>
  );
}

function AppContent() {
  const { user, isSuperAdmin } = useAuth();
  const { page, setPage, sharedPayload, viewBillId, openBillView, billViewRevision } = useApp();

  useEffect(() => {
    if (page === "admin" && !isSuperAdmin) {
      setPage("dashboard");
    }
  }, [page, isSuperAdmin, setPage]);

  if (page === "admin" && isSuperAdmin) {
    return (
      <>
        <AdminPage />
        <ToastStack />
      </>
    );
  }

  if (page === "shared-bill") {
    return (
      <>
        <SharedBillPage
          onBack={
            sharedPayload
              ? () => {
                  if (user) {
                    setPage("dashboard");
                  } else {
                    window.location.hash = "#/";
                  }
                }
              : () => { setPage("expenses"); }
          }
        />
        <ToastStack />
        <SearchModal />
      </>
    );
  }

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <DashboardPage />;
      case "roommates": return <RoommatesPage />;
      case "bills":
        return (
          <BillCreationPage
            onCreated={(billId) => {
              if (billId) openBillView(billId, true);
              else setPage("expenses");
            }}
          />
        );
      case "bill-details":
        return viewBillId ? (
          <BillViewPage key={`${viewBillId}-${billViewRevision}`} billId={viewBillId} />
        ) : (
          <BillDetailsPage />
        );
      case "expenses":
        return <BillDetailsPage />;
      case "analytics": return <AnalyticsPage />;
      case "settings": return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  const sidebarActive = page === "bill-details" ? "expenses" : page;

  return (
    <>
      <ImpersonationBanner />
      <Layout activePage={sidebarActive}>
        <div key={page}>{renderPage()}</div>
      </Layout>
      <ToastStack />
      <SearchModal />
    </>
  );
}

function AuthenticatedApp() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function RootGate() {
  const { user, loading } = useAuth();
  const { page } = useHashRoute();
  const isPublicShare = page === "shared-bill";
  const isAuthPage = page === "login" || page === "register";

  if (loading) return <LoadingScreen />;
  if (!user && isPublicShare) {
    return (
      <AppProvider>
        <AppContent />
      </AppProvider>
    );
  }
  if (!user && isAuthPage) {
    return <AuthPage mode={page === "register" ? "register" : "login"} />;
  }
  if (!user) return <LandingPage />;
  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <RootGate />
    </AuthProvider>
  );
}
