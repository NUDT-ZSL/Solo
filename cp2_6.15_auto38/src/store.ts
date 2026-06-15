import { create } from 'zustand'

export type ColorMode = 'auto' | 'arcticGreen' | 'auroraPurple' | 'flameRed'

interface AuroraState {
  colorMode: ColorMode
  particleCount: number
  setColorMode: (mode: ColorMode) => void
  setParticleCount: (count: number) => void
}

export const useAuroraStore = create<AuroraState>((set) => ({
  colorMode: 'auto',
  particleCount: 2000,
  setColorMode: (mode) => set({ colorMode: mode }),
  setParticleCount: (count) => set({ particleCount: count }),
}))
