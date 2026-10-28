import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  clientId: string | null;
};

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('smm_token'),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api<User>('/auth/me', { token })
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('smm_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      loading,
      async login(email, password) {
        const res = await api<{ accessToken: string; user: User }>(
          '/auth/login',
          {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          },
        );
        localStorage.setItem('smm_token', res.accessToken);
        setToken(res.accessToken);
        setUser(res.user);
      },
      logout() {
        localStorage.removeItem('smm_token');
        setToken(null);
        setUser(null);
      },
    }),
    [user, token, loading],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('AuthProvider missing');
  return ctx;
}
