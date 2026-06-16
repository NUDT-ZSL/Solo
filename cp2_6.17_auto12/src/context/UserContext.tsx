import { createContext, useContext, ReactNode } from 'react';
import type { User } from '../types';
import { useUserData } from '../hooks/useUserData';

interface UserContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (
    nickname: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refresh: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const value = useUserData();
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
