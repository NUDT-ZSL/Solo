import { create } from 'zustand'
import { getRandomStartWord, isValidWord, isWordUsed, hasWordsStartingWith } from '@/utils/wordDictionary'

export interface WordEntry {
  word: string
  timeUsed: number
  isCorrect: boolean
  timestamp: number
}

interface GameState {
  mode: 'single' | 'dual'
  status: 'idle' | 'playing' | 'finished'
  currentWord: string
  requiredChar: string
  wordHistory: WordEntry[]
  timeRemaining: number
  currentPlayer: 1 | 2
  errorCount: [number, number]
  roundStartTime: number
  feedbackState: 'none' | 'correct' | 'error'
  errorMessage: string
  dualScore: [number, number]
  dualErrorLimit: number
}

interface GameActions {
  startGame: (mode: 'single' | 'dual') => void
  submitWord: (word: string) => boolean
  tick: () => void
  resetGame: () => void
  getStats: () => {
    totalWords: number
    avgTime: number
    longestChain: number
    correctCount: number
  }
}

const ROUND_TIME = 20
const DUAL_ERROR_LIMIT = 3

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  mode: 'single',
  status: 'idle',
  currentWord: '',
  requiredChar: '',
  wordHistory: [],
  timeRemaining: ROUND_TIME,
  currentPlayer: 1,
  errorCount: [0, 0],
  roundStartTime: 0,
  feedbackState: 'none',
  errorMessage: '',
  dualScore: [0, 0],
  dualErrorLimit: DUAL_ERROR_LIMIT,

  startGame: (mode) => {
    const startWord = getRandomStartWord()
    const requiredChar = startWord[startWord.length - 1]
    set({
      mode,
      status: 'playing',
      currentWord: startWord,
      requiredChar,
      wordHistory: [{
        word: startWord,
        timeUsed: 0,
        isCorrect: true,
        timestamp: Date.now(),
      }],
      timeRemaining: ROUND_TIME,
      currentPlayer: 1,
      errorCount: [0, 0],
      roundStartTime: Date.now(),
      feedbackState: 'none',
      errorMessage: '',
      dualScore: [0, 0],
    })
  },

  submitWord: (word: string): boolean => {
    const state = get()
    if (state.status !== 'playing') return false

    const trimmed = word.trim()
    if (!trimmed) return false

    const firstChar = trimmed[0]
    if (firstChar !== state.requiredChar) {
      const playerIdx = state.currentPlayer - 1
      const newErrorCount: [number, number] = [...state.errorCount]
      newErrorCount[playerIdx]++

      let shouldEnd = false
      if (state.mode === 'dual' && newErrorCount[playerIdx] >= DUAL_ERROR_LIMIT) {
        shouldEnd = true
      }

      set({
        feedbackState: 'error',
        errorMessage: `需要以「${state.requiredChar}」开头的词语`,
        errorCount: newErrorCount,
        status: shouldEnd ? 'finished' : state.status,
      })
      return false
    }

    if (!isValidWord(trimmed)) {
      const playerIdx = state.currentPlayer - 1
      const newErrorCount: [number, number] = [...state.errorCount]
      newErrorCount[playerIdx]++

      let shouldEnd = false
      if (state.mode === 'dual' && newErrorCount[playerIdx] >= DUAL_ERROR_LIMIT) {
        shouldEnd = true
      }

      set({
        feedbackState: 'error',
        errorMessage: '这不是一个有效词语，换一个试试',
        errorCount: newErrorCount,
        status: shouldEnd ? 'finished' : state.status,
      })
      return false
    }

    const usedWords = state.wordHistory.map(w => w.word)
    if (isWordUsed(trimmed, usedWords)) {
      const playerIdx = state.currentPlayer - 1
      const newErrorCount: [number, number] = [...state.errorCount]
      newErrorCount[playerIdx]++

      let shouldEnd = false
      if (state.mode === 'dual' && newErrorCount[playerIdx] >= DUAL_ERROR_LIMIT) {
        shouldEnd = true
      }

      set({
        feedbackState: 'error',
        errorMessage: '这个词语已经用过了',
        errorCount: newErrorCount,
        status: shouldEnd ? 'finished' : state.status,
      })
      return false
    }

    const timeUsed = (Date.now() - state.roundStartTime) / 1000
    const newRequiredChar = trimmed[trimmed.length - 1]
    const newEntry: WordEntry = {
      word: trimmed,
      timeUsed,
      isCorrect: true,
      timestamp: Date.now(),
    }

    const newHistory = [...state.wordHistory, newEntry]
    const newDualScore: [number, number] = [...state.dualScore]
    newDualScore[state.currentPlayer - 1]++

    if (!hasWordsStartingWith(newRequiredChar)) {
      set({
        currentWord: trimmed,
        requiredChar: newRequiredChar,
        wordHistory: newHistory,
        feedbackState: 'correct',
        errorMessage: '',
        dualScore: newDualScore,
        status: 'finished',
      })
      return true
    }

    const nextPlayer: 1 | 2 = state.mode === 'dual'
      ? (state.currentPlayer === 1 ? 2 : 1)
      : 1

    set({
      currentWord: trimmed,
      requiredChar: newRequiredChar,
      wordHistory: newHistory,
      timeRemaining: ROUND_TIME,
      roundStartTime: Date.now(),
      currentPlayer: nextPlayer,
      feedbackState: 'correct',
      errorMessage: '',
      dualScore: newDualScore,
    })
    return true
  },

  tick: () => {
    const state = get()
    if (state.status !== 'playing') return

    const newTime = state.timeRemaining - 1
    if (newTime <= 0) {
      set({ timeRemaining: 0, status: 'finished' })
    } else {
      set({ timeRemaining: newTime })
    }
  },

  resetGame: () => {
    set({
      status: 'idle',
      currentWord: '',
      requiredChar: '',
      wordHistory: [],
      timeRemaining: ROUND_TIME,
      currentPlayer: 1,
      errorCount: [0, 0],
      roundStartTime: 0,
      feedbackState: 'none',
      errorMessage: '',
      dualScore: [0, 0],
    })
  },

  getStats: () => {
    const state = get()
    const correctWords = state.wordHistory.filter(w => w.isCorrect && w.timeUsed > 0)
    const totalWords = correctWords.length
    const totalTime = correctWords.reduce((sum, w) => sum + w.timeUsed, 0)
    const avgTime = totalWords > 0 ? totalTime / totalWords : 0
    const longestChain = totalWords

    return {
      totalWords,
      avgTime,
      longestChain,
      correctCount: totalWords,
    }
  },
}))
