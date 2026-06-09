export type GrowthMode = 'spiral' | 'recursive' | 'mirror'

export interface CubeInstance {
  id: string
  position: [number, number, number]
  scale: number
  rotation: [number, number, number]
  color: string
  layer: number
  opacity: number
  isManual: boolean
}

export interface TowerConfig {
  basePosition: [number, number, number]
  layers: number
  cubesPerLayer: number
  growthMode: GrowthMode
  layerIntervalMs: number
  scaleFactor: number
  spiralAngleDeg: number
  rotationPerCubeDeg: number
}

export interface ManualCube {
  id: string
  startPos: [number, number, number]
  endPos: [number, number, number]
  color: string
  animStart: number
  animDuration: number
  settled: boolean
}

export interface Particle {
  id: string
  position: [number, number, number]
  velocity: [number, number, number]
  color: string
  life: number
  maxLife: number
  size: number
}

export interface RippleEffect {
  id: string
  center: [number, number, number]
  startTime: number
  duration: number
  maxRadius: number
}

export type LayerColorStop = { h: number; s: number; l: number; a: number }
