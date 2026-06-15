import { create } from 'zustand'

export interface ObstacleInfo {
  id: string
  frequency: number
  wavelength: number
  reflections: number
  type: 'cube' | 'sphere' | 'torus'
}

interface AppState {
  waveSpeed: number
  particleDensity: number
  reflectionIntensity: number
  selectedObstacle: ObstacleInfo | null
  setWaveSpeed: (v: number) => void
  setParticleDensity: (v: number) => void
  setReflectionIntensity: (v: number) => void
  setSelectedObstacle: (o: ObstacleInfo | null) => void
  incrementReflections: (id: string) => void
}

export const useStore = create<AppState>((set) => ({
  waveSpeed: 1.0,
  particleDensity: 2000,
  reflectionIntensity: 0.5,
  selectedObstacle: null,
  setWaveSpeed: (v) => set({ waveSpeed: v }),
  setParticleDensity: (v) => set({ particleDensity: v }),
  setReflectionIntensity: (v) => set({ reflectionIntensity: v }),
  setSelectedObstacle: (o) => set({ selectedObstacle: o }),
  incrementReflections: (id) =>
    set((state) => {
      if (state.selectedObstacle && state.selectedObstacle.id === id) {
        return {
          selectedObstacle: {
            ...state.selectedObstacle,
            reflections: state.selectedObstacle.reflections + 1,
          },
        }
      }
      return state
    }),
}))
