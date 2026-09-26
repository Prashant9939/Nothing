import { createContext, useContext, useState, useEffect } from 'react';
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

  const storeSession = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const apiError = (err: any, fallback: string): Error => {
    return new Error(err?.response?.data?.error || err?.message || fallback);
  };

  const login = async (email: string, password: string, _remember = false) => {
    try {
      const response = await authApi.login({ email, password });
      storeSession(response.data.token, response.data.user);
    } catch (err: any) {
      throw apiError(err, 'Login failed');
    }
  };

  const register = async (data: {
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
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    }
    clearSession();
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
