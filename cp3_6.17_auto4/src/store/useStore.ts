import { create } from 'zustand'
import { User } from '@/types'

interface AppState {
  currentUser: User | null
  setCurrentUser: (user: User) => void
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
}))
