import { create } from 'zustand'

export type ThemeName = 'aurora' | 'starryNight' | 'coral' | 'neon'

export interface ColorTheme {
  name: ThemeName
  label: string
  particle1: string
  particle2: string
  lineColor: string
  rippleColor: string
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    name: 'aurora',
    label: '极光',
    particle1: '#00d4ff',
    particle2: '#ff0066',
    lineColor: '#1a3a5c',
    rippleColor: '#00ffaa',
  },
  {
    name: 'starryNight',
    label: '星夜',
    particle1: '#4466ff',
    particle2: '#ff44aa',
    lineColor: '#2a1a5c',
    rippleColor: '#8844ff',
  },
  {
    name: 'coral',
    label: '珊瑚',
    particle1: '#ff6b6b',
    particle2: '#ffa07a',
    lineColor: '#5c2a2a',
    rippleColor: '#ffdd44',
  },
  {
    name: 'neon',
    label: '霓虹',
    particle1: '#00ff88',
    particle2: '#ff00ff',
    lineColor: '#1a5c3a',
    rippleColor: '#ffff00',
  },
]

export interface RippleData {
  id: number
  x: number
  z: number
  time: number
  strength: number
}

interface SceneState {
  particleDensity: number
  tidalStrength: number
  colorTheme: ThemeName
  ripples: RippleData[]
  setParticleDensity: (v: number) => void
  setTidalStrength: (v: number) => void
  setColorTheme: (v: ThemeName) => void
  addRipple: (x: number, z: number) => void
  removeRipple: (id: number) => void
  resetScene: () => void
}

let rippleIdCounter = 0

export const useSceneStore = create<SceneState>((set) => ({
  particleDensity: 1500,
  tidalStrength: 1.0,
  colorTheme: 'aurora',
  ripples: [],
  setParticleDensity: (v) => set({ particleDensity: v }),
  setTidalStrength: (v) => set({ tidalStrength: v }),
  setColorTheme: (v) => set({ colorTheme: v }),
  addRipple: (x, z) =>
    set((state) => ({
      ripples: [
        ...state.ripples,
        {
          id: ++rippleIdCounter,
          x,
          z,
          time: 0,
          strength: 1.0,
        },
      ],
    })),
  removeRipple: (id) =>
    set((state) => ({
      ripples: state.ripples.filter((r) => r.id !== id),
    })),
  resetScene: () =>
    set({
      particleDensity: 1500,
      tidalStrength: 1.0,
      colorTheme: 'aurora',
      ripples: [],
    }),
}))

export function getCurrentTheme(): ColorTheme {
  const themeName = useSceneStore.getState().colorTheme
  return COLOR_THEMES.find((t) => t.name === themeName) || COLOR_THEMES[0]
}
