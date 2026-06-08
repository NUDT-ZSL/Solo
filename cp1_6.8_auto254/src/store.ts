import { create } from 'zustand'
import * as THREE from 'three'
import {
  splitText,
  analyzeEmotion,
  generateConstellationPoints,
  generateConstellationLines,
  getPositionForWord,
} from '@/utils/textParser'
import type { Emotion } from '@/utils/textParser'

export interface StarPoint {
  position: THREE.Vector3
  originalPosition: THREE.Vector3
  velocity: THREE.Vector3
  size: number
  opacity: number
}

export interface ConstellationData {
  id: string
  word: string
  center: THREE.Vector3
  stars: StarPoint[]
  lines: [number, number][]
  emotion: Emotion
  createdAt: number
  isBurst: boolean
  burstProgress: number
  textPositions: THREE.Vector3[]
  rotationOffset: number
}

interface AppState {
  constellations: ConstellationData[]
  particleDensity: number
  spreadSpeed: number
  globalEmotion: Emotion
  isListening: boolean
  inputText: string
  addConstellationFromText: (text: string) => void
  setParticleDensity: (value: number) => void
  setSpreadSpeed: (value: number) => void
  setIsListening: (value: boolean) => void
  setInputText: (value: string) => void
  toggleBurst: (id: string) => void
  resetCanvas: () => void
}

let constellationCounter = 0

export const useStore = create<AppState>((set, get) => ({
  constellations: [],
  particleDensity: 150,
  spreadSpeed: 1.0,
  globalEmotion: 'neutral',
  isListening: false,
  inputText: '',

  addConstellationFromText: (text: string) => {
    const words = splitText(text)
    if (words.length === 0) return
    const emotion = analyzeEmotion(words)
    const existingCount = get().constellations.length
    const density = get().particleDensity
    const newConstellations: ConstellationData[] = words.map((word, i) => {
      const globalIndex = existingCount + i
      const center = getPositionForWord(globalIndex, existingCount + words.length, 12)
      const points = generateConstellationPoints(word, center, 2.5, density)
      const stars: StarPoint[] = points.map((p) => ({
        position: p.clone(),
        originalPosition: p.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        size: 0.03 + Math.random() * 0.04,
        opacity: 0.6 + Math.random() * 0.4,
      }))
      const lines = generateConstellationLines(points)
      constellationCounter++
      return {
        id: `constellation-${constellationCounter}`,
        word,
        center,
        stars,
        lines,
        emotion,
        createdAt: Date.now(),
        isBurst: false,
        burstProgress: 0,
        textPositions: [],
        rotationOffset: Math.random() * Math.PI * 2,
      }
    })
    set((state) => ({
      constellations: [...state.constellations, ...newConstellations],
      globalEmotion: emotion,
      inputText: '',
    }))
  },

  setParticleDensity: (value: number) => set({ particleDensity: value }),
  setSpreadSpeed: (value: number) => set({ spreadSpeed: value }),
  setIsListening: (value: boolean) => set({ isListening: value }),
  setInputText: (value: string) => set({ inputText: value }),

  toggleBurst: (id: string) => {
    set((state) => ({
      constellations: state.constellations.map((c) =>
        c.id === id ? { ...c, isBurst: !c.isBurst, burstProgress: 0 } : c
      ),
    }))
  },

  resetCanvas: () => {
    constellationCounter = 0
    set({
      constellations: [],
      globalEmotion: 'neutral',
      inputText: '',
    })
  },
}))
