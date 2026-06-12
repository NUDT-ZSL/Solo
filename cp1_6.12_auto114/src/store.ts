import { create } from 'zustand'

export interface SliceData {
  id: string
  name: string
  imageData: ImageData
  width: number
  height: number
  index: number
}

export interface VoxelPoint {
  x: number
  y: number
  z: number
  r: number
  g: number
  b: number
  a: number
}

interface VoxelState {
  slices: SliceData[]
  sliceSpacing: number
  opacity: number
  clipPlaneEnabled: boolean
  clipPlaneZ: number
  voxelCount: number
  boundingBox: { x: number; y: number; z: number }
  isLoading: boolean
  error: string | null

  setSlices: (slices: SliceData[]) => void
  addSlices: (slices: SliceData[]) => void
  removeSlice: (id: string) => void
  clearSlices: () => void
  setSliceSpacing: (spacing: number) => void
  setOpacity: (opacity: number) => void
  setClipPlaneEnabled: (enabled: boolean) => void
  setClipPlaneZ: (z: number) => void
  setVoxelCount: (count: number) => void
  setBoundingBox: (box: { x: number; y: number; z: number }) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useVoxelStore = create<VoxelState>((set) => ({
  slices: [],
  sliceSpacing: 1.0,
  opacity: 0.8,
  clipPlaneEnabled: false,
  clipPlaneZ: 0,
  voxelCount: 0,
  boundingBox: { x: 0, y: 0, z: 0 },
  isLoading: false,
  error: null,

  setSlices: (slices) => set({ slices }),
  addSlices: (newSlices) =>
    set((state) => {
      const combined = [...state.slices, ...newSlices]
      combined.sort((a, b) => a.index - b.index)
      return { slices: combined }
    }),
  removeSlice: (id) =>
    set((state) => ({
      slices: state.slices.filter((s) => s.id !== id),
    })),
  clearSlices: () => set({ slices: [], voxelCount: 0 }),
  setSliceSpacing: (sliceSpacing) => set({ sliceSpacing }),
  setOpacity: (opacity) => set({ opacity }),
  setClipPlaneEnabled: (clipPlaneEnabled) => set({ clipPlaneEnabled }),
  setClipPlaneZ: (clipPlaneZ) => set({ clipPlaneZ }),
  setVoxelCount: (voxelCount) => set({ voxelCount }),
  setBoundingBox: (boundingBox) => set({ boundingBox }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
