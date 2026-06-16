import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUser } from '../api/borrowApi';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userId: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_USER_ID = 'u1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (userId: string) => {
    setLoading(true);
    try {
      const userData = await getUser(userId);
      setUser(userData);
    } catch (err) {
      console.error('获取用户信息失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser(DEFAULT_USER_ID);
  }, []);

  const login = async (userId: string) => {
    await fetchUser(userId);
  };

  const logout = () => {
    setUser(null);
  };

  const refreshUser = async () => {
    if (user) {
      await fetchUser(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
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
