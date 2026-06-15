import { create } from 'zustand'

interface CityInfo {
  name: string
  lat: number
  lon: number
  windSpeed: number
}

interface StoreState {
  rotationX: number
  rotationY: number
  targetRotationX: number
  targetRotationY: number
  zoomLevel: number
  targetZoomLevel: number
  avgWindSpeed: number
  selectedCity: CityInfo | null
  simTime: string
  isResetting: boolean

  setTargetRotation: (x: number, y: number) => void
  setTargetZoom: (zoom: number) => void
  setRotation: (x: number, y: number) => void
  setZoom: (zoom: number) => void
  setAvgWindSpeed: (speed: number) => void
  selectCity: (city: CityInfo | null) => void
  setSimTime: (time: string) => void
  resetView: () => void
  setResetting: (v: boolean) => void
}

const INITIAL_ROTATION_X = 0
const INITIAL_ROTATION_Y = 0
const INITIAL_ZOOM = 5

export const useStore = create<StoreState>((set) => ({
  rotationX: INITIAL_ROTATION_X,
  rotationY: INITIAL_ROTATION_Y,
  targetRotationX: INITIAL_ROTATION_X,
  targetRotationY: INITIAL_ROTATION_Y,
  zoomLevel: INITIAL_ZOOM,
  targetZoomLevel: INITIAL_ZOOM,
  avgWindSpeed: 12,
  selectedCity: null,
  simTime: '模拟时间：2024-05-15 14:30 UTC',
  isResetting: false,

  setTargetRotation: (x, y) => set({ targetRotationX: x, targetRotationY: y }),
  setTargetZoom: (zoom) => set({ targetZoomLevel: Math.max(2, Math.min(8, zoom)) }),
  setRotation: (x, y) => set({ rotationX: x, rotationY: y }),
  setZoom: (zoom) => set({ zoomLevel: zoom }),
  setAvgWindSpeed: (speed) => set({ avgWindSpeed: speed }),
  selectCity: (city) => set({ selectedCity: city }),
  setSimTime: (time) => set({ simTime: time }),
  resetView: () => {
    console.log('resetView called, setting isResetting: true')
    set({
      targetRotationX: INITIAL_ROTATION_X,
      targetRotationY: INITIAL_ROTATION_Y,
      targetZoomLevel: INITIAL_ZOOM,
      isResetting: true,
    })
  },
  setResetting: (v) => set({ isResetting: v }),
}))
