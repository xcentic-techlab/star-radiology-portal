import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const decodeAndSetUser = useCallback((t: string) => {
    try {
      const decoded = jwtDecode<AuthUser & { exp: number }>(t);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('dcms_token');
        return false;
      }
      setUser({ id: decoded.id, role: decoded.role, name: decoded.name, centerId: decoded.centerId, centerName: decoded.centerName });
      setToken(t);
      return true;
    } catch {
      localStorage.removeItem('dcms_token');
      return false;
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('dcms_token');
    if (stored) {
      decodeAndSetUser(stored);
    }
    setIsLoading(false);
  }, [decodeAndSetUser]);

  const login = (t: string) => {
    localStorage.setItem('dcms_token', t);
    decodeAndSetUser(t);
  };

  const logout = () => {
    localStorage.removeItem('dcms_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
