import { create } from 'zustand';
import type { User, Workshop, Toast } from '../types';

interface AppState {
  user: User | null;
  userId: string | null;
  workshops: Workshop[];
  toasts: Toast[];
  
  setUser: (user: User | null) => void;
  setUserId: (id: string | null) => void;
  setWorkshops: (workshops: Workshop[]) => void;
  updateWorkshop: (workshop: Workshop) => void;
  addWorkshop: (workshop: Workshop) => void;
  
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  
  logout: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  userId: null,
  workshops: [],
  toasts: [],

  setUser: (user) => set({ user }),
  setUserId: (userId) => set({ userId }),
  setWorkshops: (workshops) => set({ workshops }),
  
  updateWorkshop: (workshop) => set((state) => ({
    workshops: state.workshops.map(w => 
      w.id === workshop.id ? workshop : w
    )
  })),
  
  addWorkshop: (workshop) => set((state) => ({
    workshops: [...state.workshops, workshop]
  })),

  addToast: (text, type = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, text, type };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 2500);
  },
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  logout: () => {
    set({ user: null, userId: null });
    localStorage.removeItem('userId');
  },
}));
