import { create } from 'zustand'

export const MEMBER_COLORS = ['#E91E63', '#3F51B5', '#4CAF50', '#FF9800']

export interface Member {
  id: string
  name: string
  color: string
  avatar: string
}

export interface MarkerPoint {
  id: string
  memberId: string
  lat: number
  lng: number
  name: string
  stayHours: number
  note: string
  imageColor: string
  imageLabel: string
  createdAt: number
  isNew?: boolean
}

export interface RouteSegment {
  from: string
  to: string
  distanceKm: number
}

export interface RouteData {
  order: string[]
  totalDistanceKm: number
  totalHours: number
  segments: RouteSegment[]
}

export interface BudgetData {
  totalBudget: number
  breakdown: {
    transportation: number
    accommodation: number
    food: number
    activities: number
  }
}

interface UIState {
  expandedMemberId: string | null
  showAddForm: boolean
  formPosition: { lat: number; lng: number } | null
  currentMemberId: string
  isLoadingRoute: boolean
  isLoadingBudget: boolean
  mobileSidebarOpen: boolean
  mobileRouteOpen: boolean
}

interface TravelStore {
  members: Member[]
  markers: MarkerPoint[]
  route: RouteData | null
  budget: BudgetData | null
  ui: UIState

  addMarker: (marker: Omit<MarkerPoint, 'id' | 'createdAt' | 'isNew'>) => void
  updateMarker: (id: string, updates: Partial<MarkerPoint>) => void
  removeMarker: (id: string) => void

  setRoute: (route: RouteData | null) => void
  setBudget: (budget: BudgetData | null) => void

  toggleMemberExpanded: (memberId: string) => void
  setShowAddForm: (show: boolean, position?: { lat: number; lng: number }) => void
  setCurrentMemberId: (id: string) => void
  setLoadingRoute: (loading: boolean) => void
  setLoadingBudget: (loading: boolean) => void
  toggleMobileSidebar: () => void
  toggleMobileRoute: () => void

  clearNewAnimation: (markerId: string) => void
}

const initialMembers: Member[] = [
  { id: 'm1', name: '小明', color: MEMBER_COLORS[0], avatar: '明' },
  { id: 'm2', name: '小红', color: MEMBER_COLORS[1], avatar: '红' },
  { id: 'm3', name: '阿强', color: MEMBER_COLORS[2], avatar: '强' },
  { id: 'm4', name: '小美', color: MEMBER_COLORS[3], avatar: '美' }
]

export const useTravelStore = create<TravelStore>((set) => ({
  members: initialMembers,
  markers: [],
  route: null,
  budget: null,
  ui: {
    expandedMemberId: null,
    showAddForm: false,
    formPosition: null,
    currentMemberId: 'm1',
    isLoadingRoute: false,
    isLoadingBudget: false,
    mobileSidebarOpen: false,
    mobileRouteOpen: false
  },

  addMarker: (markerData) =>
    set((state) => ({
      markers: [
        ...state.markers,
        {
          ...markerData,
          id: `marker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          createdAt: Date.now(),
          isNew: true
        }
      ]
    })),

  updateMarker: (id, updates) =>
    set((state) => ({
      markers: state.markers.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      )
    })),

  removeMarker: (id) =>
    set((state) => ({
      markers: state.markers.filter((m) => m.id !== id)
    })),

  setRoute: (route) => set({ route }),
  setBudget: (budget) => set({ budget }),

  toggleMemberExpanded: (memberId) =>
    set((state) => ({
      ui: {
        ...state.ui,
        expandedMemberId:
          state.ui.expandedMemberId === memberId ? null : memberId
      }
    })),

  setShowAddForm: (show, position) =>
    set((state) => ({
      ui: {
        ...state.ui,
        showAddForm: show,
        formPosition: position || null
      }
    })),

  setCurrentMemberId: (id) =>
    set((state) => ({ ui: { ...state.ui, currentMemberId: id } })),

  setLoadingRoute: (loading) =>
    set((state) => ({ ui: { ...state.ui, isLoadingRoute: loading } })),

  setLoadingBudget: (loading) =>
    set((state) => ({ ui: { ...state.ui, isLoadingBudget: loading } })),

  toggleMobileSidebar: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        mobileSidebarOpen: !state.ui.mobileSidebarOpen,
        mobileRouteOpen: false
      }
    })),

  toggleMobileRoute: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        mobileRouteOpen: !state.ui.mobileRouteOpen,
        mobileSidebarOpen: false
      }
    })),

  clearNewAnimation: (markerId) =>
    set((state) => ({
      markers: state.markers.map((m) =>
        m.id === markerId ? { ...m, isNew: false } : m
      )
    }))
}))
