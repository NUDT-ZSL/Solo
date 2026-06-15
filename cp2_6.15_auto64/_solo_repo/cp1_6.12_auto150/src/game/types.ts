export interface Vec2 {
  x: number
  y: number
}

export interface Buff {
  id: string
  type: 'speed' | 'damage'
  name: string
  multiplier: number
  duration: number
  remaining: number
}

export interface GameState {
  currentHp: number
  maxHp: number
  currentCrystals: number
  maxCrystals: number
  killCount: number
  currentFloor: number
  totalDamage: number
  activeBuffs: Buff[]
}

export interface Player {
  pos: Vec2
  gridPos: Vec2
  moveDir: Vec2
  baseSpeed: number
  trail: Vec2[]
  frozenUntil: number
  knockback: Vec2 | null
  invincibleUntil: number
}

export interface Crystal {
  id: number
  pos: Vec2
  vel: Vec2
  alive: boolean
  exploded: boolean
  explosionTimer: number
  explosionRadius: number
  baseDamage: number
}

export interface Enemy {
  id: number
  type: 'snow_monster' | 'ice_golem'
  pos: Vec2
  hp: number
  maxHp: number
  baseSpeed: number
  slowedUntil: number
  patrolTarget: Vec2 | null
  damageDealt: boolean
}

export interface EnergyOrb {
  id: number
  pos: Vec2
  collected: boolean
  healAmount: number
}

export interface TreasureChest {
  id: number
  pos: Vec2
  opened: boolean
}

export interface Staircase {
  pos: Vec2
  direction: 'up'
}

export interface Icicle {
  gridPos: Vec2
}

export interface FloorData {
  floor: number
  gridWidth: number
  gridHeight: number
  icicles: Icicle[]
  chests: TreasureChest[]
  stairs: Staircase[]
  enemies: Enemy[]
}

export interface Particle {
  pos: Vec2
  vel: Vec2
  life: number
  maxLife: number
  color: string
  size: number
}
