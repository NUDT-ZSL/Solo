import { create } from 'zustand'

export type GameState = 'menu' | 'playing' | 'gameover'

interface GameStore {
  score: number
  displayScore: number
  highScore: number
  energy: number
  maxEnergy: number
  isBoosting: boolean
  gameState: GameState
  boostAvailable: boolean

  setScore: (score: number) => void
  setEnergy: (energy: number) => void
  setGameState: (state: GameState) => void
  setBoosting: (boosting: boolean) => void
  restart: () => void
}

const STORAGE_KEY = 'startrack_highscore'

const loadHighScore = (): number => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? parseInt(saved, 10) : 0
  } catch {
    return 0
  }
}

const saveHighScore = (score: number) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(score))
  } catch {}
}

export const useGameStore = create<GameStore>((set, get) => ({
  score: 0,
  displayScore: 0,
  highScore: loadHighScore(),
  energy: 0,
  maxEnergy: 10,
  isBoosting: false,
  gameState: 'menu',
  boostAvailable: false,

  setScore: (score: number) => {
    const state = get()
    const newHigh = Math.max(state.highScore, score)
    if (newHigh > state.highScore) {
      saveHighScore(newHigh)
    }
    set({ score, highScore: newHigh })
  },

  setEnergy: (energy: number) => {
    const state = get()
    const clamped = Math.min(Math.max(0, energy), state.maxEnergy)
    set({ energy: clamped, boostAvailable: clamped >= state.maxEnergy })
  },

  setGameState: (gameState: GameState) => set({ gameState }),

  setBoosting: (isBoosting: boolean) => set({ isBoosting }),

  restart: () => set({
    score: 0,
    displayScore: 0,
    energy: 0,
    isBoosting: false,
    gameState: 'menu',
    boostAvailable: false,
  }),
}))
