import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { initialState } from "@/data/initialData";
import { buildRoommateShares, buildParkingSnapshotFromSettings } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  decodeSharePayload,
  parseHashRoute,
  setHashRoute,
  type SharePayload,
} from "@/lib/share";
import type {
  Activity,
  Bill,
  Expense,
  Page,
  Roommate,
  Settings,
  Toast,
  ToastType,
} from "@/types";

const VALID_PAGES: Page[] = [
  "dashboard",
  "roommates",
  "bills",
  "expenses",
  "analytics",
  "settings",
  "bill-details",
  "shared-bill",
];

interface AppContextValue {
  page: Page;
  setPage: (page: Page) => void;
  navigate: (page: string) => void;
  darkMode: boolean;
  toggleDark: () => void;
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: number) => void;
  roommates: Roommate[];
  bills: Bill[];
  activeBill: Bill | null;
  settings: Settings;
  activities: Activity[];
  sharedPayload: SharePayload | null;
  addRoommate: (data: {
    name: string;
    room: string;
    phone: string;
    email: string;
    occupation: string;
    status: Roommate["status"];
  }) => Promise<void>;
  updateRoommate: (id: number, data: Partial<Roommate>) => Promise<void>;
  deleteRoommate: (id: number) => Promise<void>;
  createBill: (data: {
    month: string;
    houseName: string;
    rent: number;
    expenses: Expense[];
    selectedRoommateIds: number[];
    announcementTitle?: string;
    announcementMessage?: string;
    parkingSnapshot?: import("@/types").ParkingSnapshot | null;
    isExtraBill?: boolean;
  }) => Promise<Bill | null>;
  deleteBill: (id: string) => Promise<void>;
  duplicateBill: (id: string) => Promise<void>;
  markBillComplete: (id: string) => Promise<void>;
  updatePayment: (roommateId: number, paid: number) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  setActiveBillId: (id: string) => Promise<void>;
  exportData: () => void;
  importData: (file: File) => Promise<boolean>;
  resetApp: () => Promise<void>;
  pendingBillsCount: number;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function resolveInitialPage(): { page: Page; shareToken: string | null; shareData: string | null } {
  const { page, shareData, shareToken } = parseHashRoute();
  if (page === "shared-bill" && (shareToken || shareData)) {
    return { page: "shared-bill", shareToken, shareData };
  }
  if (VALID_PAGES.includes(page as Page) && page !== "shared-bill") {
    return { page: page as Page, shareToken: null, shareData: null };
  }
  return { page: "dashboard", shareToken: null, shareData: null };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { appState, setAppState, logout: authLogout } = useAuth();
  const initial = resolveInitialPage();

  const state = appState ?? initialState;

  const [page, setPageState] = useState<Page>(initial.page);
  const [sharedPayload, setSharedPayload] = useState<SharePayload | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const applyState = useCallback(
    (next: typeof state) => {
      setAppState(next);
    },
    [setAppState]
  );

  const setPage = useCallback((p: Page) => {
    setPageState(p);
    setHashRoute(p);
  }, []);

  // Load shared bill from token or encoded hash
  useEffect(() => {
    (async () => {
      if (initial.page !== "shared-bill") return;
      if (initial.shareToken) {
        try {
          const res = await api.getShare(initial.shareToken);
          setSharedPayload(res.payload);
        } catch {
          /* invalid share */
        }
        return;
      }
      if (initial.shareData) {
        const payload = decodeSharePayload(initial.shareData);
        if (payload) setSharedPayload(payload);
      }
    })();
  }, []);

  useEffect(() => {
    if (!window.location.hash) setHashRoute(page);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.darkMode);
  }, [state.darkMode]);

  useEffect(() => {
    const onHashChange = () => {
      const { page: hashPage, shareData, shareToken } = parseHashRoute();
      if (hashPage === "shared-bill") {
        if (shareToken) {
          api.getShare(shareToken).then((res) => {
            setSharedPayload(res.payload);
            setPageState("shared-bill");
          }).catch(() => setSharedPayload(null));
          return;
        }
        if (shareData) {
          const payload = decodeSharePayload(shareData);
          if (payload) {
            setSharedPayload(payload);
            setPageState("shared-bill");
          }
        }
        return;
      }
      if (VALID_PAGES.includes(hashPage as Page) && hashPage !== "shared-bill") {
        setSharedPayload(null);
        setPageState(hashPage as Page);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const navigate = useCallback(
    (p: string) => {
      setPage(p as Page);
    },
    [setPage]
  );

  const toggleDark = useCallback(async () => {
    const next = !state.darkMode;
    try {
      const res = await api.updateSettings(state.settings, next);
      applyState(res.state);
      showToast(next ? "Dark mode enabled" : "Light mode enabled", "info");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Failed to save", "error");
    }
  }, [state.darkMode, state.settings, applyState, showToast]);

  const addRoommate = useCallback(
    async (data: Parameters<AppContextValue["addRoommate"]>[0]) => {
      try {
        const res = await api.addRoommate(data);
        const sync = await api.sync();
        applyState(sync.state);
        showToast("Roommate added successfully!", "success");
        void res;
      } catch (e) {
        showToast(e instanceof ApiError ? e.message : "Failed to add roommate", "error");
      }
    },
    [applyState, showToast]
  );

  const updateRoommate = useCallback(
    async (id: number, data: Partial<Roommate>) => {
      try {
        await api.updateRoommate(id, data);
        const sync = await api.sync();
        applyState(sync.state);
        showToast("Roommate updated", "success");
      } catch (e) {
        showToast(e instanceof ApiError ? e.message : "Update failed", "error");
      }
    },
    [applyState, showToast]
  );

  const deleteRoommate = useCallback(
    async (id: number) => {
      const name = state.roommates.find((r) => r.id === id)?.name ?? "Roommate";
      try {
        await api.deleteRoommate(id);
        const sync = await api.sync();
        applyState(sync.state);
        showToast(`${name} removed`, "info");
      } catch (e) {
        showToast(e instanceof ApiError ? e.message : "Delete failed", "error");
      }
    },
    [state.roommates, applyState, showToast]
  );

  const createBill = useCallback(
    async (data: Parameters<AppContextValue["createBill"]>[0]) => {
      const parkingSnapshot =
        data.parkingSnapshot ?? buildParkingSnapshotFromSettings(state.settings);
      const roommateShares = buildRoommateShares(
        state.roommates,
        data.selectedRoommateIds,
        data.rent,
        data.expenses,
        undefined,
        parkingSnapshot,
        state.settings.roundUpAmounts ?? false
      );
      try {
        const res = await api.createBill({
          month: data.month,
          houseName: data.houseName,
          rent: data.rent,
          expenses: data.expenses,
          selectedRoommateIds: data.selectedRoommateIds,
          roommateShares,
          announcementTitle: data.announcementTitle ?? "",
          announcementMessage: data.announcementMessage ?? "",
          parkingSnapshot,
          isExtraBill: data.isExtraBill ?? false,
        });
        applyState(res.state);
        showToast("Bill created successfully!", "success");
        return res.state.bills.find((b) => b.id === res.state.activeBillId) ?? res.state.bills[0] ?? null;
      } catch (e) {
        showToast(e instanceof ApiError ? e.message : "Failed to create bill", "error");
        return null;
      }
    },
    [state.roommates, state.settings, applyState, showToast]
  );

  const deleteBill = useCallback(
    async (id: string) => {
      try {
        const res = await api.deleteBill(id);
        applyState(res.state);
        showToast("Bill deleted", "info");
      } catch (e) {
        showToast(e instanceof ApiError ? e.message : "Delete failed", "error");
      }
    },
    [applyState, showToast]
  );

  const duplicateBill = useCallback(
    async (id: string) => {
      try {
        const res = await api.duplicateBill(id);
        applyState(res.state);
        showToast("Bill duplicated", "success");
      } catch (e) {
        showToast(e instanceof ApiError ? e.message : "Duplicate failed", "error");
      }
    },
    [applyState, showToast]
  );

  const markBillComplete = useCallback(
    async (id: string) => {
      try {
        const res = await api.markBillComplete(id);
        applyState(res.state);
        showToast("Bill marked as completed", "success");
      } catch (e) {
        showToast(e instanceof ApiError ? e.message : "Update failed", "error");
      }
    },
    [applyState, showToast]
  );

  const updatePayment = useCallback(
    async (roommateId: number, paid: number) => {
      const billId = state.activeBillId ?? state.bills[0]?.id;
      if (!billId) return;
      try {
        const res = await api.updatePayment(billId, roommateId, paid);
        applyState(res.state);
        const roommate = state.roommates.find((r) => r.id === roommateId);
        if (roommate) {
          showToast(`Payment updated for ${roommate.name.split(" ")[0]}`, "success");
        }
      } catch (e) {
        showToast(e instanceof ApiError ? e.message : "Payment update failed", "error");
      }
    },
    [state.activeBillId, state.bills, state.roommates, applyState, showToast]
  );

  const updateSettings = useCallback(
    async (settings: Settings) => {
      try {
        const res = await api.updateSettings(settings, state.darkMode);
        applyState(res.state);
        showToast("Settings saved successfully!", "success");
      } catch (e) {
        showToast(e instanceof ApiError ? e.message : "Save failed", "error");
      }
    },
    [state.darkMode, applyState, showToast]
  );

  const setActiveBillId = useCallback(
    async (id: string) => {
      try {
        await api.setActiveBill(id);
        applyState({ ...state, activeBillId: id });
      } catch {
        applyState({ ...state, activeBillId: id });
      }
    },
    [state, applyState]
  );

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roomly-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded", "success");
  }, [state, showToast]);

  const importData = useCallback(
    async (_file: File) => {
      showToast("Import via API is not supported — use the database backup in cPanel", "info");
      return false;
    },
    [showToast]
  );

  const resetApp = useCallback(async () => {
    try {
      const res = await api.resetAccount();
      applyState(res.state);
      setSharedPayload(null);
      setPage("dashboard");
      showToast("All house data has been reset", "info");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Reset failed", "error");
    }
  }, [applyState, setPage, showToast]);

  const logout = useCallback(async () => {
    await authLogout();
    setPage("dashboard");
    showToast("Signed out", "info");
  }, [authLogout, setPage, showToast]);

  const activeBill = useMemo(
    () => state.bills.find((b) => b.id === state.activeBillId) ?? state.bills[0] ?? null,
    [state.bills, state.activeBillId]
  );

  const pendingBillsCount = useMemo(
    () =>
      activeBill
        ? activeBill.roommateShares.filter((rs) => rs.status !== "Paid").length
        : 0,
    [activeBill]
  );

  const value: AppContextValue = {
    page,
    setPage,
    navigate,
    darkMode: state.darkMode,
    toggleDark,
    toasts,
    showToast,
    dismissToast,
    roommates: state.roommates,
    bills: state.bills,
    activeBill,
    settings: state.settings,
    activities: state.activities,
    sharedPayload,
    addRoommate,
    updateRoommate,
    deleteRoommate,
    createBill,
    deleteBill,
    duplicateBill,
    markBillComplete,
    updatePayment,
    updateSettings,
    setActiveBillId,
    exportData,
    importData,
    resetApp,
    pendingBillsCount,
    searchOpen,
    setSearchOpen,
    logout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
