import { create } from 'zustand'
import { MAX_VOXELS, generateVoxelData } from './voxelEngine'

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
  voxelLimitWarning: string | null

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
  checkVoxelLimit: (slices: SliceData[], spacing: number) => boolean
  dismissWarning: () => void
}

export const useVoxelStore = create<VoxelState>((set, get) => ({
  slices: [],
  sliceSpacing: 1.0,
  opacity: 0.8,
  clipPlaneEnabled: false,
  clipPlaneZ: 0,
  voxelCount: 0,
  boundingBox: { x: 0, y: 0, z: 0 },
  isLoading: false,
  error: null,
  voxelLimitWarning: null,

  setSlices: (slices) => {
    const state = get()
    if (!state.checkVoxelLimit(slices, state.sliceSpacing)) return
    set({ slices })
  },

  addSlices: (newSlices) =>
    set((state) => {
      const combined = [...state.slices, ...newSlices]
      combined.sort((a, b) => a.index - b.index)

      const totalPixels = combined.reduce(
        (sum, s) => sum + s.width * s.height,
        0
      )

      if (totalPixels > MAX_VOXELS) {
        const warningMsg =
          `体素总数预估 ${totalPixels.toLocaleString()} 超过上限 ${MAX_VOXELS.toLocaleString()}，` +
          `系统将自动降采样以保证性能。如需更高质量，请减少切片数量或降低图片分辨率。`
        return { slices: combined, voxelLimitWarning: warningMsg }
      }

      return { slices: combined, voxelLimitWarning: null }
    }),

  removeSlice: (id) =>
    set((state) => ({
      slices: state.slices.filter((s) => s.id !== id),
    })),

  clearSlices: () =>
    set({ slices: [], voxelCount: 0, voxelLimitWarning: null }),

  setSliceSpacing: (sliceSpacing) => {
    const state = get()
    state.checkVoxelLimit(state.slices, sliceSpacing)
    set({ sliceSpacing })
  },

  setOpacity: (opacity) => set({ opacity }),

  setClipPlaneEnabled: (clipPlaneEnabled) => set({ clipPlaneEnabled }),

  setClipPlaneZ: (clipPlaneZ) => set({ clipPlaneZ }),

  setVoxelCount: (voxelCount) => set({ voxelCount }),

  setBoundingBox: (boundingBox) => set({ boundingBox }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  checkVoxelLimit: (slices: SliceData[], spacing: number) => {
    if (slices.length === 0) return true

    const firstSlice = slices[0]
    const totalPixels = firstSlice.width * firstSlice.height * slices.length

    if (totalPixels > MAX_VOXELS) {
      const warningMsg =
        `体素总数预估 ${totalPixels.toLocaleString()} 超过上限 ${MAX_VOXELS.toLocaleString()}，` +
        `系统将自动降采样以保证性能。`
      set({ voxelLimitWarning: warningMsg })
    } else {
      set({ voxelLimitWarning: null })
    }

    return true
  },

  dismissWarning: () => set({ voxelLimitWarning: null }),
}))
