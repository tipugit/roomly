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
import { SharedBillPage } from "@/components/SharedBillPage";
import { AnalyticsPage } from "@/components/AnalyticsPage";
import { SettingsPage } from "@/components/SettingsPage";
import { Loader2 } from "lucide-react";
import { parseHashRoute } from "@/lib/share";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
      <Loader2 size={32} className="animate-spin" style={{ color: "#4F46E5" }} />
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();
  const { page, setPage, showToast, sharedPayload } = useApp();

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
              : () => { setPage("expenses"); showToast("Returned to Bill Details"); }
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
      case "bills": return <BillCreationPage onCreated={() => setPage("expenses")} />;
      case "expenses":
      case "bill-details":
        return (
          <BillDetailsPage
            onBack={() => setPage("bills")}
            onShareView={() => { setPage("shared-bill"); showToast("Opening public share page", "info"); }}
          />
        );
      case "analytics": return <AnalyticsPage />;
      case "settings": return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  const sidebarActive = page === "bill-details" ? "expenses" : page;

  return (
    <>
      <Layout activePage={sidebarActive}>
        {renderPage()}
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
  const { page } = parseHashRoute();
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
