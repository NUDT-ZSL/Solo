import { create } from 'zustand';
import type { Asset } from '@shared/types';

interface AppState {
  assets: Asset[];
  loading: boolean;
  searchQuery: string;
  userRole: 'buyer' | 'seller';
  currentUserId: string;
  favoritedIds: Set<string>;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;

  setAssets: (assets: Asset[]) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setUserRole: (role: 'buyer' | 'seller') => void;
  toggleFavorite: (assetId: string, favorites: number, isFavorited: boolean) => void;
  isFavorited: (assetId: string) => boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  assets: [],
  loading: false,
  searchQuery: '',
  userRole: 'buyer',
  currentUserId: 'user-001',
  favoritedIds: new Set(),
  toast: null,

  setAssets: (assets) => set({ assets }),
  setLoading: (loading) => set({ loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setUserRole: (role) => set({ userRole: role }),

  toggleFavorite: (assetId, favorites, isFavorited) => {
    const { favoritedIds, assets } = get();
    const newFavoritedIds = new Set(favoritedIds);

    if (isFavorited) {
      newFavoritedIds.add(assetId);
    } else {
      newFavoritedIds.delete(assetId);
    }

    const updatedAssets = assets.map((asset) =>
      asset._id === assetId ? { ...asset, favorites, isFavorited } : asset
    );

    set({
      favoritedIds: newFavoritedIds,
      assets: updatedAssets,
    });
  },

  isFavorited: (assetId) => get().favoritedIds.has(assetId),

  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => {
      set({ toast: null });
    }, 2000);
  },

  hideToast: () => set({ toast: null }),
}));
