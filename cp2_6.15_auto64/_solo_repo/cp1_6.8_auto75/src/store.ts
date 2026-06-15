import { create } from 'zustand'

export interface EruptionInfo {
  id: string
  position: [number, number, number]
  temperature: number
  flowRate: number
  pressure: number
  timestamp: number
}

interface LavaStore {
  lavaSpeed: number
  particleDensity: number
  coolingRate: number
  eruptionPoints: EruptionInfo[]
  activeEruption: EruptionInfo | null
  setLavaSpeed: (v: number) => void
  setParticleDensity: (v: number) => void
  setCoolingRate: (v: number) => void
  triggerEruption: (info: EruptionInfo) => void
  dismissEruption: () => void
  resetScene: () => void
}

export const useLavaStore = create<LavaStore>((set) => ({
  lavaSpeed: 1.0,
  particleDensity: 1.0,
  coolingRate: 1.0,
  eruptionPoints: [],
  activeEruption: null,
  setLavaSpeed: (v) => set({ lavaSpeed: v }),
  setParticleDensity: (v) => set({ particleDensity: v }),
  setCoolingRate: (v) => set({ coolingRate: v }),
  triggerEruption: (info) =>
    set((state) => ({
      eruptionPoints: [...state.eruptionPoints, info],
      activeEruption: info,
    })),
  dismissEruption: () => set({ activeEruption: null }),
  resetScene: () =>
    set({
      lavaSpeed: 1.0,
      particleDensity: 1.0,
      coolingRate: 1.0,
      eruptionPoints: [],
      activeEruption: null,
    }),
}))
