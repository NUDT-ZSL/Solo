import { create } from 'zustand'

export type AnimationStyle = 'fall' | 'ripple' | 'explode' | 'spiral'

interface AppState {
  text: string
  style: AnimationStyle
  speed: number
  particleSize: number
  color: string
  isDissolving: boolean
  setText: (text: string) => void
  setStyle: (style: AnimationStyle) => void
  setSpeed: (speed: number) => void
  setParticleSize: (size: number) => void
  setColor: (color: string) => void
  toggleDissolve: () => void
}

export const useStore = create<AppState>((set) => ({
  text: '浮光絮语',
  style: 'fall',
  speed: 1,
  particleSize: 1,
  color: '#D4A574',
  isDissolving: false,
  setText: (text) => set({ text }),
  setStyle: (style) => set({ style }),
  setSpeed: (speed) => set({ speed }),
  setParticleSize: (particleSize) => set({ particleSize }),
  setColor: (color) => set({ color }),
  toggleDissolve: () => set((s) => ({ isDissolving: !s.isDissolving })),
}))
