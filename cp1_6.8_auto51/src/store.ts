import { create } from 'zustand'

interface ForkNodeData {
  x: number
  y: number
  z: number
  curvature: number
  flow: number
}

interface AppState {
  flowSpeed: number
  particleDensity: number
  trailLength: number
  selectedNode: ForkNodeData | null
  setFlowSpeed: (v: number) => void
  setParticleDensity: (v: number) => void
  setTrailLength: (v: number) => void
  setSelectedNode: (node: ForkNodeData | null) => void
}

export type { ForkNodeData }

export const useStore = create<AppState>((set) => ({
  flowSpeed: 1.0,
  particleDensity: 5000,
  trailLength: 1.0,
  selectedNode: null,
  setFlowSpeed: (v) => set({ flowSpeed: v }),
  setParticleDensity: (v) => set({ particleDensity: v }),
  setTrailLength: (v) => set({ trailLength: v }),
  setSelectedNode: (node) => set({ selectedNode: node }),
}))
