import { create } from 'zustand'
import type { PhysicsParams, TrajectoryData } from './types'

const PRESETS_KEY = '2d_platformer_presets'
const MAX_PRESETS = 10
const MAX_TRAJECTORIES = 10

interface GameState {
  params: PhysicsParams
  trajectories: TrajectoryData[]
  lowFpsWarning: boolean
  setParams: (params: PhysicsParams) => void
  addTrajectory: (data: TrajectoryData) => void
  setLowFpsWarning: (warning: boolean) => void
  savePreset: (name: string) => void
  loadPresets: () => { id: string; name: string; params: PhysicsParams }[]
  deletePreset: (id: string) => void
  applyPreset: (id: string) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  params: {
    gravity: 600,
    jumpForce: 350,
    horizontalSpeed: 200
  },
  trajectories: [],
  lowFpsWarning: false,

  setParams: (params) => set({ params }),

  addTrajectory: (data) => {
    const trajs = [...get().trajectories, data].slice(-MAX_TRAJECTORIES)
    set({ trajectories: trajs })
  },

  setLowFpsWarning: (warning) => set({ lowFpsWarning: warning }),

  savePreset: (name) => {
    const presets = get().loadPresets()
    const newPreset = {
      id: Date.now().toString(),
      name,
      params: { ...get().params },
      timestamp: Date.now()
    }
    const updated = [newPreset, ...presets].slice(0, MAX_PRESETS)
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated))
  },

  loadPresets: () => {
    try {
      const raw = localStorage.getItem(PRESETS_KEY)
      if (!raw) return []
      return JSON.parse(raw)
    } catch {
      return []
    }
  },

  deletePreset: (id) => {
    const presets = get().loadPresets().filter((p) => p.id !== id)
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
  },

  applyPreset: (id) => {
    const presets = get().loadPresets()
    const preset = presets.find((p) => p.id === id)
    if (preset) {
      set({ params: { ...preset.params } })
    }
  }
}))
