import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { login, register, getUser } from '../api';

const USER_STORAGE_KEY = 'bookstore_user';

export function useUserData() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  }, []);

  const persistUser = (u: User) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  };

  const handleLogin = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await login(email, password);
      persistUser(data);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRegister = useCallback(
    async (nickname: string, email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await register(nickname, email, password);
        persistUser(data);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : '注册失败';
        setError(message);
        return { success: false, message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleLogout = useCallback(() => {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUser(user.id);
      persistUser(data);
    } catch (err) {
      console.error('刷新用户信息失败', err);
    }
  }, [user]);

  return {
    user,
    loading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    refresh: refreshUser
  };
}
