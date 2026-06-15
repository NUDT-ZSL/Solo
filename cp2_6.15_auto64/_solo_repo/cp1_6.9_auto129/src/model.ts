export interface Vector2 {
  x: number
  y: number
}

export interface MemoryFragment {
  id: number
  color: string
  position: Vector2
  collected: boolean
  diameter: number
  glowRadius: number
  glowAlpha: number
  driftSpeed: number
  rotation: number
  rotationSpeed: number
  emitTimer: number
  emitInterval: number
}

export interface RiverSegment {
  flowSpeed: number
  waveAmplitude: number
  gateActive: boolean
  centerOffset: number
  wavePhase: number
}

export interface BoatState {
  x: number
  y: number
  headingAngle: number
  targetHeadingAngle: number
  speed: number
  lanternIntensity: number
  lanternRadius: number
  lanternColor: string
  bounceBackTimer: number
}

export interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  startSize: number
  color: string
  alpha: number
  startAlpha: number
  life: number
  maxLife: number
  type: 'trail' | 'fragment-emit' | 'burst'
}

export interface Portal {
  id: number
  color: string
  x: number
  y: number
  width: number
  height: number
  pulseTimer: number
  pulsePeriod: number
  rotation: number
  active: boolean
}

export interface BurstAnimation {
  id: number
  x: number
  y: number
  color: string
  timer: number
  duration: number
  startDiameter: number
  endDiameter: number
}

export interface GameModel {
  boat: BoatState
  fragments: MemoryFragment[]
  particles: Particle[]
  river: RiverSegment
  portals: Portal[]
  bursts: BurstAnimation[]
  colorFragmentCounts: Record<string, number>
  totalCollected: number
  portalsCleared: number
  portalsRequired: number
  fragmentSpawnTimer: number
  fragmentSpawnInterval: number
  nextFragmentId: number
  nextParticleId: number
  nextPortalId: number
  nextBurstId: number
  screenFlash: {
    active: boolean
    color: string
    timer: number
    duration: number
  }
  fadeOut: {
    active: boolean
    timer: number
    duration: number
  }
  canvasWidth: number
  canvasHeight: number
  riverWidth: number
  riverLeft: number
  riverRight: number
  gameState: 'playing' | 'victory' | 'defeat'
}

export const FRAGMENT_COLORS: string[] = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#A29BFE',
  '#FD79A8',
  '#55EFC4'
]

export function createInitialModel(canvasWidth: number, canvasHeight: number): GameModel {
  const riverWidth = 500
  const riverLeft = (canvasWidth - riverWidth) / 2
  const riverRight = riverLeft + riverWidth
  const boatStartX = canvasWidth / 2
  const boatStartY = canvasHeight - 80

  return {
    boat: {
      x: boatStartX,
      y: boatStartY,
      headingAngle: -Math.PI / 2,
      targetHeadingAngle: -Math.PI / 2,
      speed: 2,
      lanternIntensity: 20,
      lanternRadius: 20,
      lanternColor: '#FFFFFF',
      bounceBackTimer: 0
    },
    fragments: [],
    particles: [],
    river: {
      flowSpeed: 1,
      waveAmplitude: 3,
      gateActive: false,
      centerOffset: 0,
      wavePhase: 0
    },
    portals: [],
    bursts: [],
    colorFragmentCounts: {},
    totalCollected: 0,
    portalsCleared: 0,
    portalsRequired: 3,
    fragmentSpawnTimer: 0,
    fragmentSpawnInterval: 2000,
    nextFragmentId: 1,
    nextParticleId: 1,
    nextPortalId: 1,
    nextBurstId: 1,
    screenFlash: {
      active: false,
      color: '#FFFFFF',
      timer: 0,
      duration: 0
    },
    fadeOut: {
      active: false,
      timer: 0,
      duration: 0
    },
    canvasWidth,
    canvasHeight,
    riverWidth,
    riverLeft,
    riverRight,
    gameState: 'playing'
  }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 }
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(x => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
  )
}

export function mixColors(color1: string, color2: string, ratio: number = 0.5): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  return rgbToHex(
    c1.r * (1 - ratio) + c2.r * ratio,
    c1.g * (1 - ratio) + c2.g * ratio,
    c1.b * (1 - ratio) + c2.b * ratio
  )
}
