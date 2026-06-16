import { create } from 'zustand';
import type { Video, Marker, PresetLabel } from './types';

interface AppState {
  videos: Video[];
  markers: Marker[];
  presetLabels: PresetLabel[];
  selectedMarkers: string[];
  currentVideo: Video | null;
  isPlayerOpen: boolean;
  currentTime: number;
  isPlaying: boolean;
  hoveredMarker: Marker | null;

  setVideos: (videos: Video[]) => void;
  addVideo: (video: Video) => void;
  removeVideo: (id: string) => void;
  setMarkers: (markers: Marker[]) => void;
  addMarker: (marker: Marker) => void;
  updateMarker: (marker: Marker) => void;
  removeMarker: (id: string) => void;
  setPresetLabels: (labels: PresetLabel[]) => void;
  toggleMarkerSelection: (id: string) => void;
  clearSelection: () => void;
  selectAllMarkers: () => void;
  setCurrentVideo: (video: Video | null) => void;
  setIsPlayerOpen: (open: boolean) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setHoveredMarker: (marker: Marker | null) => void;

  fetchVideos: () => Promise<void>;
  fetchMarkers: () => Promise<void>;
  fetchPresetLabels: () => Promise<void>;
  uploadVideo: (file: File) => Promise<Video | null>;
  createMarker: (data: Omit<Marker, 'id' | 'order' | 'createdAt'>) => Promise<Marker | null>;
  deleteMarker: (id: string) => Promise<void>;
  reorderMarker: (id: string, newOrder: number) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  videos: [],
  markers: [],
  presetLabels: [],
  selectedMarkers: [],
  currentVideo: null,
  isPlayerOpen: false,
  currentTime: 0,
  isPlaying: false,
  hoveredMarker: null,

  setVideos: (videos) => set({ videos }),
  addVideo: (video) => set((state) => ({ videos: [...state.videos, video] })),
  removeVideo: (id) => set((state) => ({
    videos: state.videos.filter(v => v.id !== id),
    markers: state.markers.filter(m => m.videoId !== id)
  })),
  setMarkers: (markers) => set({ markers }),
  addMarker: (marker) => set((state) => ({ markers: [...state.markers, marker] })),
  updateMarker: (marker) => set((state) => ({
    markers: state.markers.map(m => m.id === marker.id ? marker : m)
  })),
  removeMarker: (id) => set((state) => ({
    markers: state.markers.filter(m => m.id !== id),
    selectedMarkers: state.selectedMarkers.filter(s => s !== id)
  })),
  setPresetLabels: (labels) => set({ presetLabels: labels }),
  toggleMarkerSelection: (id) => set((state) => ({
    selectedMarkers: state.selectedMarkers.includes(id)
      ? state.selectedMarkers.filter(s => s !== id)
      : [...state.selectedMarkers, id]
  })),
  clearSelection: () => set({ selectedMarkers: [] }),
  selectAllMarkers: () => set((state) => ({
    selectedMarkers: state.markers.map(m => m.id)
  })),
  setCurrentVideo: (video) => set({ currentVideo: video, currentTime: 0 }),
  setIsPlayerOpen: (open) => set({ isPlayerOpen: open }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setHoveredMarker: (marker) => set({ hoveredMarker: marker }),

  fetchVideos: async () => {
    try {
      const res = await fetch('/api/videos');
      const data = await res.json();
      set({ videos: data });
    } catch (e) {
      console.error('Failed to fetch videos:', e);
    }
  },

  fetchMarkers: async () => {
    try {
      const res = await fetch('/api/markers');
      const data = await res.json();
      set({ markers: data });
    } catch (e) {
      console.error('Failed to fetch markers:', e);
    }
  },

  fetchPresetLabels: async () => {
    try {
      const res = await fetch('/api/preset-labels');
      const data = await res.json();
      set({ presetLabels: data });
    } catch (e) {
      console.error('Failed to fetch labels:', e);
    }
  },

  uploadVideo: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('video', file);
      const res = await fetch('/api/videos', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      set((state) => ({ videos: [...state.videos, data] }));
      return data;
    } catch (e) {
      console.error('Failed to upload video:', e);
      return null;
    }
  },

  createMarker: async (data) => {
    try {
      const res = await fetch('/api/markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Create failed');
      const marker = await res.json();
      set((state) => ({ markers: [...state.markers, marker] }));
      return marker;
    } catch (e) {
      console.error('Failed to create marker:', e);
      return null;
    }
  },

  deleteMarker: async (id) => {
    try {
      await fetch(`/api/markers/${id}`, { method: 'DELETE' });
      set((state) => ({
        markers: state.markers.filter(m => m.id !== id),
        selectedMarkers: state.selectedMarkers.filter(s => s !== id)
      }));
    } catch (e) {
      console.error('Failed to delete marker:', e);
    }
  },

  reorderMarker: async (id, newOrder) => {
    try {
      const res = await fetch(`/api/markers/${id}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOrder })
      });
      if (!res.ok) throw new Error('Reorder failed');
      const updated = await res.json();
      const state = get();
      const otherMarkers = state.markers.filter(m => m.videoId !== updated[0]?.videoId);
      set({ markers: [...otherMarkers, ...updated] });
    } catch (e) {
      console.error('Failed to reorder marker:', e);
    }
  }
}));

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
