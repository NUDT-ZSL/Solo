import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '../types';
import { notificationsAPI } from '../services/api';

interface AuthContextType extends AuthState {
  login: (user: User) => void;
  logout: () => void;
  updateNotifications: (count: number) => void;
  refreshUnreadCount: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem('book_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
        refreshUnreadCountForUser(userData.id);
      } catch {
        localStorage.removeItem('book_user');
      }
    }
  }, []);

  const refreshUnreadCountForUser = async (userId: string) => {
    try {
      const result = await notificationsAPI.getUnreadCount(userId);
      setUnreadCount(result.count);
    } catch {
      // ignore
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('book_user', JSON.stringify(userData));
    refreshUnreadCountForUser(userData.id);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setUnreadCount(0);
    localStorage.removeItem('book_user');
  };

  const updateNotifications = (count: number) => {
    setUnreadCount(count);
  };

  const refreshUnreadCount = async () => {
    if (!user) return;
    await refreshUnreadCountForUser(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        unreadCount,
        login,
        logout,
        updateNotifications,
        refreshUnreadCount,
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
