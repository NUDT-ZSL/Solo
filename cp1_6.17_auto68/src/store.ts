import { create } from 'zustand'

export const COLOR_PALETTE = ['#E91E63', '#3F51B5', '#4CAF50', '#FF9800'] as const

export interface Member {
  id: string
  name: string
  color: string
}

export interface MarkerPoint {
  id: string
  memberId: string
  lat: number
  lng: number
  name: string
  duration: number
  note: string
  imageLabel: string
  imageColor: string
  createdAt: number
  isNew?: boolean
}

export interface RouteData {
  order: string[]
  totalDistance: number
  totalHours: number
  distances: number[]
}

export interface UIState {
  expandedMemberId: string | null
  showMarkerForm: boolean
  formPosition: { lat: number; lng: number } | null
  isGeneratingRoute: boolean
  routeError: string | null
}

interface TravelStore {
  members: Member[]
  markers: MarkerPoint[]
  route: RouteData | null
  currentMemberId: string
  ui: UIState
  addMember: (name: string) => void
  setCurrentMember: (id: string) => void
  toggleMemberExpand: (id: string) => void
  addMarker: (marker: Omit<MarkerPoint, 'id' | 'createdAt' | 'isNew'>) => void
  removeMarker: (id: string) => void
  updateMarkerPosition: (id: string, lat: number, lng: number) => void
  openMarkerForm: (lat: number, lng: number) => void
  closeMarkerForm: () => void
  setRoute: (route: RouteData | null) => void
  setGeneratingRoute: (loading: boolean) => void
  setRouteError: (error: string | null) => void
  clearMarkersNewFlag: () => void
}

const defaultMembers: Member[] = [
  { id: '1', name: '小明', color: COLOR_PALETTE[0] },
  { id: '2', name: '小红', color: COLOR_PALETTE[1] },
  { id: '3', name: '小刚', color: COLOR_PALETTE[2] },
  { id: '4', name: '小丽', color: COLOR_PALETTE[3] }
]

export const useTravelStore = create<TravelStore>((set, get) => ({
  members: defaultMembers,
  markers: [],
  route: null,
  currentMemberId: defaultMembers[0].id,
  ui: {
    expandedMemberId: null,
    showMarkerForm: false,
    formPosition: null,
    isGeneratingRoute: false,
    routeError: null
  },
  addMember: (name) => {
    const state = get()
    const nextColor = COLOR_PALETTE[state.members.length % COLOR_PALETTE.length]
    const newMember: Member = {
      id: Date.now().toString(),
      name,
      color: nextColor
    }
    set((s) => ({ members: [...s.members, newMember] }))
  },
  setCurrentMember: (id) => set({ currentMemberId: id }),
  toggleMemberExpand: (id) =>
    set((s) => ({
      ui: {
        ...s.ui,
        expandedMemberId: s.ui.expandedMemberId === id ? null : id
      }
    })),
  addMarker: (marker) => {
    const newMarker: MarkerPoint = {
      ...marker,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      createdAt: Date.now(),
      isNew: true
    }
    set((s) => ({
      markers: [...s.markers, newMarker],
      route: null,
      ui: { ...s.ui, showMarkerForm: false, formPosition: null }
    }))
  },
  removeMarker: (id) =>
    set((s) => ({
      markers: s.markers.filter((m) => m.id !== id),
      route: null
    })),
  updateMarkerPosition: (id, lat, lng) =>
    set((s) => ({
      markers: s.markers.map((m) => (m.id === id ? { ...m, lat, lng } : m)),
      route: null
    })),
  openMarkerForm: (lat, lng) =>
    set((s) => ({
      ui: { ...s.ui, showMarkerForm: true, formPosition: { lat, lng } }
    })),
  closeMarkerForm: () =>
    set((s) => ({
      ui: { ...s.ui, showMarkerForm: false, formPosition: null }
    })),
  setRoute: (route) => set({ route }),
  setGeneratingRoute: (loading) =>
    set((s) => ({ ui: { ...s.ui, isGeneratingRoute: loading } })),
  setRouteError: (error) =>
    set((s) => ({ ui: { ...s.ui, routeError: error } })),
  clearMarkersNewFlag: () =>
    set((s) => ({
      markers: s.markers.map((m) => ({ ...m, isNew: false }))
    }))
}))
