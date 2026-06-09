export type Difficulty = 'easy' | 'normal' | 'hard'

export interface DifficultyConfig {
  gridSize: number
  cellSize: number
  fragmentCount: number
  timeLimit: number
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: { gridSize: 10, cellSize: 40, fragmentCount: 10, timeLimit: 90 },
  normal: { gridSize: 15, cellSize: 40, fragmentCount: 15, timeLimit: 120 },
  hard: { gridSize: 20, cellSize: 40, fragmentCount: 20, timeLimit: 180 },
}

export interface Cell {
  x: number
  y: number
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean }
  visited: boolean
}

export interface Ball {
  x: number
  y: number
  radius: number
  speed: number
}

export interface SoundWave {
  id: number
  segments: WaveSegment[]
  maxLength: number
  currentLength: number
  color: string
  bounceColor: string
  birthTime: number
  lifetime: number
  isStrongPulse: boolean
  penetratedWalls: number
  directionX: number
  directionY: number
  startX: number
  startY: number
}

export interface WaveSegment {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

export interface Fragment {
  id: number
  x: number
  y: number
  radius: number
  color: string
  collected: boolean
  phase: number
}

export interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface TrailParticle {
  x: number
  y: number
  life: number
}

export type GameState = 'menu' | 'playing' | 'paused' | 'won' | 'lost'

export interface GameStats {
  elapsedTime: number
  collectedFragments: number
  totalFragments: number
}

export interface EngineSnapshot {
  maze: Cell[][]
  ball: Ball
  soundWaves: SoundWave[]
  fragments: Fragment[]
  particles: Particle[]
  trail: TrailParticle[]
  stats: GameStats
  gameState: GameState
  exitPosition: { x: number; y: number }
  difficulty: Difficulty
  canvasSize: number
}
