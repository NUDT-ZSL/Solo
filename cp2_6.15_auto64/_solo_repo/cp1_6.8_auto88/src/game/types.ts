export interface Vector2 {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Platform {
  id: string
  x: number
  y: number
  width: number
  height: number
  visible: boolean
  lightCondition: 'always' | 'light-left' | 'light-right'
  color?: string
}

export interface Gear {
  id: string
  x: number
  y: number
  radius: number
  teethCount: number
  rotationSpeed: number
  currentAngle: number
  clockwise: boolean
}

export interface SteamVent {
  id: string
  x: number
  y: number
  direction: 'up' | 'down' | 'left' | 'right'
  intensity: number
  width: number
  height: number
  active: boolean
  changeInterval: number
  timer: number
  particles: SteamParticle[]
}

export interface SteamParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  alpha: number
}

export interface LightMechanism {
  id: string
  x: number
  y: number
  currentDirection: 'left' | 'right'
  linkedPlatformIds: string[]
  cooldown: number
  cooldownTimer: number
}

export interface EnergyCore {
  id: string
  x: number
  y: number
  collected: boolean
  glowPhase: number
  radius: number
}

export interface Door {
  x: number
  y: number
  width: number
  height: number
  locked: boolean
  levelExit: boolean
}

export interface Boss {
  id: string
  x: number
  y: number
  width: number
  height: number
  health: number
  maxHealth: number
  attackCooldown: number
  attackTimer: number
  phase: number
  facingRight: boolean
  state: 'idle' | 'patrol' | 'attack_gear' | 'attack_steam' | 'hurt' | 'dead'
  stateTimer: number
  velocityX: number
  velocityY: number
  patrolDir: number
}

export interface Player {
  x: number
  y: number
  width: number
  height: number
  velocityX: number
  velocityY: number
  energy: number
  maxEnergy: number
  isClimbing: boolean
  climbingGearId: string | null
  climbAngle: number
  facingRight: boolean
  grounded: boolean
  jumping: boolean
  hurtTimer: number
  invincibleTimer: number
  runeGlowPhase: number
  steamBoosted: boolean
  steamBoostTimer: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
  type: 'gear_trail' | 'core_collect' | 'steam_hit' | 'boss_explode' | 'rune_spark'
}

export interface ScreenShake {
  intensity: number
  duration: number
  timer: number
}

export interface LevelData {
  id: number
  name: string
  worldWidth: number
  worldHeight: number
  playerStart: Vector2
  platforms: Platform[]
  gears: Gear[]
  steamVents: SteamVent[]
  lightMechanisms: LightMechanism[]
  energyCores: EnergyCore[]
  boss: Boss | null
  door: Door
  backgroundGears: { x: number; y: number; radius: number; speed: number }[]
}

export interface GameState {
  player: Player
  currentLevel: number
  coresCollected: number
  totalCores: number
  levelProgress: number
  gamePaused: boolean
  gameOver: boolean
  victory: boolean
  bossHealth: number
  bossMaxHealth: number
  showBossBar: boolean
  hintMessage: string
  hintTimer: number
  screenShake: ScreenShake
  energyFlashing: boolean
  coreCollectAnim: number
}

export type InputState = {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  jump: boolean
  interact: boolean
  jumpPressed: boolean
  interactPressed: boolean
}

export const GRAVITY = 1200
export const PLAYER_SPEED = 260
export const JUMP_FORCE = -520
export const PLAYER_WIDTH = 28
export const PLAYER_HEIGHT = 44
export const STEAM_DAMAGE = 15
export const STEAM_BOOST_FORCE = -700
export const CLIMB_SPEED_FACTOR = 1.0
export const BOSS_CONTACT_DAMAGE = 20
export const MAX_PARTICLES = 300
export const ENERGY_CORE_RADIUS = 14
