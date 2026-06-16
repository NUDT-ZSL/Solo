import { create } from 'zustand'
import { useGameStore } from './gameStore'

interface ScoreState {
  scores: Record<string, number>
  totalScores: Record<string, number>
  unlockedGames: Set<string>
  showUnlockModal: string | null
  rateGame: (gameId: string, score: number) => Promise<void>
  checkUnlock: (gameId: string) => boolean
  setShowUnlockModal: (gameId: string | null) => void
  syncScoresFromGames: () => void
}

export const useScoreStore = create<ScoreState>((set, get) => ({
  scores: {},
  totalScores: {},
  unlockedGames: new Set(),
  showUnlockModal: null,

  rateGame: async (gameId, score) => {
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, score }),
      })
      const data = await res.json()
      if (res.ok) {
        set((state) => ({
          scores: { ...state.scores, [gameId]: score },
          totalScores: { ...state.totalScores, [gameId]: data.totalScore },
        }))
        if (data.unlocked) {
          set((state) => ({
            unlockedGames: new Set([...state.unlockedGames, gameId]),
            showUnlockModal: gameId,
          }))
          useGameStore.getState().fetchGames()
        }
      }
    } catch {
      // silent
    }
  },

  checkUnlock: (gameId) => {
    return get().unlockedGames.has(gameId)
  },

  setShowUnlockModal: (gameId) => {
    set({ showUnlockModal: gameId })
  },

  syncScoresFromGames: () => {
    const games = useGameStore.getState().games
    const totalScores: Record<string, number> = {}
    games.forEach((g) => {
      totalScores[g.id] = g.totalScore
    })
    set({ totalScores })
  },
}))
