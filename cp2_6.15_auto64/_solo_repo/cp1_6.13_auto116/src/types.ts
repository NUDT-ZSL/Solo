export type { Layer, Marker, FossilData, RippleEffect } from '../shared/types'
export {
  LITHOLOGY_COLORS,
  LITHOLOGY_NAMES,
  LITHOLOGY_DESCRIPTIONS,
  ERAS,
  FOSSIL_TYPES,
} from '../shared/types'

export interface AppState {
  layers: Layer[]
  markers: Marker[]
  selectedLayer: Layer | null
  selectedLayerScreenPos: { x: number; y: number } | null
  eraSliderValue: number
  showFossils: boolean
  isDepositing: boolean
  depositProgress: number
  ripples: RippleEffect[]
  fossils: FossilData[]
  editingMarker: Marker | null
  newMarkerPosition: { x: number; y: number; z: number; layerId: string } | null
  isMobile: boolean
  infoPanelVisible: boolean
  loading: boolean
}

export interface AppActions {
  setLayers: (layers: Layer[]) => void
  setMarkers: (markers: Marker[]) => void
  addMarker: (marker: Marker) => void
  deleteMarker: (id: string) => void
  selectLayer: (layer: Layer | null, screenPos?: { x: number; y: number } | null) => void
  setEraSliderValue: (value: number) => void
  setShowFossils: (show: boolean) => void
  startDeposition: () => void
  setDepositProgress: (progress: number) => void
  addRipple: (ripple: RippleEffect) => void
  removeRipple: (id: string) => void
  setFossils: (fossils: FossilData[]) => void
  setEditingMarker: (marker: Marker | null) => void
  setNewMarkerPosition: (pos: { x: number; y: number; z: number; layerId: string } | null) => void
  setIsMobile: (isMobile: boolean) => void
  setInfoPanelVisible: (visible: boolean) => void
  setLoading: (loading: boolean) => void
  resetDeposition: () => void
}

export type StoreType = AppState & AppActions
