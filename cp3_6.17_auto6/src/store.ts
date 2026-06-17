import { create } from 'zustand';
import type { Video, Marker } from './types';

interface AppState {
  videos: Video[];
  markers: Marker[];
  selectedVideoId: string | null;
  playingVideoId: string | null;
  seekTimestamp: number | null;
  selectedMarkerIds: Set<string>;

  setVideos: (videos: Video[]) => void;
  addVideo: (video: Video) => void;
  removeVideo: (id: string) => void;
  updateVideo: (id: string, data: Partial<Video>) => void;

  setMarkers: (markers: Marker[]) => void;
  addMarker: (marker: Marker) => void;
  removeMarker: (id: string) => void;
  updateMarker: (id: string, data: Partial<Marker>) => void;

  setSelectedVideo: (id: string | null) => void;
  setPlayingVideo: (id: string | null) => void;
  setSeekTimestamp: (ts: number | null) => void;

  toggleMarkerSelection: (id: string) => void;
  clearMarkerSelection: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  videos: [],
  markers: [],
  selectedVideoId: null,
  playingVideoId: null,
  seekTimestamp: null,
  selectedMarkerIds: new Set(),

  setVideos: (videos) => set({ videos }),
  addVideo: (video) => set((s) => ({ videos: [...s.videos, video] })),
  removeVideo: (id) => set((s) => ({
    videos: s.videos.filter(v => v.id !== id),
    markers: s.markers.filter(m => m.videoId !== id)
  })),
  updateVideo: (id, data) => set((s) => ({
    videos: s.videos.map(v => v.id === id ? { ...v, ...data } : v)
  })),

  setMarkers: (markers) => set({ markers }),
  addMarker: (marker) => set((s) => ({ markers: [...s.markers, marker] })),
  removeMarker: (id) => set((s) => ({
    markers: s.markers.filter(m => m.id !== id),
    selectedMarkerIds: (() => {
      const ns = new Set(s.selectedMarkerIds);
      ns.delete(id);
      return ns;
    })()
  })),
  updateMarker: (id, data) => set((s) => ({
    markers: s.markers.map(m => m.id === id ? { ...m, ...data } : m)
  })),

  setSelectedVideo: (id) => set({ selectedVideoId: id }),
  setPlayingVideo: (id) => set({ playingVideoId: id }),
  setSeekTimestamp: (ts) => set({ seekTimestamp: ts }),

  toggleMarkerSelection: (id) => set((s) => {
    const ns = new Set(s.selectedMarkerIds);
    if (ns.has(id)) ns.delete(id);
    else ns.add(id);
    return { selectedMarkerIds: ns };
  }),
  clearMarkerSelection: () => set({ selectedMarkerIds: new Set() })
}));
