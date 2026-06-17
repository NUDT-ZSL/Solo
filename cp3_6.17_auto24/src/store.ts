import { create } from 'zustand'
import type { Video, Marker } from './types'

interface AppState {
  videos: Video[]
  markers: Marker[]
  selectedVideo: Video | null
  currentTime: number
  isPlayerOpen: boolean
  selectedMarkers: Set<string>

  setVideos: (videos: Video[]) => void
  addVideo: (video: Video) => void
  setMarkers: (markers: Marker[]) => void
  addMarker: (marker: Marker) => void
  removeMarker: (id: string) => void
  updateMarker: (id: string, updates: Partial<Marker>) => void
  reorderMarkers: (markers: Marker[]) => void
  setSelectedVideo: (video: Video | null) => void
  setCurrentTime: (time: number) => void
  setIsPlayerOpen: (open: boolean) => void
  toggleMarkerSelection: (id: string) => void
  clearMarkerSelection: () => void
}

export const useAppStore = create<AppState>((set) => ({
  videos: [],
  markers: [],
  selectedVideo: null,
  currentTime: 0,
  isPlayerOpen: false,
  selectedMarkers: new Set(),

  setVideos: (videos) => set({ videos }),
  addVideo: (video) => set((state) => ({ videos: [...state.videos, video] })),
  setMarkers: (markers) => set({ markers }),
  addMarker: (marker) => set((state) => ({ markers: [...state.markers, marker] })),
  removeMarker: (id) => set((state) => ({
    markers: state.markers.filter((m) => m.id !== id),
    selectedMarkers: (() => {
      const next = new Set(state.selectedMarkers)
      next.delete(id)
      return next
    })()
  })),
  updateMarker: (id, updates) => set((state) => ({
    markers: state.markers.map((m) =>
      m.id === id ? { ...m, ...updates } : m
    )
  })),
  reorderMarkers: (markers) => set({ markers }),
  setSelectedVideo: (video) => set({ selectedVideo: video }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlayerOpen: (open) => set({ isPlayerOpen: open }),
  toggleMarkerSelection: (id) => set((state) => {
    const next = new Set(state.selectedMarkers)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    return { selectedMarkers: next }
  }),
  clearMarkerSelection: () => set({ selectedMarkers: new Set() }),
}))
