import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Trail, TrailDetail, DrawingMode, SortOption, ToastMessage } from '@/types';
import axios from 'axios';

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE_MB = 5;
const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

function getOrCreateUserId(): string {
  const stored = localStorage.getItem('trailverse_userId');
  if (stored) return stored;
  const id = uuidv4();
  localStorage.setItem('trailverse_userId', id);
  return id;
}

interface TrailStore {
  drawingMode: DrawingMode;
  setDrawingMode: (mode: DrawingMode) => void;
  drawnPoints: [number, number][];
  setDrawnPoints: (points: [number, number][]) => void;
  addDrawnPoint: (point: [number, number]) => void;
  clearDrawing: () => void;

  trails: Trail[];
  setTrails: (trails: Trail[]) => void;
  currentTrail: TrailDetail | null;
  loadTrails: (search?: string, sort?: SortOption, userId?: string) => Promise<void>;
  loadTrailDetail: (id: string) => Promise<void>;
  createTrail: (title: string, description: string, geojson: string) => Promise<string | null>;
  updateTrail: (id: string, title: string, description: string) => Promise<void>;
  deleteTrail: (id: string) => Promise<void>;

  uploadPhotos: (trailId: string, files: File[], onProgress?: (percent: number) => void) => Promise<void>;

  toggleFavorite: (trailId: string) => Promise<void>;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;

  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  userId: string;
}

export const useTrailStore = create<TrailStore>((set, get) => ({
  drawingMode: 'none',
  setDrawingMode: (mode) => set({ drawingMode: mode }),
  drawnPoints: [],
  setDrawnPoints: (points) => set({ drawnPoints: points }),
  addDrawnPoint: (point) => set((s) => ({ drawnPoints: [...s.drawnPoints, point] })),
  clearDrawing: () => set({ drawingMode: 'none', drawnPoints: [] }),

  trails: [],
  setTrails: (trails) => set({ trails }),
  currentTrail: null,

  loadTrails: async (search, sort, userId) => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (sort) params.sort = sort;
      if (userId) params.userId = userId;
      const res = await axios.get<Trail[]>('/api/trails/list', { params });
      set({ trails: res.data });
    } catch {
      get().addToast('Failed to load trails', 'error');
    }
  },

  loadTrailDetail: async (id) => {
    try {
      const res = await axios.get<TrailDetail>(`/api/trails/${id}`);
      const detail = res.data;
      if (typeof detail.trail.geojson === 'string') {
        try {
          detail.trail.geojson = JSON.parse(detail.trail.geojson);
        } catch {
          // keep raw string if parse fails
        }
      }
      set({ currentTrail: detail });
    } catch {
      get().addToast('Failed to load trail detail', 'error');
    }
  },

  createTrail: async (title, description, geojson) => {
    try {
      const res = await axios.post<{ id: string }>('/api/trails', {
        title,
        description,
        geojson,
        userId: get().userId,
      });
      get().addToast('Trail created!', 'success');
      return res.data.id;
    } catch {
      get().addToast('Failed to create trail', 'error');
      return null;
    }
  },

  updateTrail: async (id, title, description) => {
    try {
      await axios.put(`/api/trails/${id}`, { title, description });
      get().addToast('Trail updated!', 'success');
    } catch {
      get().addToast('Failed to update trail', 'error');
    }
  },

  deleteTrail: async (id) => {
    try {
      await axios.delete(`/api/trails/${id}`);
      set((s) => ({ trails: s.trails.filter((t) => t.id !== id) }));
      get().addToast('Trail deleted!', 'success');
    } catch {
      get().addToast('Failed to delete trail', 'error');
    }
  },

  uploadPhotos: async (trailId, files, onProgress) => {
    if (files.length > MAX_PHOTOS) {
      get().addToast(`Maximum ${MAX_PHOTOS} photos allowed`, 'error');
      return;
    }
    const oversized = files.find((f) => f.size > MAX_PHOTO_SIZE_BYTES);
    if (oversized) {
      get().addToast(`Each photo must be under ${MAX_PHOTO_SIZE_MB}MB`, 'error');
      return;
    }
    try {
      const form = new FormData();
      files.forEach((f) => form.append('photos', f));
      await axios.post(`/api/trails/${trailId}/photos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total && onProgress) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });
      get().addToast('Photos uploaded!', 'success');
    } catch {
      get().addToast('Failed to upload photos', 'error');
    }
  },

  toggleFavorite: async (trailId) => {
    try {
      await axios.post(`/api/trails/${trailId}/favorite`, { userId: get().userId });
      const current = get().currentTrail;
      if (current && current.trail.id === trailId) {
        const nextFav = !current.isFavorited;
        set({
          currentTrail: {
            ...current,
            isFavorited: nextFav,
            favoriteCount: nextFav
              ? current.favoriteCount + 1
              : Math.max(0, current.favoriteCount - 1),
          },
        });
      }
    } catch {
      get().addToast('Failed to toggle favorite', 'error');
    }
  },

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  sortOption: 'createdAt',
  setSortOption: (option) => set({ sortOption: option }),

  toasts: [],
  addToast: (message, type = 'info') => {
    const id = uuidv4();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({
        toasts: s.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      }));
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 300);
    }, 2500);
  },
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  userId: getOrCreateUserId(),
}));
