import { create } from 'zustand';
import type { User } from './api';
import { getSavedUser, logout as apiLogout } from './api';

interface AppState {
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: getSavedUser(),
  setUser: (u) => {
    if (u) localStorage.setItem('skillswap_user', JSON.stringify(u));
    set({ user: u });
  },
  logout: () => {
    apiLogout();
    set({ user: null });
  },
}));
