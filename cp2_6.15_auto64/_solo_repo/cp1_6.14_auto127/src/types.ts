export type GameEventType =
  | 'game:start'
  | 'game:stop'
  | 'game:pause'
  | 'game:resume'
  | 'game:over'
  | 'input:move'
  | 'engine:update'
  | 'engine:score'
  | 'engine:speed'
  | 'engine:lives'
  | 'engine:collision'
  | 'engine:collect'
  | 'engine:boost'
  | 'audio:playMusic'
  | 'audio:stopMusic'
  | 'audio:playSFX'

export interface GameState {
  running: boolean
  paused: boolean
  score: number
  speed: number
  lives: number
  energyCollected: number
  boostActive: boolean
  boostEndTime: number
  invincible: boolean
  invincibleEndTime: number
  elapsedTime: number
}

export interface Ship {
  x: number
  y: number
  width: number
  height: number
  velocityX: number
  velocityY: number
}

export interface Obstacle {
  id: number
  x: number
  y: number
  width: number
  height: number
  color: string
  vertices: number[]
}

export interface EnergyOrb {
  id: number
  x: number
  y: number
  radius: number
  collected: boolean
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface Star {
  x: number
  y: number
  size: number
  brightness: number
  speed: number
}

export interface RenderData {
  ship: Ship
  obstacles: Obstacle[]
  energyOrbs: EnergyOrb[]
  particles: Particle[]
  stars: Star[]
  gameState: GameState
}

export interface InputData {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

export type SFXType = 'collect' | 'collision' | 'boost'
