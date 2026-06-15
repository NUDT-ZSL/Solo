import { create } from "zustand";
import type { Artwork } from "./types";

interface GalleryState {
  user: { token: string; username: string } | null;
  artworks: Artwork[];
  selectedArtwork: Artwork | null;
  isDetailOpen: boolean;
  isUploadOpen: boolean;
  isLoginOpen: boolean;
  isTablet: boolean;

  setUser: (user: { token: string; username: string } | null) => void;
  setArtworks: (artworks: Artwork[]) => void;
  addArtwork: (artwork: Artwork) => void;
  selectArtwork: (artwork: Artwork | null) => void;
  setDetailOpen: (open: boolean) => void;
  setUploadOpen: (open: boolean) => void;
  setLoginOpen: (open: boolean) => void;
  setTablet: (isTablet: boolean) => void;
  updateArtworkLike: (id: string, likes: string[], liked: boolean) => void;
  addComment: (artworkId: string, comment: { id: string; username: string; content: string; created_at: string }) => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  user: null,
  artworks: [],
  selectedArtwork: null,
  isDetailOpen: false,
  isUploadOpen: false,
  isLoginOpen: false,
  isTablet: false,

  setUser: (user) => set({ user }),
  setArtworks: (artworks) => set({ artworks }),
  addArtwork: (artwork) =>
    set((state) => ({ artworks: [...state.artworks, artwork] })),
  selectArtwork: (artwork) =>
    set({ selectedArtwork: artwork, isDetailOpen: artwork !== null }),
  setDetailOpen: (open) =>
    set((state) => ({
      isDetailOpen: open,
      selectedArtwork: open ? state.selectedArtwork : null,
    })),
  setUploadOpen: (open) => set({ isUploadOpen: open }),
  setLoginOpen: (open) => set({ isLoginOpen: open }),
  setTablet: (isTablet) => set({ isTablet }),
  updateArtworkLike: (id, likes, _liked) =>
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.id === id ? { ...a, likes } : a
      ),
      selectedArtwork:
        state.selectedArtwork?.id === id
          ? { ...state.selectedArtwork, likes }
          : state.selectedArtwork,
    })),
  addComment: (artworkId, comment) =>
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.id === artworkId
          ? { ...a, comments: [...a.comments, comment] }
          : a
      ),
      selectedArtwork:
        state.selectedArtwork?.id === artworkId
          ? {
              ...state.selectedArtwork,
              comments: [...state.selectedArtwork.comments, comment],
            }
          : state.selectedArtwork,
    })),
}));
