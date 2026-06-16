import { create } from 'zustand'
import type { User, Garden, RegionDetail, Member } from '@/types/garden'

interface GardenState {
  user: User | null
  gardens: Garden[]
  currentRegion: RegionDetail | null
  members: Member[]
  setUser: (user: User | null) => void
  setGardens: (gardens: Garden[]) => void
  setCurrentRegion: (region: RegionDetail | null) => void
  setMembers: (members: Member[]) => void
  addPoints: (points: number) => void
}

export const useGardenStore = create<GardenState>((set) => ({
  user: null,
  gardens: [],
  currentRegion: null,
  members: [],
  setUser: (user) => set({ user }),
  setGardens: (gardens) => set({ gardens }),
  setCurrentRegion: (currentRegion) => set({ currentRegion }),
  setMembers: (members) => set({ members }),
  addPoints: (points) =>
    set((state) => ({
      user: state.user ? { ...state.user, points: state.user.points + points } : null,
    })),
}))
