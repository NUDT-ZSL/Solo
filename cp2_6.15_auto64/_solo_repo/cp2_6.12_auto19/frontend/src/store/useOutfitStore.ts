import { create } from 'zustand'
import { OutfitSelection, SelectedClothing, Category, Outfit } from '@/types'

interface OutfitStore {
  selection: OutfitSelection
  outfits: Outfit[]
  favorites: Outfit[]
  currentView: 'main' | 'favorites' | 'share'
  shareOutfit: Outfit | null
  setClothing: (category: Category, clothing: SelectedClothing | null) => void
  setOutfits: (outfits: Outfit[]) => void
  addOutfit: (outfit: Outfit) => void
  addFavorite: (outfit: Outfit) => void
  removeFavorite: (outfitId: string) => void
  setFavorites: (outfits: Outfit[]) => void
  setCurrentView: (view: 'main' | 'favorites' | 'share') => void
  setShareOutfit: (outfit: Outfit | null) => void
  loadOutfit: (outfit: Outfit) => void
  resetSelection: () => void
}

const initialSelection: OutfitSelection = {
  top: null,
  bottom: null,
  shoes: null,
  accessory: null
}

export const useOutfitStore = create<OutfitStore>((set) => ({
  selection: initialSelection,
  outfits: [],
  favorites: [],
  currentView: 'main',
  shareOutfit: null,

  setClothing: (category, clothing) =>
    set((state) => ({
      selection: {
        ...state.selection,
        [category]: clothing
      }
    })),

  setOutfits: (outfits) => set({ outfits }),

  addOutfit: (outfit) =>
    set((state) => ({
      outfits: [outfit, ...state.outfits].slice(0, 20)
    })),

  addFavorite: (outfit) =>
    set((state) => ({
      favorites: [outfit, ...state.favorites.filter((o) => o.id !== outfit.id)]
    })),

  removeFavorite: (outfitId) =>
    set((state) => ({
      favorites: state.favorites.filter((o) => o.id !== outfitId)
    })),

  setFavorites: (outfits) => set({ favorites: outfits }),

  setCurrentView: (view) => set({ currentView: view }),

  setShareOutfit: (outfit) => set({ shareOutfit: outfit }),

  loadOutfit: (outfit) =>
    set({
      selection: {
        top: outfit.top,
        bottom: outfit.bottom,
        shoes: outfit.shoes,
        accessory: outfit.accessory
      }
    }),

  resetSelection: () => set({ selection: initialSelection })
}))

export const getUserId = (): string => {
  let userId = localStorage.getItem('outfit_user_id')
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 15)
    localStorage.setItem('outfit_user_id', userId)
  }
  return userId
}
