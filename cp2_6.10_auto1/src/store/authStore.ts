import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/authApi';

interface User {
  id: string;
  username: string;
  email?: string;
  createdAt?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        const response = await authApi.login({ username, password });
        const { token, user } = response.data;
        set({ token, user, isAuthenticated: true });
      },

      register: async (username: string, email: string, password: string) => {
        const response = await authApi.register({ username, email, password });
        const { token, user } = response.data;
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
        localStorage.removeItem('auth-storage');
      },

      checkAuth: async () => {
        const token = useAuthStore.getState().token;
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }
        try {
          const response = await authApi.getCurrentUser();
          set({ user: response.data, isAuthenticated: true });
        } catch {
          set({ token: null, user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
