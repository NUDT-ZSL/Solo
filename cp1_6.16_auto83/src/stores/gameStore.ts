import { create } from 'zustand'

export type Genre = '全部' | '动作' | '解谜' | '模拟' | '角色扮演'

interface GameListItem {
  id: string
  title: string
  developer: string
  genre: '动作' | '解谜' | '模拟' | '角色扮演'
  thumbnail: string
  description: string
  previewScreenshots: string[]
  rating: number
  totalScore: number
  releaseDate: string
  platforms: string[]
}

interface DevLog {
  id: string
  date: string
  title: string
  content: string
  likes: number
}

interface UnlockContent {
  conceptImages: string[]
  interviewUrl: string
  shareLink: string
}

interface GameDetail extends GameListItem {
  screenshots: string[]
  devLogs: DevLog[]
  unlockContent: UnlockContent
}

interface GameState {
  games: GameListItem[]
  currentGame: GameDetail | null
  genre: Genre
  loading: boolean
  setGenre: (genre: Genre) => void
  fetchGames: () => Promise<void>
  fetchGameDetail: (id: string) => Promise<void>
}

export type { GameListItem, GameDetail, DevLog, UnlockContent }

export const useGameStore = create<GameState>((set) => ({
  games: [],
  currentGame: null,
  genre: '全部',
  loading: false,

  setGenre: (genre) => {
    set({ genre })
  },

  fetchGames: async () => {
    set({ loading: true })
    try {
      const res = await fetch('/api/games')
      const data: GameListItem[] = await res.json()
      set({ games: data, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchGameDetail: async (id) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/games/${id}`)
      const data: GameDetail = await res.json()
      set({ currentGame: data, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
