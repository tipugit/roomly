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

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  appState: AppState | null;
  houses: HouseSummary[];
  activeHouseId: number | null;
  isSuperAdmin: boolean;
  setAppState: (state: AppState) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshState: () => Promise<void>;
  switchHouse: (houseId: number) => Promise<void>;
  createHouse: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applyAuthPayload(
  res: { user: AuthUser; state: AppState; houses?: HouseSummary[]; activeHouseId?: number },
  setUser: (u: AuthUser) => void,
  setAppState: (s: AppState) => void,
  setHouses: (h: HouseSummary[]) => void,
  setActiveHouseId: (id: number | null) => void,
) {
  setUser(res.user);
  setAppState(res.state);
  if (res.houses) setHouses(res.houses);
  if (res.activeHouseId) setActiveHouseId(res.activeHouseId);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [houses, setHouses] = useState<HouseSummary[]>([]);
  const [activeHouseId, setActiveHouseId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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
        }
      } catch {
        /* not logged in or API unavailable */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    applyAuthPayload(res, setUser, setAppState, setHouses, setActiveHouseId);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register(name, email, password);
    applyAuthPayload(res, setUser, setAppState, setHouses, setActiveHouseId);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setAppState(null);
    setHouses([]);
    setActiveHouseId(null);
  }, []);

  const switchHouse = useCallback(async (houseId: number) => {
    const res = await api.switchHouse(houseId);
    applyAuthPayload(res, setUser, setAppState, setHouses, setActiveHouseId);
  }, []);

  const createHouse = useCallback(async (name: string) => {
    const res = await api.createHouse(name);
    applyAuthPayload(res, setUser, setAppState, setHouses, setActiveHouseId);
  }, []);

  const isSuperAdmin = user?.role === "super_admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        appState,
        houses,
        activeHouseId,
        isSuperAdmin,
        setAppState,
        login,
        register,
        logout,
        refreshState,
        switchHouse,
        createHouse,
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
