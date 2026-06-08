import { create } from 'zustand'
import type { Bottle } from '@/utils/api'
import { fetchAllBottles, createBottle as apiCreateBottle, resonateBottle as apiResonate, fetchMyBottles } from '@/utils/api'

interface BottleStore {
  bottles: Bottle[]
  userId: string
  selectedBottle: Bottle | null
  showCreateModal: boolean
  showBottleCard: boolean
  isLoading: boolean
  mySent: Bottle[]
  myResonated: Bottle[]
  resonanceAnimating: boolean

  initUserId: () => void
  fetchBottles: () => Promise<void>
  createBottle: (content: string, tag: string) => Promise<Bottle | null>
  resonate: (bottleId: string) => Promise<boolean>
  selectBottle: (bottle: Bottle | null) => void
  setShowCreateModal: (show: boolean) => void
  setShowBottleCard: (show: boolean) => void
  fetchMyBottles: () => Promise<void>
  setResonanceAnimating: (v: boolean) => void
}

function getOrCreateUserId(): string {
  const KEY = 'scent_drift_user_id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = 'usr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
    localStorage.setItem(KEY, id)
  }
  return id
}

export const useBottleStore = create<BottleStore>((set, get) => ({
  bottles: [],
  userId: '',
  selectedBottle: null,
  showCreateModal: false,
  showBottleCard: false,
  isLoading: false,
  mySent: [],
  myResonated: [],
  resonanceAnimating: false,

  initUserId: () => {
    const id = getOrCreateUserId()
    set({ userId: id })
  },

  fetchBottles: async () => {
    set({ isLoading: true })
    const resp = await fetchAllBottles()
    if (resp.success && resp.data) {
      set({ bottles: resp.data })
    }
    set({ isLoading: false })
  },

  createBottle: async (content: string, tag: string) => {
    const { userId } = get()
    const resp = await apiCreateBottle({ content, tag, userId })
    if (resp.success && resp.data) {
      set((s) => ({ bottles: [...s.bottles, resp.data!] }))
      return resp.data
    }
    return null
  },

  resonate: async (bottleId: string) => {
    const { userId } = get()
    const resp = await apiResonate({ bottleId, userId })
    if (resp.success && resp.data) {
      const updated = resp.data
      set((s) => ({
        bottles: s.bottles.map(b => b.id === updated.id ? updated : b),
        selectedBottle: s.selectedBottle?.id === updated.id ? updated : s.selectedBottle,
      }))
      return true
    }
    return false
  },

  selectBottle: (bottle: Bottle | null) => {
    set({ selectedBottle: bottle, showBottleCard: bottle !== null })
  },

  setShowCreateModal: (show: boolean) => set({ showCreateModal: show }),
  setShowBottleCard: (show: boolean) => set({ showBottleCard: show }),

  fetchMyBottles: async () => {
    const { userId } = get()
    const resp = await fetchMyBottles(userId)
    if (resp.success && resp.data) {
      set({ mySent: resp.data.sent, myResonated: resp.data.resonated })
    }
  },

  setResonanceAnimating: (v: boolean) => set({ resonanceAnimating: v }),
}))
