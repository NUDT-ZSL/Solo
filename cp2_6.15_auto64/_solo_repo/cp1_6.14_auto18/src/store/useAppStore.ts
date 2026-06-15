import { create } from 'zustand';
import type { User } from '../../server/models';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  currentUser: User | null;
  toasts: Toast[];
  setCurrentUser: (user: User | null) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  toasts: [],

  setCurrentUser: (user) => set({ currentUser: user }),

  addToast: (message, type = 'success') => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type };
    set({ toasts: [...get().toasts, newToast] });

    setTimeout(() => {
      get().removeToast(id);
    }, 2000);
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));
