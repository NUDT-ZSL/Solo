import { create } from 'zustand'
import type { Capsule, CreateCapsuleRequest } from '../../shared/types'

interface CapsuleState {
  capsules: Capsule[]
  selectedCapsule: Capsule | null
  isCardOpen: boolean
  isFormOpen: boolean
  isUnsealing: boolean
  loading: boolean
  fetchCapsules: () => Promise<void>
  createCapsule: (data: CreateCapsuleRequest) => Promise<Capsule | null>
  unsealCapsule: (id: string) => Promise<boolean>
  selectCapsule: (capsule: Capsule | null) => void
  openCard: (capsule: Capsule) => void
  closeCard: () => void
  openForm: () => void
  closeForm: () => void
  setUnsealing: (v: boolean) => void
}

export const useCapsuleStore = create<CapsuleState>((set, get) => ({
  capsules: [],
  selectedCapsule: null,
  isCardOpen: false,
  isFormOpen: false,
  isUnsealing: false,
  loading: false,

  fetchCapsules: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/capsules')
      const data = await res.json()
      set({ capsules: data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createCapsule: async (data: CreateCapsuleRequest) => {
    try {
      const res = await fetch('/api/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) return null
      const capsule = await res.json()
      set(state => ({ capsules: [...state.capsules, capsule] }))
      return capsule
    } catch {
      return null
    }
  },

  unsealCapsule: async (id: string) => {
    try {
      const res = await fetch(`/api/capsules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'unsealed' }),
      })
      if (!res.ok) return false
      const result = await res.json()
      set(state => ({
        capsules: state.capsules.map(c => (c.id === id ? result.capsule : c)),
        selectedCapsule: result.capsule,
      }))
      return true
    } catch {
      return false
    }
  },

  selectCapsule: (capsule) => set({ selectedCapsule: capsule }),

  openCard: (capsule) => set({ selectedCapsule: capsule, isCardOpen: true }),

  closeCard: () => set({ isCardOpen: false, selectedCapsule: null, isUnsealing: false }),

  openForm: () => set({ isFormOpen: true }),

  closeForm: () => set({ isFormOpen: false }),

  setUnsealing: (v) => set({ isUnsealing: v }),
}))
