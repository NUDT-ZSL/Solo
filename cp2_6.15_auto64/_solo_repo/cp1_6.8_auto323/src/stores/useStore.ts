import { create } from "zustand"
import { ScentBottle, UserProfile, API_BASE } from "@/types"

interface AppState {
  driftBottles: ScentBottle[]
  hotBottles: ScentBottle[]
  currentUserId: string
  profile: UserProfile | null
  isLoading: boolean
  fetchDriftBottles: () => Promise<void>
  fetchHotBottles: () => Promise<void>
  publishBottle: (description: string, emoji: string, category: string) => Promise<ScentBottle | null>
  resonateBottle: (bottleId: string, description: string, emoji: string) => Promise<boolean>
  passBottle: (bottleId: string) => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
  removeDriftBottle: (bottleId: string) => void
}

function getOrCreateUserId(): string {
  const stored = localStorage.getItem("scent_drift_user_id")
  if (stored) return stored
  const newId = `user-${crypto.randomUUID().slice(0, 8)}`
  localStorage.setItem("scent_drift_user_id", newId)
  return newId
}

export const useStore = create<AppState>((set, get) => ({
  driftBottles: [],
  hotBottles: [],
  currentUserId: getOrCreateUserId(),
  profile: null,
  isLoading: false,

  fetchDriftBottles: async () => {
    set({ isLoading: true })
    try {
      const res = await fetch(`${API_BASE}/bottles/drift?count=6`)
      const data: ScentBottle[] = await res.json()
      set({ driftBottles: data, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchHotBottles: async () => {
    try {
      const res = await fetch(`${API_BASE}/bottles/hot?limit=20`)
      const data: ScentBottle[] = await res.json()
      set({ hotBottles: data })
    } catch {
      // silently fail
    }
  },

  publishBottle: async (description, emoji, category) => {
    try {
      const res = await fetch(`${API_BASE}/bottles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, emoji, category }),
      })
      const bottle: ScentBottle = await res.json()
      return bottle
    } catch {
      return null
    }
  },

  resonateBottle: async (bottleId, description, emoji) => {
    try {
      const res = await fetch(`${API_BASE}/bottles/${bottleId}/resonate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, emoji }),
      })
      if (!res.ok) return false
      const bottles = get().driftBottles.map((b) =>
        b.id === bottleId ? { ...b, resonanceCount: b.resonanceCount + 1 } : b
      )
      set({ driftBottles: bottles })
      return true
    } catch {
      return false
    }
  },

  passBottle: async (bottleId) => {
    try {
      await fetch(`${API_BASE}/bottles/${bottleId}/pass`, { method: "POST" })
    } catch {
      // silently fail
    }
  },

  fetchProfile: async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/profile/${userId}`)
      const data: UserProfile = await res.json()
      set({ profile: data })
    } catch {
      // silently fail
    }
  },

  removeDriftBottle: (bottleId) => {
    set({ driftBottles: get().driftBottles.filter((b) => b.id !== bottleId) })
  },
}))
