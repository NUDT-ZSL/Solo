import { create } from 'zustand'

export interface TrailPoint {
  lat: number
  lon: number
  ele: number
  time: number
}

export interface TerrainVertex {
  x: number
  y: number
  z: number
}

export interface TerrainData {
  vertices: TerrainVertex[]
  width: number
  height: number
  minEle: number
  maxEle: number
  bounds: {
    minLat: number
    maxLat: number
    minLon: number
    maxLon: number
  }
}

interface TrailState {
  trailPoints: TrailPoint[]
  terrainData: TerrainData | null
  currentIndex: number
  isPlaying: boolean
  playbackSpeed: number
  isLoading: boolean
  totalClimb: number
  currentSlope: number
  loaded: boolean

  setTrailPoints: (points: TrailPoint[]) => void
  setTerrainData: (data: TerrainData | null) => void
  setCurrentIndex: (index: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  setIsLoading: (loading: boolean) => void
  setTotalClimb: (climb: number) => void
  setCurrentSlope: (slope: number) => void
  setLoaded: (loaded: boolean) => void
  reset: () => void
}

export const useTrailStore = create<TrailState>((set) => ({
  trailPoints: [],
  terrainData: null,
  currentIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  isLoading: false,
  totalClimb: 0,
  currentSlope: 0,
  loaded: false,

  setTrailPoints: (points) => set({ trailPoints: points }),
  setTerrainData: (data) => set({ terrainData: data }),
  setCurrentIndex: (index) => set({ currentIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setTotalClimb: (climb) => set({ totalClimb: climb }),
  setCurrentSlope: (slope) => set({ currentSlope: slope }),
  setLoaded: (loaded) => set({ loaded }),
  reset: () => set({
    trailPoints: [],
    terrainData: null,
    currentIndex: 0,
    isPlaying: false,
    playbackSpeed: 1,
    isLoading: false,
    totalClimb: 0,
    currentSlope: 0,
    loaded: false,
  }),
}))
