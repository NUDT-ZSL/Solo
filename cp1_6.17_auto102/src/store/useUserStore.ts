import { create } from 'zustand';
import type { User } from '../../shared/types';

interface UserState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  clearUser: () => void;
}

const STORAGE_KEY = 'book_club_current_user';

const loadFromStorage = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export const useUserStore = create<UserState>((set) => ({
  currentUser: loadFromStorage(),
  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ currentUser: user });
  },
  clearUser: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ currentUser: null });
  },
}));
