import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, type AuthUser } from "@/lib/api";
import type { AppState, HouseSummary } from "@/types";
import type { PlatformAnnouncement } from "@/types/admin";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  appState: AppState | null;
  houses: HouseSummary[];
  activeHouseId: number | null;
  isSuperAdmin: boolean;
  impersonating: boolean;
  announcements: PlatformAnnouncement[];
  setAppState: (state: AppState) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshState: () => Promise<void>;
  switchHouse: (houseId: number) => Promise<void>;
  createHouse: (name: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  refreshPlatformConfig: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applyAuthPayload(
  res: {
    user: AuthUser;
    state: AppState;
    houses?: HouseSummary[];
    activeHouseId?: number;
    impersonating?: boolean;
  },
  setUser: (u: AuthUser) => void,
  setAppState: (s: AppState) => void,
  setHouses: (h: HouseSummary[]) => void,
  setActiveHouseId: (id: number | null) => void,
  setImpersonating: (v: boolean) => void,
) {
  setUser(res.user);
  setAppState(res.state);
  if (res.houses) setHouses(res.houses);
  if (res.activeHouseId) setActiveHouseId(res.activeHouseId);
  setImpersonating(!!res.impersonating);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [houses, setHouses] = useState<HouseSummary[]>([]);
  const [activeHouseId, setActiveHouseId] = useState<number | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshPlatformConfig = useCallback(async () => {
    try {
      const res = await api.platformConfig();
      setAnnouncements(res.announcements ?? []);
      setImpersonating(res.impersonating);
    } catch {
      /* optional */
    }
  }, []);

  const refreshState = useCallback(async () => {
    const res = await api.sync();
    setAppState(res.state);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.me();
        if (res.user && res.state) {
          setUser(res.user);
          setAppState(res.state);
          setHouses(res.houses ?? []);
          setActiveHouseId(res.activeHouseId ?? null);
          setImpersonating(!!res.impersonating);
          await refreshPlatformConfig();
        }
      } catch {
        /* not logged in */
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshPlatformConfig]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    applyAuthPayload(res, setUser, setAppState, setHouses, setActiveHouseId, setImpersonating);
    await refreshPlatformConfig();
  }, [refreshPlatformConfig]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register(name, email, password);
    applyAuthPayload(res, setUser, setAppState, setHouses, setActiveHouseId, setImpersonating);
    await refreshPlatformConfig();
  }, [refreshPlatformConfig]);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setAppState(null);
    setHouses([]);
    setActiveHouseId(null);
    setImpersonating(false);
    setAnnouncements([]);
  }, []);

  const switchHouse = useCallback(async (houseId: number) => {
    const res = await api.switchHouse(houseId);
    applyAuthPayload(res, setUser, setAppState, setHouses, setActiveHouseId, setImpersonating);
  }, []);

  const createHouse = useCallback(async (name: string) => {
    const res = await api.createHouse(name);
    applyAuthPayload(res, setUser, setAppState, setHouses, setActiveHouseId, setImpersonating);
  }, []);

  const stopImpersonation = useCallback(async () => {
    const res = await api.adminStopImpersonate();
    applyAuthPayload(res, setUser, setAppState, setHouses, setActiveHouseId, setImpersonating);
  }, []);

  const isSuperAdmin = impersonating ? false : user?.role === "super_admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        appState,
        houses,
        activeHouseId,
        isSuperAdmin,
        impersonating,
        announcements,
        setAppState,
        login,
        register,
        logout,
        refreshState,
        switchHouse,
        createHouse,
        stopImpersonation,
        refreshPlatformConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
