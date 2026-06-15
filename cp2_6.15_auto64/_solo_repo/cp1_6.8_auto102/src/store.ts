import { create } from 'zustand'

interface AuroraState {
  density: number
  amplitude: number
  volume: number
  locked: boolean
  cameraResetTrigger: number
  setDensity: (v: number) => void
  setAmplitude: (v: number) => void
  setVolume: (v: number) => void
  toggleLocked: () => void
  triggerCameraReset: () => void
}

export const useAuroraStore = create<AuroraState>((set) => ({
  density: 3000,
  amplitude: 1.5,
  volume: 0.5,
  locked: false,
  cameraResetTrigger: 0,
  setDensity: (v) => set({ density: v }),
  setAmplitude: (v) => set({ amplitude: v }),
  setVolume: (v) => set({ volume: v }),
  toggleLocked: () => set((s) => ({ locked: !s.locked })),
  triggerCameraReset: () => set((s) => ({ cameraResetTrigger: s.cameraResetTrigger + 1 })),
}))
