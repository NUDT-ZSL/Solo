import * as THREE from 'three'

export type ShipType = 'frigate' | 'destroyer' | 'battleship' | 'carrier'
export type Faction = 'player' | 'enemy'
export type GamePhase = 'deploy' | 'battle' | 'result' | 'replay'
export type TacticType = 'focus_fire' | 'encircle' | 'defensive'

export interface ShipStats {
  maxHp: number
  attack: number
  range: number
  speed: number
  armor: number
  skillCooldown: number
}

export interface Skill {
  id: string
  name: string
  description: string
  cooldown: number
  currentCooldown: number
  color: string
  type: 'emp' | 'repair' | 'airstrike' | 'shield'
}

export interface Ship {
  id: string
  name: string
  type: ShipType
  faction: Faction
  isFlagship: boolean
  position: THREE.Vector3
  targetPosition: THREE.Vector3 | null
  hp: number
  maxHp: number
  stats: ShipStats
  skills: Skill[]
  status: {
    alive: boolean
    stunned: number
    disabled: number
    damaged: number
    selected: boolean
  }
  attackCooldown: number
  cooldownRemaining: number
  targetShipId: string | null
  mesh?: THREE.Group
  isLOD?: boolean
}

export interface Projectile {
  id: string
  from: THREE.Vector3
  to: THREE.Vector3
  progress: number
  speed: number
  damage: number
  targetId: string
  faction: Faction
  mesh?: THREE.Mesh
  trail?: THREE.Points
}

export interface BattleLog {
  id: string
  timestamp: number
  message: string
  type: 'attack' | 'skill' | 'death' | 'heal' | 'stun' | 'info'
}

export interface FrameData {
  frame: number
  ships: { id: string; position: [number, number, number]; hp: number }[]
  projectiles: { from: [number, number, number]; to: [number, number, number] }[]
  events: BattleLog[]
}

export interface GameResult {
  winner: Faction | 'draw'
  survivalRate: number
  totalDamage: number
  skillUsage: number
  rating: 'S' | 'A' | 'B' | 'C'
  duration: number
}

export interface GridCell {
  x: number
  z: number
  occupied: boolean
  highlighted: 'none' | 'valid' | 'invalid'
  mesh?: THREE.Mesh
}
