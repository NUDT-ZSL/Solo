import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axiosClient from '../api/axiosClient';
import { User, LoginResponse } from '../types';

interface AuthContextType {
  user: User | null;
  login: (name: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('current_user');
    const token = localStorage.getItem('auth_token');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('current_user');
        localStorage.removeItem('auth_token');
      }
    }
  }, []);

  const login = async (name: string, password: string): Promise<boolean> => {
    try {
      const response = (await axiosClient.post('/login', {
        name,
        password,
      })) as unknown as LoginResponse;

      if (response.success) {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('current_user', JSON.stringify(response.user));
        setUser(response.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
