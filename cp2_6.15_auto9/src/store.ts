import { create } from 'zustand';
import type { User, ReadingListItem } from './types';

interface AppState {
  currentUser: User | null;
  readingList: ReadingListItem[];
  sidebarOpen: boolean;
  setCurrentUser: (user: User | null) => void;
  setReadingList: (list: ReadingListItem[]) => void;
  addReadingItem: (item: ReadingListItem) => void;
  removeReadingItem: (id: number) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  readingList: [],
  sidebarOpen: false,
  setCurrentUser: (user) => set({ currentUser: user }),
  setReadingList: (list) => set({ readingList: list }),
  addReadingItem: (item) =>
    set((state) => ({
      readingList: [item, ...state.readingList.filter((i) => i.id !== item.id)]
    })),
  removeReadingItem: (id) =>
    set((state) => ({
      readingList: state.readingList.filter((i) => i.id !== id)
    })),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open })
}));
