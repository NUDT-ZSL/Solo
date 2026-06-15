import { create } from 'zustand';
import type { MarkerData, UserData } from '@/types';

interface AppState {
  user: UserData | null;
  markers: MarkerData[];
  selectedMarker: MarkerData | null;
  searchQuery: string;
  filterTag: string;
  sortBy: string;
  userLocation: { lat: number; lng: number } | null;
  isCreating: boolean;
  createPosition: { lng: number; lat: number } | null;
  isLoading: boolean;

  setUser: (user: UserData | null) => void;
  setMarkers: (markers: MarkerData[]) => void;
  setSelectedMarker: (marker: MarkerData | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterTag: (tag: string) => void;
  setSortBy: (sort: string) => void;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  setIsCreating: (val: boolean) => void;
  setCreatePosition: (pos: { lng: number; lat: number } | null) => void;
  setIsLoading: (val: boolean) => void;
  updateMarker: (marker: MarkerData) => void;
  removeMarker: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  markers: [],
  selectedMarker: null,
  searchQuery: '',
  filterTag: '',
  sortBy: 'newest',
  userLocation: null,
  isCreating: false,
  createPosition: null,
  isLoading: false,

  setUser: (user) => set({ user }),
  setMarkers: (markers) => set({ markers }),
  setSelectedMarker: (marker) => set({ selectedMarker: marker }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterTag: (tag) => set({ filterTag: tag }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setUserLocation: (loc) => set({ userLocation: loc }),
  setIsCreating: (val) => set({ isCreating: val }),
  setCreatePosition: (pos) => set({ createPosition: pos }),
  setIsLoading: (val) => set({ isLoading: val }),
  updateMarker: (marker) =>
    set((state) => ({
      markers: state.markers.map((m) => (m.id === marker.id ? marker : m)),
      selectedMarker: state.selectedMarker?.id === marker.id ? marker : state.selectedMarker,
    })),
  removeMarker: (id) =>
    set((state) => ({
      markers: state.markers.filter((m) => m.id !== id),
      selectedMarker: state.selectedMarker?.id === id ? null : state.selectedMarker,
    })),
}));
