import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: Omit<User, 'password'> | null;
  token: string | null;
  setAuth: (user: Omit<User, 'password'>, token: string) => void;
  logout: () => void;
}

const storedUser = localStorage.getItem('library_user');
const storedToken = localStorage.getItem('library_token');

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken || null,
  setAuth: (user, token) => {
    localStorage.setItem('library_user', JSON.stringify(user));
    localStorage.setItem('library_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('library_user');
    localStorage.removeItem('library_token');
    set({ user: null, token: null });
  },
}));
