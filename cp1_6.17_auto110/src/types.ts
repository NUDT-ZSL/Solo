export interface Vec2 {
  x: number
  y: number
}

export interface PhysicsParams {
  gravity: number
  jumpForce: number
  horizontalSpeed: number
}

export interface Player {
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  onGround: boolean
}

export interface Platform {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  type: 'static' | 'moving' | 'crumbling'
  moveStartX?: number
  moveEndX?: number
  moveSpeed?: number
  moveDirection?: number
  crumbleState?: 'intact' | 'triggered' | 'disappeared' | 'resetting'
  crumbleTimer?: number
  flashTimer?: number
  flashOpacity?: number
}

export interface TrajectoryData {
  id: number
  jumpStartY: number
  highestY: number
  landingX: number
  airTimeMs: number
}

export interface JumpState {
  isJumping: boolean
  startTime: number
  startX: number
  startY: number
  currentHighestY: number
}

export interface Preset {
  id: string
  name: string
  params: PhysicsParams
  timestamp: number
}
