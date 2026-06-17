import { create } from 'zustand'

export type ObstacleType = 'cube' | 'sphere' | 'torus'

export interface Obstacle {
  id: string
  type: ObstacleType
  position: [number, number, number]
  size: number
  rotation: [number, number, number]
}

export interface Particle {
  id: string
  position: [number, number, number]
  velocity: [number, number, number]
  life: number
  maxLife: number
  color: string
}

export interface CollisionEvent {
  particleId: string
  obstacleId?: string
  position: [number, number, number]
  normal: [number, number, number]
  timestamp: number
}

export interface RippleEffect {
  id: string
  obstacleId: string
  timestamp: number
  position: [number, number, number]
}

export interface SparkEffect {
  id: string
  position: [number, number, number]
  timestamp: number
}

interface AppState {
  particles: Particle[]
  obstacles: Obstacle[]
  collisionEvents: CollisionEvent[]
  rippleEffects: RippleEffect[]
  sparkEffects: SparkEffect[]
  isRunning: boolean
  timeScale: number
  gravity: number
  damping: number
  restitution: number
  maxParticles: number
  emissionRate: number
  particleLifetime: number
  particleRadius: number
  boundarySize: [number, number, number]
  fps: number
  cpuUsage: number
  lowFpsDuration: number
  isThrottled: boolean
  selectedObstacleId: string | null
  placingObstacleType: ObstacleType | null
  previewPosition: [number, number, number] | null

  addParticle: (particle: Particle) => void
  removeParticle: (id: string) => void
  updateParticles: (particles: Particle[]) => void
  clearParticles: () => void

  addObstacle: (obstacle: Obstacle) => void
  removeObstacle: (id: string) => void
  updateObstacle: (id: string, updates: Partial<Obstacle>) => void
  clearObstacles: () => void
  setSelectedObstacle: (id: string | null) => void
  setPlacingObstacleType: (type: ObstacleType | null) => void
  setPreviewPosition: (pos: [number, number, number] | null) => void

  addCollisionEvent: (event: CollisionEvent) => void
  clearCollisionEvents: () => void
  addRippleEffect: (ripple: RippleEffect) => void
  removeRippleEffect: (id: string) => void
  addSparkEffect: (spark: SparkEffect) => void
  removeSparkEffect: (id: string) => void

  setIsRunning: (running: boolean) => void
  setTimeScale: (scale: number) => void
  setGravity: (gravity: number) => void
  setEmissionRate: (rate: number) => void

  setFps: (fps: number) => void
  setCpuUsage: (usage: number) => void
  setLowFpsDuration: (duration: number) => void
  setIsThrottled: (throttled: boolean) => void

  reset: () => void
}

const initialState = {
  particles: [],
  obstacles: [],
  collisionEvents: [],
  rippleEffects: [],
  sparkEffects: [],
  isRunning: true,
  timeScale: 1,
  gravity: -2,
  damping: 0.98,
  restitution: 0.7,
  maxParticles: 500,
  emissionRate: 60,
  particleLifetime: 5,
  particleRadius: 0.1,
  boundarySize: [12, 10, 8] as [number, number, number],
  fps: 60,
  cpuUsage: 0,
  lowFpsDuration: 0,
  isThrottled: false,
  selectedObstacleId: null,
  placingObstacleType: null,
  previewPosition: null,
}

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  addParticle: (particle) => set((state) => ({
    particles: [...state.particles, particle].slice(-state.maxParticles)
  })),

  removeParticle: (id) => set((state) => ({
    particles: state.particles.filter((p) => p.id !== id)
  })),

  updateParticles: (particles) => set({ particles }),

  clearParticles: () => set({ particles: [] }),

  addObstacle: (obstacle) => set((state) => ({
    obstacles: [...state.obstacles, obstacle].slice(0, 5),
    placingObstacleType: null,
    previewPosition: null
  })),

  removeObstacle: (id) => set((state) => ({
    obstacles: state.obstacles.filter((o) => o.id !== id),
    selectedObstacleId: state.selectedObstacleId === id ? null : state.selectedObstacleId
  })),

  updateObstacle: (id, updates) => set((state) => ({
    obstacles: state.obstacles.map((o) =>
      o.id === id ? { ...o, ...updates } : o
    )
  })),

  clearObstacles: () => set({ obstacles: [], selectedObstacleId: null }),

  setSelectedObstacle: (id) => set({ selectedObstacleId: id }),

  setPlacingObstacleType: (type) => set({ placingObstacleType: type }),

  setPreviewPosition: (pos) => set({ previewPosition: pos }),

  addCollisionEvent: (event) => set((state) => ({
    collisionEvents: [...state.collisionEvents, event]
  })),

  clearCollisionEvents: () => set({ collisionEvents: [] }),

  addRippleEffect: (ripple) => set((state) => ({
    rippleEffects: [...state.rippleEffects, ripple]
  })),

  removeRippleEffect: (id) => set((state) => ({
    rippleEffects: state.rippleEffects.filter((r) => r.id !== id)
  })),

  addSparkEffect: (spark) => set((state) => ({
    sparkEffects: [...state.sparkEffects, spark]
  })),

  removeSparkEffect: (id) => set((state) => ({
    sparkEffects: state.sparkEffects.filter((s) => s.id !== id)
  })),

  setIsRunning: (running) => set({ isRunning: running }),

  setTimeScale: (scale) => set({ timeScale: scale }),

  setGravity: (gravity) => set({ gravity }),

  setEmissionRate: (rate) => set({ emissionRate: rate }),

  setFps: (fps) => set({ fps }),

  setCpuUsage: (usage) => set({ cpuUsage: usage }),

  setLowFpsDuration: (duration) => set({ lowFpsDuration: duration }),

  setIsThrottled: (throttled) => set({ isThrottled: throttled }),

  reset: () => set(initialState),
}))
