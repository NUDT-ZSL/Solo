import { create } from "zustand"
import type { Inspiration, CreateInspirationPayload, Tag } from "@/lib/types"

interface InspirationState {
  inspirations: Inspiration[]
  searchKeyword: string
  selectedTag: Tag | null
  showAddModal: boolean
  fetchInspirations: () => Promise<void>
  fetchInspirationById: (id: string) => Promise<Inspiration>
  addInspiration: (payload: CreateInspirationPayload) => Promise<void>
  setSearchKeyword: (keyword: string) => void
  setSelectedTag: (tag: Tag | null) => void
  setShowAddModal: (show: boolean) => void
  filteredInspirations: () => Inspiration[]
}

export const useInspirationStore = create<InspirationState>((set, get) => ({
  inspirations: [],
  searchKeyword: "",
  selectedTag: null,
  showAddModal: false,

  fetchInspirations: async () => {
    const res = await fetch("/api/inspirations")
    const data: Inspiration[] = await res.json()
    set({ inspirations: data })
  },

  fetchInspirationById: async (id: string) => {
    const res = await fetch(`/api/inspirations/${id}`)
    const data: Inspiration = await res.json()
    return data
  },

  addInspiration: async (payload: CreateInspirationPayload) => {
    const res = await fetch("/api/inspirations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data: Inspiration = await res.json()
    set((state) => ({ inspirations: [...state.inspirations, data] }))
  },

  setSearchKeyword: (keyword: string) => set({ searchKeyword: keyword }),
  setSelectedTag: (tag: Tag | null) => set({ selectedTag: tag }),
  setShowAddModal: (show: boolean) => set({ showAddModal: show }),

  filteredInspirations: () => {
    const { inspirations, searchKeyword, selectedTag } = get()
    return inspirations.filter((item) => {
      const matchKeyword =
        !searchKeyword ||
        item.title.includes(searchKeyword) ||
        item.content.includes(searchKeyword)
      const matchTag = !selectedTag || item.tag === selectedTag
      return matchKeyword && matchTag
    })
  },
}))
