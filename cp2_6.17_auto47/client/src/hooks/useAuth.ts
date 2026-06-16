import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { usersApi } from '../api';

const TOKEN_KEY = 'book_token';
const USER_KEY = 'book_user';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const cached = localStorage.getItem(USER_KEY);
    if (token && cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {
        // ignore
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await usersApi.login({ email, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (nickname: string, email: string, password: string) => {
      const res = await usersApi.register({ nickname, email, password });
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      setUser(res.user);
      return res.user;
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (data: Partial<User>) => {
    if (!user) return;
    const updated = await usersApi.update(user.id, data);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    setUser(updated);
    return updated;
  }, [user]);

  const token = user ? localStorage.getItem(TOKEN_KEY) : null;

  return { user, loading, token, login, register, logout, updateUser };
}
