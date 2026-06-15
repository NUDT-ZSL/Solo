import { create } from 'zustand'
import type { Letter, StarData } from './types'

interface AppState {
  letters: Letter[]
  starMap: Map<string, StarData>
  selectedLetter: Letter | null
  showLetterCard: boolean
  showWriteModal: boolean
  replyToLetter: Letter | null
  starMarkIds: string[]
  hoveredStarId: string | null

  setLetters: (letters: Letter[]) => void
  addLetter: (letter: Letter) => void
  setStarMap: (map: Map<string, StarData>) => void
  updateStarData: (id: string, data: Partial<StarData>) => void
  selectLetter: (letter: Letter | null) => void
  setShowLetterCard: (show: boolean) => void
  setShowWriteModal: (show: boolean) => void
  setReplyToLetter: (letter: Letter | null) => void
  addStarMark: (id: string) => void
  setHoveredStarId: (id: string | null) => void
  loadStarMarks: () => void
}

const STORAGE_KEY = 'starMarkIds'

export const useStore = create<AppState>((set, get) => ({
  letters: [],
  starMap: new Map(),
  selectedLetter: null,
  showLetterCard: false,
  showWriteModal: false,
  replyToLetter: null,
  starMarkIds: [],
  hoveredStarId: null,

  setLetters: (letters) => set({ letters }),

  addLetter: (letter) =>
    set((state) => ({ letters: [...state.letters, letter] })),

  setStarMap: (map) => set({ starMap: map }),

  updateStarData: (id, data) =>
    set((state) => {
      const map = new Map(state.starMap)
      const existing = map.get(id)
      if (existing) {
        map.set(id, { ...existing, ...data })
      }
      return { starMap: map }
    }),

  selectLetter: (letter) => set({ selectedLetter: letter }),

  setShowLetterCard: (show) => set({ showLetterCard: show }),

  setShowWriteModal: (show) => set({ showWriteModal: show }),

  setReplyToLetter: (letter) => set({ replyToLetter: letter }),

  addStarMark: (id) =>
    set((state) => {
      const updated = state.starMarkIds.includes(id)
        ? state.starMarkIds
        : [...state.starMarkIds, id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return { starMarkIds: updated }
    }),

  setHoveredStarId: (id) => set({ hoveredStarId: id }),

  loadStarMarks: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        set({ starMarkIds: JSON.parse(stored) })
      }
    } catch {
      set({ starMarkIds: [] })
    }
  },
}))
