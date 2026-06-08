import { create } from 'zustand'

export interface MeteorData {
  id: string
  speed: number
  color: string
  remainingTime: number
  position: [number, number, number]
}

interface AppStore {
  meteorFrequency: number
  trailLifetime: number
  autoRotateSpeed: number
  selectedMeteor: MeteorData | null
  setMeteorFrequency: (v: number) => void
  setTrailLifetime: (v: number) => void
  setAutoRotateSpeed: (v: number) => void
  setSelectedMeteor: (m: MeteorData | null) => void
  resetAll: () => void
}

const DEFAULT_FREQUENCY = 5
const DEFAULT_LIFETIME = 3
const DEFAULT_ROTATE_SPEED = 0.5

export const useStore = create<AppStore>((set) => ({
  meteorFrequency: DEFAULT_FREQUENCY,
  trailLifetime: DEFAULT_LIFETIME,
  autoRotateSpeed: DEFAULT_ROTATE_SPEED,
  selectedMeteor: null,
  setMeteorFrequency: (v) => set({ meteorFrequency: v }),
  setTrailLifetime: (v) => set({ trailLifetime: v }),
  setAutoRotateSpeed: (v) => set({ autoRotateSpeed: v }),
  setSelectedMeteor: (m) => set({ selectedMeteor: m }),
  resetAll: () =>
    set({
      meteorFrequency: DEFAULT_FREQUENCY,
      trailLifetime: DEFAULT_LIFETIME,
      autoRotateSpeed: DEFAULT_ROTATE_SPEED,
      selectedMeteor: null,
    }),
}))
