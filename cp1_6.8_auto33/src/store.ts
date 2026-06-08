import { create } from 'zustand'

export interface LavaBranchInfo {
  id: string
  speed: number
  temperature: number
  childCount: number
  screenX: number
  screenY: number
}

interface LavaStore {
  flowSpeed: number
  glowIntensity: number
  branchDensity: number
  selectedBranch: LavaBranchInfo | null
  setFlowSpeed: (v: number) => void
  setGlowIntensity: (v: number) => void
  setBranchDensity: (v: number) => void
  setSelectedBranch: (info: LavaBranchInfo | null) => void
  reset: () => void
}

export const useLavaStore = create<LavaStore>((set) => ({
  flowSpeed: 1.0,
  glowIntensity: 1.0,
  branchDensity: 3,
  selectedBranch: null,
  setFlowSpeed: (v) => set({ flowSpeed: v }),
  setGlowIntensity: (v) => set({ glowIntensity: v }),
  setBranchDensity: (v) => set({ branchDensity: Math.round(v) }),
  setSelectedBranch: (info) => set({ selectedBranch: info }),
  reset: () =>
    set({
      flowSpeed: 1.0,
      glowIntensity: 1.0,
      branchDensity: 3,
      selectedBranch: null,
    }),
}))
