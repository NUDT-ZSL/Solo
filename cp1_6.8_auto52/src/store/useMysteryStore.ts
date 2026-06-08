import { create } from 'zustand'

interface Mystery {
  id: string
  riddle_preview: string
  color: 'warm-yellow' | 'cyan-green' | 'light-blue'
  created_at: string
  solved: boolean
}

interface SolvedMystery {
  id: string
  riddle: string
  answer: string
  color: string
  solved_at: string
}

interface MysteryDetail {
  id: string
  riddle: string
  color: string
  created_at: string
  solved: boolean
}

interface VerifyResult {
  correct: boolean
  riddle: string
  answer: string
}

interface MysteryStore {
  mysteries: Mystery[]
  solvedList: SolvedMystery[]
  loading: boolean
  selectedMystery: MysteryDetail | null
  verifying: boolean
  fetchMysteries: () => Promise<void>
  createMystery: (riddle: string, answer: string) => Promise<void>
  fetchMysteryDetail: (id: string) => Promise<MysteryDetail | null>
  verifyAnswer: (id: string, answer: string) => Promise<VerifyResult | null>
  fetchSolved: () => Promise<void>
  setSelectedMystery: (m: MysteryDetail | null) => void
}

export const useMysteryStore = create<MysteryStore>((set, get) => ({
  mysteries: [],
  solvedList: [],
  loading: false,
  selectedMystery: null,
  verifying: false,

  fetchMysteries: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/mysteries')
      const data = await res.json()
      set({ mysteries: data.mysteries || [], loading: false })
    } catch {
      set({ loading: false })
    }
  },

  createMystery: async (riddle: string, answer: string) => {
    try {
      const res = await fetch('/api/mysteries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riddle, answer }),
      })
      if (res.ok) {
        await get().fetchMysteries()
      }
    } catch {
      // silently fail
    }
  },

  fetchMysteryDetail: async (id: string) => {
    try {
      const res = await fetch(`/api/mysteries/${id}`)
      if (res.ok) {
        const data = await res.json()
        set({ selectedMystery: data })
        return data
      }
    } catch {
      // silently fail
    }
    return null
  },

  verifyAnswer: async (id: string, answer: string) => {
    set({ verifying: true })
    try {
      const res = await fetch(`/api/mysteries/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      })
      if (res.ok) {
        const data = await res.json()
        set({ verifying: false })
        return data
      }
    } catch {
      // silently fail
    }
    set({ verifying: false })
    return null
  },

  fetchSolved: async () => {
    try {
      const res = await fetch('/api/solved')
      const data = await res.json()
      set({ solvedList: data.solved || [] })
    } catch {
      // silently fail
    }
  },

  setSelectedMystery: (m: MysteryDetail | null) => {
    set({ selectedMystery: m })
  },
}))
