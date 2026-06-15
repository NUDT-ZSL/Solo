import { create } from 'zustand'

interface ClickedPointData {
  x: number
  y: number
  z: number
  slope: number
  windSpeed: number
  grainSize: number
  screenX: number
  screenY: number
}

interface DuneState {
  windSpeed: number
  windDirection: number
  duneAmplitude: number
  noiseSeed: number
  clickedPoint: ClickedPointData | null
  setWindSpeed: (v: number) => void
  setWindDirection: (v: number) => void
  setDuneAmplitude: (v: number) => void
  randomize: () => void
  setClickedPoint: (p: ClickedPointData) => void
  clearClickedPoint: () => void
}

export type { ClickedPointData }

export const useDuneStore = create<DuneState>((set) => ({
  windSpeed: 3,
  windDirection: 45,
  duneAmplitude: 0.6,
  noiseSeed: Math.random() * 1000,
  clickedPoint: null,
  setWindSpeed: (v) => set({ windSpeed: v }),
  setWindDirection: (v) => set({ windDirection: v }),
  setDuneAmplitude: (v) => set({ duneAmplitude: v }),
  randomize: () => set({ noiseSeed: Math.random() * 1000 }),
  setClickedPoint: (p) => set({ clickedPoint: p }),
  clearClickedPoint: () => set({ clickedPoint: null }),
}))
