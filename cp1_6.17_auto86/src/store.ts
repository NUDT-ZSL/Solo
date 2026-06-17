import { create } from 'zustand'

export type WeatherMode = 'sunny' | 'rainy' | 'snowy'

interface WeatherState {
  weather: WeatherMode
  particleCount: number
  coverageRatio: number
  fps: number
  resetSignal: number
  setWeather: (weather: WeatherMode) => void
  setParticleCount: (count: number) => void
  setCoverageRatio: (ratio: number) => void
  setFps: (fps: number) => void
  triggerReset: () => void
}

export const useWeatherStore = create<WeatherState>((set) => ({
  weather: 'sunny',
  particleCount: 0,
  coverageRatio: 0,
  fps: 60,
  resetSignal: 0,
  setWeather: (weather) => set({ weather }),
  setParticleCount: (count) => set({ particleCount: count }),
  setCoverageRatio: (ratio) => set({ coverageRatio: ratio }),
  setFps: (fps) => set({ fps }),
  triggerReset: () => set((state) => ({ resetSignal: state.resetSignal + 1 })),
}))
