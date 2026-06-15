import { create } from 'zustand'

interface User {
  id: string
  name: string
}

interface UserState {
  user: User
  favorites: string[]
  toggleFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
}

export const useUserStore = create<UserState>((set, get) => ({
  user: { id: 'user-1', name: '我' },
  favorites: [],
  toggleFavorite: (id: string) => {
    set((state) => ({
      favorites: state.favorites.includes(id)
        ? state.favorites.filter((fid) => fid !== id)
        : [...state.favorites, id],
    }))
  },
  isFavorite: (id: string) => {
    return get().favorites.includes(id)
  },
}))
