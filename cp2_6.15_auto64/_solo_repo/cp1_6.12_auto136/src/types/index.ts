export interface Note {
  id: string
  time: number
  lane: number
  type: 'normal' | 'bonus'
  pitch: string
  collected: boolean
  perfect: boolean
}

export interface Obstacle {
  id: string
  time: number
  lane: number
  type: 'gear' | 'spike' | 'lightning'
  z: number
  passed: boolean
}

export interface PlayerState {
  lane: number
  targetLane: number
  y: number
  health: number
  maxHealth: number
  isInvincible: boolean
  invincibleTimer: number
}

export interface GameState {
  score: number
  combo: number
  maxCombo: number
  perfectStreak: number
  missStreak: number
  speedMultiplier: number
  speedBoostTimer: number
  speedReductionTimer: number
  isPlaying: boolean
  isPaused: boolean
  isGameOver: boolean
  currentTime: number
  startTime: number
  obstaclesCleared: number
  notesCollected: number
  levelId: string
  levelName: string
}

export interface RenderState {
  player: PlayerState
  obstacles: Obstacle[]
  notes: Note[]
  game: GameState
  beatFlash: number
  beatIntensity: number
  currentBeat: number
  screenFlash: number
  particles: Particle[]
}

export interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  color: string
  life: number
  maxLife: number
  size: number
}

export interface LevelConfig {
  id: string
  name: string
  difficulty: 'easy' | 'normal' | 'hard'
  bpm: number
  obstacleDensity: number
  baseSpeed: number
  duration: number
  theme: {
    backgroundStart: string
    backgroundEnd: string
    primaryColor: string
    secondaryColor: string
  }
}

export interface ScoreEntry {
  id: string
  playerName: string
  score: number
  levelId: string
  levelName: string
  maxCombo: number
  obstaclesCleared: number
  timestamp: number
}

export type BeatAccuracy = 'perfect' | 'good' | 'miss'

export interface GameCallbacks {
  onScoreUpdate: (score: number) => void
  onComboUpdate: (combo: number, maxCombo: number) => void
  onHealthUpdate: (health: number) => void
  onGameOver: (stats: {
    score: number
    maxCombo: number
    obstaclesCleared: number
    notesCollected: number
  }) => void
  onPerfect: () => void
  onHit: () => void
  onCollect: () => void
  onSpeedChange: (speed: number, isBoost: boolean) => void
  onBeat: (intensity: number) => void
}

export const LANES = 3
export const LANE_WIDTH = 100
export const NOTE_RADIUS = 10
export const NOTE_GLOW_RADIUS = 18
export const PERFECT_WINDOW = 50
export const GOOD_WINDOW = 150
export const HIT_Z = 0.8
export const SPAWN_Z = 10
