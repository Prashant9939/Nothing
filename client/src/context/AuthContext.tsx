import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../api';

// api.ts (axios + interceptors + the whole endpoint surface, ~54KB) is
// imported dynamically so it leaves the critical path of the entry bundle —
// anonymous visitors on the marketing pages never download it, and logged-in
// users only fetch it alongside their first API call. Type imports above are
// erased at compile time and cost nothing.

// Auth state lives in sessionStorage, not localStorage: localStorage survives
// closing the tab, sessionStorage is wiped with it — so closing the tab ends
// the session. Carry any legacy localStorage token over once so users logged
// in before this change aren't kicked out by the deploy; the localStorage copy
// is then removed so the old (tab-persistent) session can't be reused.
try {
  const legacyToken = localStorage.getItem('token');
  if (legacyToken && !sessionStorage.getItem('token')) {
    sessionStorage.setItem('token', legacyToken);
    const legacyUser = localStorage.getItem('user');
    if (legacyUser) sessionStorage.setItem('user', legacyUser);
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
} catch {
  // Storage unavailable (private mode) — auth starts fresh.
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    university: string;
    college: string;
    course: string;
    year: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readStoredUser = (): User | null => {
  try {
    if (!sessionStorage.getItem('token')) return null;
    const raw = sessionStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'));
  // Cache hit → render instantly from the cached profile (no server wait).
  // The boot spinner is only needed when a token exists without a cached
  // profile, because then we cannot know who the user is until fetch resolves.
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !!sessionStorage.getItem('token') && !readStoredUser()
  );

  // Background revalidation: refresh the cached profile, and clear the cache
  // if the server rejects the session (expired / revoked token).
  useEffect(() => {
    const storedToken = sessionStorage.getItem('token');
    if (!storedToken) {
      sessionStorage.removeItem('user');
      return;
    }

    import('../api')
      .then(({ authApi }) => authApi.checkSession())
      .then((res) => {
        sessionStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(storedToken);
        setUser(res.data.user);
      })
      .catch(() => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const storeSession = useCallback((newToken: string, newUser: User) => {
    sessionStorage.setItem('token', newToken);
    sessionStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  // api.ts dispatches this on a 401 instead of forcing a full page reload —
  // clearing state here lets ProtectedRoute redirect in-SPA (instant).
  useEffect(() => {
    const onExpired = () => clearSession();
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [clearSession]);

  const apiError = (err: any, fallback: string): Error => {
    return new Error(err?.response?.data?.error || err?.message || fallback);
  };

  const login = useCallback(async (email: string, password: string, _remember = false) => {
    try {
      const { authApi } = await import('../api');
      const response = await authApi.login({ email, password });
      storeSession(response.data.token, response.data.user);
    } catch (err: any) {
      throw apiError(err, 'Login failed');
    }
  }, [storeSession]);

  const register = useCallback(async (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    university: string;
    college: string;
    course: string;
    year: string;
    password: string;
  }) => {
    try {
      const { authApi } = await import('../api');
      const response = await authApi.register(data);
      storeSession(response.data.token, response.data.user);
    } catch (err: any) {
      throw apiError(err, 'Registration failed');
    }
  }, [storeSession]);

  const logout = useCallback(async () => {
    try {
      const { authApi } = await import('../api');
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    }
    clearSession();
  }, [clearSession]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  // Memoize the value object so consumers of useAuth() don't re-render on
  // every provider render (previously a fresh object literal each time).
  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateUser,
    }),
    [user, token, isLoading, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
