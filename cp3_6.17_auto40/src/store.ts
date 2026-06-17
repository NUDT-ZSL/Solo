import { create } from 'zustand';
import type { Video, Marker } from './types';

interface UploadProgress {
  [key: string]: number;
}

interface State {
  videos: Video[];
  currentVideo: Video | null;
  markers: Marker[];
  selectedMarkerIds: Set<string>;
  isPlayerOpen: boolean;
  seekToTime: number | null;
  isLoading: boolean;
  uploadProgress: UploadProgress;
}

interface Actions {
  fetchVideos: () => Promise<void>;
  uploadVideo: (file: File, duration: number) => Promise<Video | undefined>;
  deleteVideo: (id: string) => Promise<void>;
  addMarker: (payload: Omit<Marker, 'id'>) => Promise<Marker | undefined>;
  updateMarker: (id: string, data: Partial<Marker>) => Promise<Marker | undefined>;
  deleteMarker: (id: string) => Promise<void>;
  setCurrentVideo: (video: Video | null) => void;
  setPlayerOpen: (open: boolean) => void;
  setSeekToTime: (seconds: number | null) => void;
  toggleMarkerSelection: (id: string) => void;
  clearMarkerSelection: () => void;
  reorderMarker: (id: string, newOrder: number) => Promise<void>;
}

export const useStore = create<State & Actions>((set, get) => ({
  videos: [],
  currentVideo: null,
  markers: [],
  selectedMarkerIds: new Set(),
  isPlayerOpen: false,
  seekToTime: null,
  isLoading: false,
  uploadProgress: {},

  fetchVideos: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/videos');
      if (!res.ok) throw new Error('Failed to fetch videos');
      const videos = await res.json();
      set({ videos });
    } catch (error) {
      console.error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  uploadVideo: async (file: File, duration: number) => {
    const tempId = `uploading-${Date.now()}`;
    set({ uploadProgress: { ...get().uploadProgress, [tempId]: 0 } });

    return new Promise<Video | undefined>((resolve) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('duration', String(duration));

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          set({ uploadProgress: { ...get().uploadProgress, [tempId]: percent } });
        }
      };

      xhr.onload = () => {
        const progress = { ...get().uploadProgress };
        delete progress[tempId];
        set({ uploadProgress: progress });

        if (xhr.status >= 200 && xhr.status < 300) {
          const video: Video = JSON.parse(xhr.responseText);
          set({ videos: [...get().videos, video] });
          resolve(video);
        } else {
          console.error('Upload failed', xhr.statusText);
          resolve(undefined);
        }
      };

      xhr.onerror = () => {
        const progress = { ...get().uploadProgress };
        delete progress[tempId];
        set({ uploadProgress: progress });
        console.error('Upload error');
        resolve(undefined);
      };

      xhr.open('POST', '/api/videos');
      xhr.send(formData);
    });
  },

  deleteVideo: async (id: string) => {
    try {
      const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete video');
      set({
        videos: get().videos.filter((v) => v.id !== id),
        markers: get().markers.filter((m) => m.videoId !== id),
        currentVideo: get().currentVideo?.id === id ? null : get().currentVideo,
      });
    } catch (error) {
      console.error(error);
    }
  },

  addMarker: async (payload: Omit<Marker, 'id'>) => {
    try {
      const res = await fetch('/api/markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to add marker');
      const marker: Marker = await res.json();
      set({ markers: [...get().markers, marker] });
      return marker;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  },

  updateMarker: async (id: string, data: Partial<Marker>) => {
    try {
      const res = await fetch(`/api/markers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update marker');
      const updated: Marker = await res.json();
      set({
        markers: get().markers.map((m) => (m.id === id ? updated : m)),
      });
      return updated;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  },

  deleteMarker: async (id: string) => {
    try {
      const res = await fetch(`/api/markers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete marker');
      const selected = new Set(get().selectedMarkerIds);
      selected.delete(id);
      set({
        markers: get().markers.filter((m) => m.id !== id),
        selectedMarkerIds: selected,
      });
    } catch (error) {
      console.error(error);
    }
  },

  setCurrentVideo: (video: Video | null) => {
    set({
      currentVideo: video,
      markers: video ? get().markers.filter((m) => m.videoId === video.id) : [],
      selectedMarkerIds: new Set(),
    });
  },

  setPlayerOpen: (open: boolean) => set({ isPlayerOpen: open }),

  setSeekToTime: (seconds: number | null) => set({ seekToTime: seconds }),

  toggleMarkerSelection: (id: string) => {
    const selected = new Set(get().selectedMarkerIds);
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    set({ selectedMarkerIds: selected });
  },

  clearMarkerSelection: () => set({ selectedMarkerIds: new Set() }),

  reorderMarker: async (id: string, newOrder: number) => {
    try {
      const res = await fetch(`/api/markers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      });
      if (!res.ok) throw new Error('Failed to reorder marker');
      const updated: Marker = await res.json();
      set({
        markers: get().markers.map((m) => (m.id === id ? updated : m)),
      });
    } catch (error) {
      console.error(error);
    }
  },
}));
