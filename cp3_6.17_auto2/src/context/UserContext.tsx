import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getUserById } from '../api/borrowApi';
import type { User } from '../types';

const CURRENT_USER_ID = 'u001';

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  updateUserCreditScore: (newScore: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userData = await getUserById(CURRENT_USER_ID);
      setUser(userData);
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取用户信息失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const updateUserCreditScore = useCallback((newScore: number) => {
    setUser(prev => prev ? { ...prev, creditScore: newScore } : prev);
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser, updateUserCreditScore }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
