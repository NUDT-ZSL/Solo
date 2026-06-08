import { create } from 'zustand';
import type { AudioMarkerData, RouteData, HeatmapData, PlaybackState, MapViewState } from '@/types';

interface MapStore {
  routes: RouteData[];
  currentRoute: RouteData | null;
  markers: AudioMarkerData[];
  selectedMarker: AudioMarkerData | null;
  heatmapData: HeatmapData | null;
  playbackState: PlaybackState;
  currentPlayingId: string | null;
  volume: number;
  mapView: MapViewState;
  isPanelOpen: boolean;
  isRecording: boolean;
  showHeatmap: boolean;

  setRoutes: (routes: RouteData[]) => void;
  setCurrentRoute: (route: RouteData | null) => void;
  addMarker: (marker: AudioMarkerData) => void;
  removeMarker: (id: string) => void;
  setSelectedMarker: (marker: AudioMarkerData | null) => void;
  setHeatmapData: (data: HeatmapData | null) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setCurrentPlayingId: (id: string | null) => void;
  setVolume: (vol: number) => void;
  setMapView: (view: MapViewState) => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setIsRecording: (recording: boolean) => void;
  toggleHeatmap: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  routes: [],
  currentRoute: null,
  markers: [],
  selectedMarker: null,
  heatmapData: null,
  playbackState: 'idle',
  currentPlayingId: null,
  volume: 0.7,
  mapView: { center: [39.9042, 116.4074], zoom: 12 },
  isPanelOpen: true,
  isRecording: false,
  showHeatmap: false,

  setRoutes: (routes) => set({ routes }),
  setCurrentRoute: (route) => set({ currentRoute: route }),
  addMarker: (marker) => set((s) => ({ markers: [...s.markers, marker] })),
  removeMarker: (id) => set((s) => ({ markers: s.markers.filter((m) => m.id !== id) })),
  setSelectedMarker: (marker) => set({ selectedMarker: marker }),
  setHeatmapData: (data) => set({ heatmapData: data }),
  setPlaybackState: (state) => set({ playbackState: state }),
  setCurrentPlayingId: (id) => set({ currentPlayingId: id }),
  setVolume: (vol) => set({ volume: vol }),
  setMapView: (view) => set({ mapView: view }),
  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
  setPanelOpen: (open) => set({ isPanelOpen: open }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  toggleHeatmap: () => set((s) => ({ showHeatmap: !s.showHeatmap })),
}));
