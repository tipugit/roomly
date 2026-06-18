import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, type AuthUser } from "@/lib/api";
import type { AppState } from "@/types";
import { initialState } from "@/data/initialData";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  appState: AppState | null;
  setAppState: (state: AppState) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshState = useCallback(async () => {
    const res = await api.sync();
    setAppState(res.state);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.me();
        if (res.user) {
          setUser(res.user);
          setAppState(res.state ?? initialState);
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
    setUser(res.user);
    setAppState(res.state);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register(name, email, password);
    setUser(res.user);
    setAppState(res.state);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setAppState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, appState, setAppState, login, register, logout, refreshState }}
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
