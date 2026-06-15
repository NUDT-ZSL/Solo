import { create } from 'zustand';
import type { SoundMarker, User } from '../../shared/types';

interface AppState {
  user: User | null;
  markers: SoundMarker[];
  selectedMarker: SoundMarker | null;
  isCreating: boolean;
  createLatLng: { lat: number; lng: number } | null;
  editingMarker: SoundMarker | null;
  userLocation: { lat: number; lng: number } | null;
  searchQuery: string;
  filterTag: string;
  sortBy: string;
  sidebarOpen: boolean;
  mobileFilterOpen: boolean;

  setUser: (user: User | null) => void;
  setMarkers: (markers: SoundMarker[]) => void;
  addMarker: (marker: SoundMarker) => void;
  updateMarker: (id: string, updates: Partial<SoundMarker>) => void;
  removeMarker: (id: string) => void;
  selectMarker: (marker: SoundMarker | null) => void;
  setIsCreating: (val: boolean) => void;
  setCreateLatLng: (val: { lat: number; lng: number } | null) => void;
  setEditingMarker: (marker: SoundMarker | null) => void;
  setUserLocation: (val: { lat: number; lng: number } | null) => void;
  setSearchQuery: (q: string) => void;
  setFilterTag: (tag: string) => void;
  setSortBy: (sort: string) => void;
  setSidebarOpen: (val: boolean) => void;
  setMobileFilterOpen: (val: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  markers: [],
  selectedMarker: null,
  isCreating: false,
  createLatLng: null,
  editingMarker: null,
  userLocation: null,
  searchQuery: '',
  filterTag: '',
  sortBy: 'distance',
  sidebarOpen: false,
  mobileFilterOpen: false,

  setUser: (user) => set({ user }),
  setMarkers: (markers) => set({ markers }),
  addMarker: (marker) => set((s) => ({ markers: [...s.markers, marker] })),
  updateMarker: (id, updates) =>
    set((s) => ({
      markers: s.markers.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      selectedMarker:
        s.selectedMarker?.id === id
          ? { ...s.selectedMarker, ...updates }
          : s.selectedMarker,
    })),
  removeMarker: (id) =>
    set((s) => ({
      markers: s.markers.filter((m) => m.id !== id),
      selectedMarker: s.selectedMarker?.id === id ? null : s.selectedMarker,
    })),
  selectMarker: (marker) => set({ selectedMarker: marker }),
  setIsCreating: (val) => set({ isCreating: val }),
  setCreateLatLng: (val) => set({ createLatLng: val }),
  setEditingMarker: (marker) => set({ editingMarker: marker }),
  setUserLocation: (val) => set({ userLocation: val }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterTag: (tag) => set({ filterTag: tag }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setSidebarOpen: (val) => set({ sidebarOpen: val }),
  setMobileFilterOpen: (val) => set({ mobileFilterOpen: val }),
}));
