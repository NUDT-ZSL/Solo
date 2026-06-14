import React, { useState, useEffect, useCallback } from 'react';

interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  role: 'student' | 'teacher';
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    nickname: string
  ) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isTeacher: boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('pg_token');
    const savedUser = localStorage.getItem('pg_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('pg_token');
        localStorage.removeItem('pg_user');
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const http = (await import('./http')).default;
    const res = await http.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    setToken(t);
    setUser(u);
    localStorage.setItem('pg_token', t);
    localStorage.setItem('pg_user', JSON.stringify(u));
  }, []);

  const register = useCallback(
    async (email: string, password: string, nickname: string) => {
      const http = (await import('./http')).default;
      const res = await http.post('/auth/register', {
        email,
        password,
        nickname,
      });
      const { token: t, user: u } = res.data;
      setToken(t);
      setUser(u);
      localStorage.setItem('pg_token', t);
      localStorage.setItem('pg_user', JSON.stringify(u));
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pg_token');
    localStorage.removeItem('pg_user');
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isTeacher: user?.role === 'teacher',
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export default AuthContext;
