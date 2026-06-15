import { create } from "zustand";
import type { Sculpture, SculptureCard } from "./types";

interface StoreState {
  currentSculpture: Sculpture | null;
  featuredSculptures: SculptureCard[];
  searchResults: SculptureCard[];
  favorites: SculptureCard[];
  isRecording: boolean;
  isUploading: boolean;
  selectedBandIndex: number | null;

  setCurrentSculpture: (sculpture: Sculpture | null) => void;
  setFeaturedSculptures: (sculptures: SculptureCard[]) => void;
  setSearchResults: (sculptures: SculptureCard[]) => void;
  setFavorites: (sculptures: SculptureCard[]) => void;
  setIsRecording: (value: boolean) => void;
  setIsUploading: (value: boolean) => void;
  setSelectedBandIndex: (index: number | null) => void;

  fetchRandomSculpture: () => Promise<void>;
  fetchFeaturedSculptures: () => Promise<void>;
  searchSculptures: (query: string) => Promise<void>;
  fetchSculptureDetail: (id: string) => Promise<void>;
  toggleFavorite: (sculptureId: string) => Promise<void>;
  uploadAudio: (blob: Blob, name: string) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  currentSculpture: null,
  featuredSculptures: [],
  searchResults: [],
  favorites: [],
  isRecording: false,
  isUploading: false,
  selectedBandIndex: null,

  setCurrentSculpture: (sculpture) => set({ currentSculpture: sculpture }),
  setFeaturedSculptures: (sculptures) => set({ featuredSculptures: sculptures }),
  setSearchResults: (sculptures) => set({ searchResults: sculptures }),
  setFavorites: (sculptures) => set({ favorites: sculptures }),
  setIsRecording: (value) => set({ isRecording: value }),
  setIsUploading: (value) => set({ isUploading: value }),
  setSelectedBandIndex: (index) => set({ selectedBandIndex: index }),

  fetchRandomSculpture: async () => {
    const res = await fetch("/api/sculptures/random");
    if (!res.ok) throw new Error("Failed to fetch random sculpture");
    const sculpture: Sculpture = await res.json();
    set({ currentSculpture: sculpture });
  },

  fetchFeaturedSculptures: async () => {
    const res = await fetch("/api/sculptures/featured");
    if (!res.ok) throw new Error("Failed to fetch featured sculptures");
    const sculptures: SculptureCard[] = await res.json();
    set({ featuredSculptures: sculptures });
  },

  searchSculptures: async (query) => {
    const res = await fetch(`/api/sculptures/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Failed to search sculptures");
    const sculptures: SculptureCard[] = await res.json();
    set({ searchResults: sculptures });
  },

  fetchSculptureDetail: async (id) => {
    const res = await fetch(`/api/sculptures/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Failed to fetch sculpture detail");
    const sculpture: Sculpture = await res.json();
    set({ currentSculpture: sculpture });
  },

  toggleFavorite: async (sculptureId) => {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sculptureId }),
    });
    if (!res.ok) throw new Error("Failed to toggle favorite");
    const favorites: SculptureCard[] = await res.json();
    set({ favorites });
  },

  uploadAudio: async (blob, name) => {
    set({ isUploading: true });
    try {
      const formData = new FormData();
      formData.append("audio", blob, name);
      const res = await fetch("/api/sculptures", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload audio");
      const sculpture: Sculpture = await res.json();
      set({ currentSculpture: sculpture });
    } finally {
      set({ isUploading: false });
    }
  },
}));
