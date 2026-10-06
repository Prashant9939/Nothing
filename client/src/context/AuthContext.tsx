import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api';
import type { User } from '../api';

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
    if (!localStorage.getItem('token')) return null;
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  // Cache hit → render instantly from the cached profile (no server wait).
  // The boot spinner is only needed when a token exists without a cached
  // profile, because then we cannot know who the user is until fetch resolves.
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !!localStorage.getItem('token') && !readStoredUser()
  );

  // Background revalidation: refresh the cached profile, and clear the cache
  // if the server rejects the session (expired / revoked token).
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      localStorage.removeItem('user');
      return;
    }

    authApi.checkSession()
      .then((res) => {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(storedToken);
        setUser(res.data.user);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const storeSession = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
      const response = await authApi.register(data);
      storeSession(response.data.token, response.data.user);
    } catch (err: any) {
      throw apiError(err, 'Registration failed');
    }
  }, [storeSession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    }
    clearSession();
  }, [clearSession]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
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
