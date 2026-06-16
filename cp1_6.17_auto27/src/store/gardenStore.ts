import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Garden, RegionDetail, Member } from '@/types/garden'

interface GardenState {
  user: User | null
  token: string | null
  gardens: Garden[]
  currentRegion: RegionDetail | null
  members: Member[]
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setGardens: (gardens: Garden[]) => void
  setCurrentRegion: (region: RegionDetail | null) => void
  setMembers: (members: Member[]) => void
  addPoints: (points: number) => void
  logout: () => void
}

export const useGardenStore = create<GardenState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      gardens: [],
      currentRegion: null,
      members: [],
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setGardens: (gardens) => set({ gardens }),
      setCurrentRegion: (currentRegion) => set({ currentRegion }),
      setMembers: (members) => set({ members }),
      addPoints: (points) =>
        set((state) => ({
          user: state.user ? { ...state.user, points: state.user.points + points } : null,
        })),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'garden-store',
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
)

export function authHeaders(): Record<string, string> {
  const token = useGardenStore.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
