import { create } from 'zustand'

export type Polarity = 'N' | 'S'
export type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

interface GameState {
  currentLevel: number
  steps: number
  timeRemaining: number
  polarity: Polarity
  strength: number
  gameStatus: GameStatus
  completedTime: number
  completedSteps: number

  setPolarity: (p: Polarity) => void
  setStrength: (s: number) => void
  incrementSteps: () => void
  tick: () => void
  setGameStatus: (s: GameStatus) => void
  loadLevel: (idx: number) => void
  resetLevel: () => void
  winLevel: () => void
  nextLevel: () => void
}

const LEVEL_TIME = 60

export const useGameStore = create<GameState>((set, get) => ({
  currentLevel: 0,
  steps: 0,
  timeRemaining: LEVEL_TIME,
  polarity: 'N' as Polarity,
  strength: 50,
  gameStatus: 'idle' as GameStatus,
  completedTime: 0,
  completedSteps: 0,

  setPolarity: (p: Polarity) => {
    const state = get()
    if (state.polarity !== p) {
      set({ polarity: p })
      get().incrementSteps()
    }
  },
  setStrength: (s: number) => {
    set({ strength: Math.max(0, Math.min(100, Math.round(s))) })
  },
  incrementSteps: () => set((st) => ({ steps: st.steps + 1 })),
  tick: () =>
    set((st) => {
      if (st.gameStatus !== 'playing') return st
      const next = st.timeRemaining - 1
      if (next <= 0) {
        return { timeRemaining: 0, gameStatus: 'lost' }
      }
      return { timeRemaining: next }
    }),
  setGameStatus: (s: GameStatus) => set({ gameStatus: s }),
  loadLevel: (idx: number) =>
    set({
      currentLevel: idx,
      steps: 0,
      timeRemaining: LEVEL_TIME,
      polarity: 'N' as Polarity,
      strength: 50,
      gameStatus: 'playing',
      completedTime: 0,
      completedSteps: 0,
    }),
  resetLevel: () => {
    const { currentLevel } = get()
    get().loadLevel(currentLevel)
  },
  winLevel: () =>
    set((st) => ({
      gameStatus: 'won',
      completedTime: LEVEL_TIME - st.timeRemaining,
      completedSteps: st.steps,
    })),
  nextLevel: () => {
    const { currentLevel } = get()
    get().loadLevel(currentLevel + 1)
  },
}))
