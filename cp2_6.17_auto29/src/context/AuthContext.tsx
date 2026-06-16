import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../utils/api';
import type { Member } from '../types';

interface AuthContextType {
  member: Omit<Member, 'password'> | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: { email: string; password: string; name: string; phone: string; address: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [member, setMember] = useState<Omit<Member, 'password'> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('farm_member');
    if (stored) {
      try {
        setMember(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored member');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await authAPI.login(email, password);
      if (res.data.success && res.data.member) {
        setMember(res.data.member);
        localStorage.setItem('farm_member', JSON.stringify(res.data.member));
        return { success: true };
      }
      return { success: false, message: res.data.message || '登录失败' };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || '网络错误' };
    }
  };

  const register = async (data: { email: string; password: string; name: string; phone: string; address: string }) => {
    try {
      const res = await authAPI.register(data);
      if (res.data.success && res.data.member) {
        setMember(res.data.member);
        localStorage.setItem('farm_member', JSON.stringify(res.data.member));
        return { success: true };
      }
      return { success: false, message: res.data.message || '注册失败' };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || '网络错误' };
    }
  };

  const logout = () => {
    setMember(null);
    localStorage.removeItem('farm_member');
  };

  return (
    <AuthContext.Provider value={{ member, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
