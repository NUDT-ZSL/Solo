import { create } from 'zustand'

export interface FragmentInfo {
  id: number
  color: string
  colorName: string
  thickness: number
  refractionIndex: number
  screenPosition: { x: number; y: number }
}

interface AppState {
  rotationSpeed: number
  fragmentOpacity: number
  refractionIntensity: number
  hoveredFragment: FragmentInfo | null
  clickedPosition: THREE.Vector3 | null
  setRotationSpeed: (v: number) => void
  setFragmentOpacity: (v: number) => void
  setRefractionIntensity: (v: number) => void
  setHoveredFragment: (info: FragmentInfo | null) => void
  setClickedPosition: (pos: THREE.Vector3 | null) => void
}

import * as THREE from 'three'

export const useStore = create<AppState>((set) => ({
  rotationSpeed: 1.0,
  fragmentOpacity: 0.7,
  refractionIntensity: 1.0,
  hoveredFragment: null,
  clickedPosition: null,
  setRotationSpeed: (v) => set({ rotationSpeed: v }),
  setFragmentOpacity: (v) => set({ fragmentOpacity: v }),
  setRefractionIntensity: (v) => set({ refractionIntensity: v }),
  setHoveredFragment: (info) => set({ hoveredFragment: info }),
  setClickedPosition: (pos) => set({ clickedPosition: pos }),
}))
