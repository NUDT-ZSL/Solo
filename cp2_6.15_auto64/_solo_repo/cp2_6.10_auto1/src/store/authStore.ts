import { create } from 'zustand';
import { authApi, type UserInfo, type AuthResult } from '../api/authApi';

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  setAuth: (result: AuthResult) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('auth_token'),
  user: null,
  isLoading: false,

  setAuth: (result: AuthResult) => {
    localStorage.setItem('auth_token', result.token);
    set({
      token: result.token,
      user: result.user,
      isLoading: false,
    });
  },

  clearAuth: () => {
    localStorage.removeItem('auth_token');
    set({
      token: null,
      user: null,
      isLoading: false,
    });
  },

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await authApi.login(username, password);
      localStorage.setItem('auth_token', result.token);
      set({
        token: result.token,
        user: result.user,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await authApi.register(username, password);
      localStorage.setItem('auth_token', result.token);
      set({
        token: result.token,
        user: result.user,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('auth_token');
    set({ token: null, user: null, isLoading: false });
  },

  checkAuth: async (): Promise<boolean> => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ token: null, user: null });
      return false;
    }

    set({ isLoading: true });
    try {
      const user = await authApi.getMe();
      set({ token, user, isLoading: false });
      return true;
    } catch {
      localStorage.removeItem('auth_token');
      set({ token: null, user: null, isLoading: false });
      return false;
    }
  },
}));
