import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, TOKEN_KEY } from '../lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'commuter' | 'admin';
  vehicleType?: string;
  vehicleNumber?: string;
  homeArea?: string;
  preferences?: UserPreferences;
  createdAt?: string;
}

export interface UserPreferences {
  audibleAlerts: boolean;
  autoDetect: boolean;
  anonymousTelemetry: boolean;
  nightMap: boolean;
}

export type ProfilePatch = Partial<Pick<AuthUser, 'name' | 'vehicleType' | 'vehicleNumber' | 'homeArea'>> & { preferences?: Partial<UserPreferences> };

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  useEffect(() => {
    const clearSession = () => {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setIsLoading(false);
    };
    window.addEventListener('saferoute:unauthorized', clearSession);
    return () => window.removeEventListener('saferoute:unauthorized', clearSession);
  }, []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    let active = true;
    apiRequest<{ user: AuthUser }>('/auth/me')
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        if (active) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [token]);

  const authenticate = async (path: string, body: Record<string, string>) => {
    const result = await apiRequest<{ token: string; user: AuthUser }>(path, { method: 'POST', body });
    localStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isLoading,
    login: (email, password) => authenticate('/auth/login', { email, password }),
    register: (name, email, password) => authenticate('/auth/register', { name, email, password }),
    resetPassword: (resetToken, password) => authenticate('/auth/reset-password', { token: resetToken, password }),
    updateProfile: async (patch) => {
      const result = await apiRequest<{ user: AuthUser }>('/auth/me', { method: 'PATCH', body: patch });
      setUser(result.user);
    },
    logout: () => {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    },
  }), [user, token, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
