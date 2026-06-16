import { create } from 'zustand';
import type { Artist, Favorite } from '../types';

interface AppState {
  favorites: Array<Favorite & { artist: Artist }>;
  favoriteIds: Set<string>;
  searchHistory: string[];
  mobileNavOpen: boolean;
  sidebarOpen: boolean;
  setFavorites: (favs: Array<Favorite & { artist: Artist }>) => void;
  addFavorite: (fav: Favorite & { artist: Artist }) => void;
  removeFavorite: (artistId: string) => void;
  isFavorite: (artistId: string) => boolean;
  addSearchHistory: (term: string) => void;
  clearSearchHistory: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  favorites: [],
  favoriteIds: new Set(),
  searchHistory: JSON.parse(localStorage.getItem('searchHistory') || '[]'),
  mobileNavOpen: false,
  sidebarOpen: true,

  setFavorites: (favs) =>
    set({
      favorites: favs,
      favoriteIds: new Set(favs.map(f => f.artistId))
    }),

  addFavorite: (fav) =>
    set(state => ({
      favorites: [fav, ...state.favorites],
      favoriteIds: new Set([...state.favoriteIds, fav.artistId])
    })),

  removeFavorite: (artistId) =>
    set(state => {
      const ids = new Set(state.favoriteIds);
      ids.delete(artistId);
      return {
        favorites: state.favorites.filter(f => f.artistId !== artistId),
        favoriteIds: ids
      };
    }),

  isFavorite: (artistId) => get().favoriteIds.has(artistId),

  addSearchHistory: (term) => {
    const t = term.trim();
    if (!t) return;
    set(state => {
      const next = [t, ...state.searchHistory.filter(h => h !== t)].slice(0, 8);
      localStorage.setItem('searchHistory', JSON.stringify(next));
      return { searchHistory: next };
    });
  },

  clearSearchHistory: () => {
    localStorage.removeItem('searchHistory');
    set({ searchHistory: [] });
  },

  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setSidebarOpen: (open) => set({ sidebarOpen: open })
}));
