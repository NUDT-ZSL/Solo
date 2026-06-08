import { create } from 'zustand'
import { GameState, GameScore, BeatInfo, LevelConfig } from '../types'

interface GameStoreState {
  gameState: GameState
  score: GameScore
  currentLevel: LevelConfig | null
  nextBeats: BeatInfo[]
  beatProgress: number
  comboAnim: number
  feedbackText: string
  feedbackTimer: number
  feedbackQuality: string | null
}

interface GameStoreActions {
  setGameState: (state: GameState) => void
  setScore: (score: GameScore) => void
  setCurrentLevel: (level: LevelConfig | null) => void
  setNextBeats: (beats: BeatInfo[]) => void
  setBeatProgress: (progress: number) => void
  setComboAnim: (val: number) => void
  setFeedback: (text: string, timer: number, quality: string | null) => void
}

export const useGameStore = create<GameStoreState & GameStoreActions>((set) => ({
  gameState: 'MENU',
  score: { combo: 0, maxCombo: 0, totalScore: 0, activatedStones: 0, totalStones: 6 },
  currentLevel: null,
  nextBeats: [],
  beatProgress: 0,
  comboAnim: 0,
  feedbackText: '',
  feedbackTimer: 0,
  feedbackQuality: null,

  setGameState: (gameState) => set({ gameState }),
  setScore: (score) => set({ score }),
  setCurrentLevel: (currentLevel) => set({ currentLevel }),
  setNextBeats: (nextBeats) => set({ nextBeats }),
  setBeatProgress: (beatProgress) => set({ beatProgress }),
  setComboAnim: (comboAnim) => set({ comboAnim }),
  setFeedback: (feedbackText, feedbackTimer, feedbackQuality) => set({ feedbackText, feedbackTimer, feedbackQuality }),
}))
