import * as THREE from 'three'

export interface ParticleData {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  startColor: THREE.Color
  life: number
  maxLife: number
  radius: number
  startRadius: number
  speedFactor: number
  active: boolean
}

export type BrushType = 'spray' | 'vortex' | 'trail'

export interface BrushParams {
  density?: number
  radius?: number
  length?: number
}

export const COLOR_PALETTE = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24']
export const MAX_PARTICLES = 50000
export const CONNECTION_DISTANCE = 25
export const LINE_OPACITY = 0.3
export const LINE_WIDTH = 1
export const HIGH_PARTICLE_THRESHOLD = 20000
export const PERFORMANCE_THRESHOLD = 10000
