export interface Vector2D {
  x: number
  y: number
}

export interface Star {
  id: string
  x: number
  y: number
  mass: number
  radius: number
  gravityRadius: number
  pulsePhase: number
}

export interface Asteroid {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  isLaunched: boolean
  isDead: boolean
}

export interface TrailPoint {
  x: number
  y: number
  alpha: number
}

export interface TargetRing {
  id: string
  x: number
  y: number
  radius: number
  isHit: boolean
  hitTime: number
  rippleRadius: number
  rippleAlpha: number
}

export interface GameState {
  stars: Star[]
  asteroid: Asteroid
  trails: TrailPoint[]
  targets: TargetRing[]
  fuel: number
  score: number
  isGameOver: boolean
  isLaunched: boolean
  fps: number
  speed: number
  showScorePopup: boolean
  scorePopupTime: number
  layoutSeed: string
}

export interface PhysicsConfig {
  minDistance: number
  trailLength: number
  fuelConsumptionPerSecond: number
  maxSpeed: number
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  minDistance: 5,
  trailLength: 200,
  fuelConsumptionPerSecond: 0.6,
  maxSpeed: 15,
}
