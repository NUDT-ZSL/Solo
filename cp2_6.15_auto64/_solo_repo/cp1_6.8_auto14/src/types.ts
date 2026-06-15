export type GameState = 'MENU' | 'PLAYING' | 'TRANSITION' | 'GAME_OVER' | 'LEVEL_COMPLETE'

export type BeatQuality = 'perfect' | 'good' | 'miss'

export interface BeatResult {
  hit: boolean
  quality: BeatQuality
  deviation: number
}

export interface BeatInfo {
  time: number
  strength: 'strong' | 'weak'
  index: number
}

export interface StoneConfig {
  index: number
  color: string
  glowColor: string
  angle: number
  frequency: number
  terrainChange: TerrainChange
}

export interface TerrainChange {
  type: 'bridge' | 'step'
  region: number
  direction: 'up' | 'down'
}

export interface LevelConfig {
  id: number
  name: string
  bpm: number
  musicStyle: string
  beatMap: number[]
  stones: StoneConfig[]
  tolerance: number
}

export interface GameScore {
  combo: number
  maxCombo: number
  totalScore: number
  activatedStones: number
  totalStones: number
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

export interface StoneState {
  config: StoneConfig
  activated: boolean
  glowIntensity: number
  pulseRadius: number
  pulseAlpha: number
  runePhase: number
  hitAnimation: number
  failAnimation: number
  terrainHeight: number
  targetTerrainHeight: number
}

export interface TerrainRegion {
  x: number
  y: number
  width: number
  height: number
  elevation: number
  targetElevation: number
  color: string
}

export interface PlayerState {
  angle: number
  speed: number
  nearStone: number | null
  size: number
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    id: 1,
    name: '初息之鼓',
    bpm: 90,
    musicStyle: 'tribal',
    beatMap: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    tolerance: 100,
    stones: [
      { index: 0, color: '#E84545', glowColor: '#FF6B6B', angle: 0, frequency: 261.63, terrainChange: { type: 'step', region: 0, direction: 'up' } },
      { index: 1, color: '#F5A623', glowColor: '#FFD93D', angle: 60, frequency: 293.66, terrainChange: { type: 'bridge', region: 1, direction: 'up' } },
      { index: 2, color: '#F8E71C', glowColor: '#FFF176', angle: 120, frequency: 329.63, terrainChange: { type: 'step', region: 2, direction: 'up' } },
      { index: 3, color: '#7ED321', glowColor: '#A8E063', angle: 180, frequency: 349.23, terrainChange: { type: 'bridge', region: 3, direction: 'up' } },
      { index: 4, color: '#4ECDC4', glowColor: '#88E8DF', angle: 240, frequency: 392.00, terrainChange: { type: 'step', region: 4, direction: 'up' } },
      { index: 5, color: '#9B59B6', glowColor: '#C39BD3', angle: 300, frequency: 440.00, terrainChange: { type: 'bridge', region: 5, direction: 'up' } },
    ],
  },
  {
    id: 2,
    name: '灵语回响',
    bpm: 105,
    musicStyle: 'tribal_vocal',
    beatMap: [1, 0.5, 1, 0, 1, 0.5, 1, 0, 1, 0.5, 1, 0, 1, 0.5, 1, 0],
    tolerance: 95,
    stones: [
      { index: 0, color: '#E84545', glowColor: '#FF6B6B', angle: 0, frequency: 261.63, terrainChange: { type: 'step', region: 0, direction: 'up' } },
      { index: 1, color: '#F5A623', glowColor: '#FFD93D', angle: 60, frequency: 293.66, terrainChange: { type: 'bridge', region: 1, direction: 'up' } },
      { index: 2, color: '#F8E71C', glowColor: '#FFF176', angle: 120, frequency: 329.63, terrainChange: { type: 'step', region: 2, direction: 'up' } },
      { index: 3, color: '#7ED321', glowColor: '#A8E063', angle: 180, frequency: 349.23, terrainChange: { type: 'bridge', region: 3, direction: 'up' } },
      { index: 4, color: '#4ECDC4', glowColor: '#88E8DF', angle: 240, frequency: 392.00, terrainChange: { type: 'step', region: 4, direction: 'up' } },
      { index: 5, color: '#9B59B6', glowColor: '#C39BD3', angle: 300, frequency: 440.00, terrainChange: { type: 'bridge', region: 5, direction: 'up' } },
    ],
  },
  {
    id: 3,
    name: '电灵交织',
    bpm: 120,
    musicStyle: 'electronic_mixed',
    beatMap: [1, 0.3, 0.3, 1, 0.3, 1, 0.3, 0.3, 1, 0.3, 0.3, 1, 0.3, 1, 0.3, 0.3],
    tolerance: 90,
    stones: [
      { index: 0, color: '#E84545', glowColor: '#FF6B6B', angle: 0, frequency: 261.63, terrainChange: { type: 'step', region: 0, direction: 'up' } },
      { index: 1, color: '#F5A623', glowColor: '#FFD93D', angle: 60, frequency: 293.66, terrainChange: { type: 'bridge', region: 1, direction: 'up' } },
      { index: 2, color: '#F8E71C', glowColor: '#FFF176', angle: 120, frequency: 329.63, terrainChange: { type: 'step', region: 2, direction: 'up' } },
      { index: 3, color: '#7ED321', glowColor: '#A8E063', angle: 180, frequency: 349.23, terrainChange: { type: 'bridge', region: 3, direction: 'up' } },
      { index: 4, color: '#4ECDC4', glowColor: '#88E8DF', angle: 240, frequency: 392.00, terrainChange: { type: 'step', region: 4, direction: 'up' } },
      { index: 5, color: '#9B59B6', glowColor: '#C39BD3', angle: 300, frequency: 440.00, terrainChange: { type: 'bridge', region: 5, direction: 'up' } },
    ],
  },
  {
    id: 4,
    name: '终焉脉冲',
    bpm: 140,
    musicStyle: 'electronic',
    beatMap: [1, 0.3, 1, 0.3, 1, 0.3, 1, 0.3, 1, 0.3, 1, 0.3, 1, 0.3, 1, 0.3],
    tolerance: 85,
    stones: [
      { index: 0, color: '#E84545', glowColor: '#FF6B6B', angle: 0, frequency: 261.63, terrainChange: { type: 'step', region: 0, direction: 'up' } },
      { index: 1, color: '#F5A623', glowColor: '#FFD93D', angle: 60, frequency: 293.66, terrainChange: { type: 'bridge', region: 1, direction: 'up' } },
      { index: 2, color: '#F8E71C', glowColor: '#FFF176', angle: 120, frequency: 329.63, terrainChange: { type: 'step', region: 2, direction: 'up' } },
      { index: 3, color: '#7ED321', glowColor: '#A8E063', angle: 180, frequency: 349.23, terrainChange: { type: 'bridge', region: 3, direction: 'up' } },
      { index: 4, color: '#4ECDC4', glowColor: '#88E8DF', angle: 240, frequency: 392.00, terrainChange: { type: 'step', region: 4, direction: 'up' } },
      { index: 5, color: '#9B59B6', glowColor: '#C39BD3', angle: 300, frequency: 440.00, terrainChange: { type: 'bridge', region: 5, direction: 'up' } },
    ],
  },
]

export const STONE_COLORS = ['#E84545', '#F5A623', '#F8E71C', '#7ED321', '#4ECDC4', '#9B59B6']
export const STONE_GLOW_COLORS = ['#FF6B6B', '#FFD93D', '#FFF176', '#A8E063', '#88E8DF', '#C39BD3']
export const STONE_FREQUENCIES = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00]
