import { create } from 'zustand'
import type { StoreType, Layer, Marker, RippleEffect, FossilData } from './types'

export const useStore = create<StoreType>((set) => ({
  layers: [],
  markers: [],
  selectedLayer: null,
  selectedLayerScreenPos: null,
  eraSliderValue: 0,
  showFossils: false,
  isDepositing: false,
  depositProgress: -1,
  ripples: [],
  fossils: [],
  editingMarker: null,
  newMarkerPosition: null,
  isMobile: false,
  infoPanelVisible: false,
  loading: false,

  setLayers: (layers: Layer[]) => set({ layers }),
  setMarkers: (markers: Marker[]) => set({ markers }),
  addMarker: (marker: Marker) => set((state) => ({ markers: [...state.markers, marker] })),
  deleteMarker: (id: string) => set((state) => ({
    markers: state.markers.filter((m) => m.id !== id),
  })),
  selectLayer: (layer: Layer | null, screenPos?: { x: number; y: number } | null) => set({
    selectedLayer: layer,
    selectedLayerScreenPos: screenPos ?? null,
    infoPanelVisible: layer !== null,
  }),
  setEraSliderValue: (value: number) => set({ eraSliderValue: value }),
  setShowFossils: (show: boolean) => set({ showFossils: show }),
  startDeposition: () => set({ isDepositing: true, depositProgress: -1 }),
  setDepositProgress: (progress: number) => set({ depositProgress: progress }),
  addRipple: (ripple: RippleEffect) => set((state) => ({
    ripples: [...state.ripples, ripple],
  })),
  removeRipple: (id: string) => set((state) => ({
    ripples: state.ripples.filter((r) => r.id !== id),
  })),
  setFossils: (fossils: FossilData[]) => set({ fossils }),
  setEditingMarker: (marker: Marker | null) => set({ editingMarker: marker }),
  setNewMarkerPosition: (pos: { x: number; y: number; z: number; layerId: string } | null) =>
    set({ newMarkerPosition: pos }),
  setIsMobile: (isMobile: boolean) => set({ isMobile }),
  setInfoPanelVisible: (visible: boolean) => set({ infoPanelVisible: visible }),
  setLoading: (loading: boolean) => set({ loading }),
  resetDeposition: () => set({ isDepositing: false, depositProgress: -1 }),
}))
