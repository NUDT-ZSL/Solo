import { create } from 'zustand';

export interface Gallery {
  id: number;
  name: string;
  description: string;
  theme: string;
}

export interface Exhibit {
  id: number;
  galleryId: number;
  name: string;
  description: string;
  modelType: 'sphere' | 'torus';
  color: string;
  category: 'sculpture' | 'painting' | 'installation';
  position: { x: number; y: number; z: number };
}

interface AppState {
  galleries: Gallery[];
  currentGalleryId: number | null;
  currentGallery: Gallery | null;
  exhibits: Exhibit[];
  selectedExhibit: Exhibit | null;
  filterCategory: 'all' | 'sculpture' | 'painting' | 'installation';
  themeMode: 'day' | 'night';
  isLoading: boolean;
  isTransitioning: boolean;
  loadGalleries: () => Promise<void>;
  loadGallery: (id: number) => Promise<void>;
  selectExhibit: (exhibit: Exhibit | null) => void;
  setFilterCategory: (cat: AppState['filterCategory']) => void;
  toggleThemeMode: () => void;
  logUserAction: (type: string, data?: any) => void;
}

export const useStore = create<AppState>((set, get) => ({
  galleries: [],
  currentGalleryId: null,
  currentGallery: null,
  exhibits: [],
  selectedExhibit: null,
  filterCategory: 'all',
  themeMode: 'day',
  isLoading: false,
  isTransitioning: false,

  loadGalleries: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/galleries');
      if (!response.ok) throw new Error('Failed to load galleries');
      const data = await response.json();
      set({ galleries: data });
    } catch (error) {
      console.error('Error loading galleries:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadGallery: async (id: number) => {
    const state = get();
    if (state.currentGalleryId === id && state.exhibits.length > 0) return;
    
    set({ isTransitioning: true, isLoading: true });
    try {
      const response = await fetch(`/api/galleries/${id}`);
      if (!response.ok) throw new Error('Failed to load gallery');
      const data = await response.json();
      set({
        currentGalleryId: id,
        currentGallery: data.gallery,
        exhibits: data.exhibits,
        selectedExhibit: null,
      });
      get().logUserAction('gallery_load', { galleryId: id });
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setTimeout(() => {
        set({ isTransitioning: false, isLoading: false });
      }, 500);
    }
  },

  selectExhibit: (exhibit: Exhibit | null) => {
    set({ selectedExhibit: exhibit });
    if (exhibit) {
      get().logUserAction('exhibit_select', { exhibitId: exhibit.id, name: exhibit.name });
    }
  },

  setFilterCategory: (cat: AppState['filterCategory']) => {
    set({ filterCategory: cat });
    get().logUserAction('filter_change', { category: cat });
  },

  toggleThemeMode: () => {
    const newMode = get().themeMode === 'day' ? 'night' : 'day';
    set({ themeMode: newMode });
    get().logUserAction('theme_toggle', { mode: newMode });
  },

  logUserAction: async (type: string, data?: any) => {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Error logging user action:', error);
    }
  },
}));

export type { AppState };
