import { create } from 'zustand'

export interface Idea {
  id: string
  content: string
  color: string
  x: number
  y: number
  inspiredCount: number
  createdAt: number
}

export interface FusionAnimation {
  fromId: string
  toId: string
  fromPos: { x: number; y: number }
  toPos: { x: number; y: number }
  progress: number
  color: string
}

const API_BASE = 'http://localhost:8000/api'

interface IdeaStore {
  ideas: Idea[]
  selectedIdea: Idea | null
  showPublishModal: boolean
  fusionAnimation: FusionAnimation | null
  publishing: boolean

  fetchIdeas: () => Promise<void>
  publishIdea: (content: string) => Promise<Idea | null>
  inspireIdea: (fromId: string, toId: string, fromPos: { x: number; y: number }, toPos: { x: number; y: number }, color: string) => Promise<void>
  selectIdea: (idea: Idea | null) => void
  setShowPublishModal: (show: boolean) => void
  setFusionAnimation: (anim: FusionAnimation | null) => void
  getLeaderboard: () => Promise<Idea[]>
}

export const useIdeaStore = create<IdeaStore>((set, get) => ({
  ideas: [],
  selectedIdea: null,
  showPublishModal: false,
  fusionAnimation: null,
  publishing: false,

  fetchIdeas: async () => {
    try {
      const res = await fetch(`${API_BASE}/ideas`)
      const data: Idea[] = await res.json()
      set({ ideas: data })
    } catch {
      console.error('Failed to fetch ideas')
    }
  },

  publishIdea: async (content: string) => {
    set({ publishing: true })
    try {
      const res = await fetch(`${API_BASE}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Publish failed')
      const idea: Idea = await res.json()
      set((state) => ({ ideas: [...state.ideas, idea], publishing: false }))
      return idea
    } catch {
      set({ publishing: false })
      return null
    }
  },

  inspireIdea: async (fromId, toId, fromPos, toPos, color) => {
    const animation: FusionAnimation = {
      fromId,
      toId,
      fromPos,
      toPos,
      progress: 0,
      color,
    }
    set({ fusionAnimation: animation })

    const startTime = performance.now()
    const duration = 1500

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      set((state) => {
        if (!state.fusionAnimation) return state
        return {
          fusionAnimation: { ...state.fusionAnimation, progress },
        }
      })

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        try {
          fetch(`${API_BASE}/ideas/inspire`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromId, toId }),
          }).then((res) => {
            if (res.ok) {
              res.json().then((updated: Idea) => {
                set((state) => ({
                  ideas: state.ideas.map((i) =>
                    i.id === toId ? { ...i, inspiredCount: updated.inspiredCount } : i
                  ),
                  selectedIdea:
                    state.selectedIdea?.id === toId
                      ? { ...state.selectedIdea, inspiredCount: updated.inspiredCount }
                      : state.selectedIdea,
                  fusionAnimation: null,
                }))
              })
            } else {
              set({ fusionAnimation: null })
            }
          })
        } catch {
          set({ fusionAnimation: null })
        }
      }
    }

    requestAnimationFrame(animate)
  },

  selectIdea: (idea) => set({ selectedIdea: idea }),
  setShowPublishModal: (show) => set({ showPublishModal: show }),
  setFusionAnimation: (anim) => set({ fusionAnimation: anim }),

  getLeaderboard: async () => {
    try {
      const res = await fetch(`${API_BASE}/ideas/leaderboard`)
      const data: Idea[] = await res.json()
      return data
    } catch {
      return []
    }
  },
}))

export const NEON_COLORS = [
  '#FF2D95',
  '#00D4FF',
  '#39FF14',
  '#FF6B35',
  '#BF40BF',
  '#00FF7F',
  '#FF4500',
  '#7DF9FF',
  '#FF1493',
  '#00FA9A',
]

export function getGridColumns(): number {
  if (typeof window === 'undefined') return 4
  const width = window.innerWidth
  if (width < 768) return 1
  if (width < 1024) return 2
  return 4
}
