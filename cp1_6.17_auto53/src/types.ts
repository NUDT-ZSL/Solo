export type WaveType = 'sine' | 'square' | 'triangle'
export type WallType = 'stone' | 'crystal' | 'metal'
export type TileType = 'path' | 'wall' | 'door' | 'fragment' | 'start' | 'end'

export interface Position {
  x: number
  y: number
}

export interface Tile {
  x: number
  y: number
  type: TileType
  wallType?: WallType
  doorId?: string
  doorFrequency?: number
  fragmentId?: string
  isOpen?: boolean
  isFragmentWall?: boolean
  hasTuningFork?: boolean
  tuningForkActivated?: boolean
}

export interface Fragment {
  id: string
  position: Position
  frequency: number
  collected: boolean
}

export interface SoundWave {
  id: string
  position: Position
  direction: { dx: number; dy: number }
  frequency: number
  waveType: WaveType
  active: boolean
  trail: Array<{ x: number; y: number; alpha: number; timestamp: number }>
  bounces: number
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

export interface Door {
  id: string
  position: Position
  frequency: number
  isOpen: boolean
  openProgress: number
}
