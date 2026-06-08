import { create } from 'zustand'

export interface StarInfo {
  id: string
  mass: number
  temperature: number
  lifespan: number
  position: { x: number; y: number; z: number }
}

interface SimStore {
  gravityStrength: number
  particleDensity: number
  glowIntensity: number
  setGravityStrength: (v: number) => void
  setParticleDensity: (v: number) => void
  setGlowIntensity: (v: number) => void
  activeStarInfo: StarInfo | null
  setActiveStarInfo: (info: StarInfo | null) => void
  resetCamera: number
  triggerResetCamera: () => void
}

export const useSimStore = create<SimStore>((set) => ({
  gravityStrength: 1.0,
  particleDensity: 5000,
  glowIntensity: 1.0,
  setGravityStrength: (v) => set({ gravityStrength: v }),
  setParticleDensity: (v) => set({ particleDensity: v }),
  setGlowIntensity: (v) => set({ glowIntensity: v }),
  activeStarInfo: null,
  setActiveStarInfo: (info) => set({ activeStarInfo: info }),
  resetCamera: 0,
  triggerResetCamera: () => set((s) => ({ resetCamera: s.resetCamera + 1 })),
}))
