// src/hooks/useAuth.ts
// Auth Context + Hook — แชร์ auth state เดียวกันทั้ง app

import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { api, User, LoginResult } from '../api/client';

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isProcurement: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ============================================================
// Provider — ครอบ App ใน main.tsx หรือ App.tsx
// ============================================================
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoggedIn: false,
    isLoading: true,
    isAdmin: false,
    isStaff: false,
    isProcurement: false,
  });

  // ตรวจสอบ token ที่มีอยู่ตอนเริ่ม app
  useEffect(() => {
    const checkAuth = async () => {
      if (!api.isLoggedIn()) {
        setState({ user: null, isLoggedIn: false, isLoading: false, isAdmin: false, isStaff: false, isProcurement: false });
        return;
      }

      try {
        const user = await api.getMe();
        setState({
          user,
          isLoggedIn: true,
          isLoading: false,
          isAdmin: user.role === 'admin',
          isStaff: user.role === 'staff',
          isProcurement: user.role === 'procurement',
        });
      } catch {
        api.clearToken();
        setState({ user: null, isLoggedIn: false, isLoading: false, isAdmin: false, isStaff: false, isProcurement: false });
      }
    };

    checkAuth();
  }, []);

  // ฟัง event unauthorized / logout จาก API Client
  useEffect(() => {
    const handleUnauthorized = () => {
      setState({ user: null, isLoggedIn: false, isLoading: false, isAdmin: false, isStaff: false, isProcurement: false });
    };

    const handleLogout = () => {
      setState({ user: null, isLoggedIn: false, isLoading: false, isAdmin: false, isStaff: false, isProcurement: false });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    const result = await api.login(username, password);
    setState({
      user: result.user,
      isLoggedIn: true,
      isLoading: false,
      isAdmin: result.user.role === 'admin',
      isStaff: result.user.role === 'staff',
      isProcurement: result.user.role === 'procurement',
    });
    return result;
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setState({ user: null, isLoggedIn: false, isLoading: false, isAdmin: false, isStaff: false, isProcurement: false });
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    return api.changePassword(currentPassword, newPassword);
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    changePassword,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

// ============================================================
// Hook — ใช้ใน component ใดก็ได้ (ต้องอยู่ภายใต้ AuthProvider)
// ============================================================
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}