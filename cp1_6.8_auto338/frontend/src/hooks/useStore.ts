import { create } from 'zustand';
import type { Poem, SearchResult } from '@/utils/api';
import * as api from '@/utils/api';

interface StoreState {
  recentPoems: Poem[];
  searchResults: SearchResult[];
  searchQuery: string;
  isSubmitting: boolean;
  isSearching: boolean;
  submitPoem: (content: string) => Promise<void>;
  fetchRecentPoems: () => Promise<void>;
  searchPoems: (query: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  recentPoems: [],
  searchResults: [],
  searchQuery: '',
  isSubmitting: false,
  isSearching: false,

  submitPoem: async (content: string) => {
    set({ isSubmitting: true });
    try {
      const poem = await api.submitLine(content);
      set((state) => ({
        recentPoems: [poem, ...state.recentPoems],
        isSubmitting: false,
      }));
    } catch {
      set({ isSubmitting: false });
    }
  },

  fetchRecentPoems: async () => {
    try {
      const poems = await api.getRecentPoems();
      set({ recentPoems: poems });
    } catch {}
  },

  searchPoems: async (query: string) => {
    set({ isSearching: true, searchQuery: query });
    try {
      const results = await api.searchPoems(query);
      set({ searchResults: results, isSearching: false });
    } catch {
      set({ isSearching: false });
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
}));
