import { create } from 'zustand'

interface ClimateState {
  currentYear: number
  isPlaying: boolean
  playSpeed: number
  startYear: number
  endYear: number
  cameraPosition: { lon: number; lat: number; distance: number }
  hoveredCoords: { lon: number; lat: number } | null
  yearFlash: number | null
}

interface ClimateActions {
  setYear: (year: number) => void
  play: () => void
  pause: () => void
  setSpeed: (speed: number) => void
  setYearRange: (start: number, end: number) => void
  setStartYear: (year: number) => void
  setEndYear: (year: number) => void
  resetCamera: () => void
  setCameraPosition: (pos: { lon: number; lat: number; distance: number }) => void
  setHoveredCoords: (coords: { lon: number; lat: number } | null) => void
  setYearFlash: (year: number | null) => void
  reset: () => void
}

const initialState: ClimateState = {
  currentYear: 2023,
  isPlaying: false,
  playSpeed: 1,
  startYear: 1880,
  endYear: 2023,
  cameraPosition: { lon: 0, lat: 0, distance: 15 },
  hoveredCoords: null,
  yearFlash: null,
}

export const useClimateStore = create<ClimateState & ClimateActions>((set) => ({
  ...initialState,

  setYear: (year) => set({ currentYear: year }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setSpeed: (speed) => set({ playSpeed: speed }),
  setYearRange: (start, end) => set({ startYear: start, endYear: end }),
  setStartYear: (year) => set({ startYear: year }),
  setEndYear: (year) => set({ endYear: year }),
  resetCamera: () => set({ cameraPosition: { lon: 0, lat: 0, distance: 15 } }),
  setCameraPosition: (pos) => set({ cameraPosition: pos }),
  setHoveredCoords: (coords) => set({ hoveredCoords: coords }),
  setYearFlash: (year) => set({ yearFlash: year }),
  reset: () => set(initialState),
}))
