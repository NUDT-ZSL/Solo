export interface LetterPosition {
  x: number
  y: number
}

export interface Letter {
  id: string
  content: string
  title: string
  coordinates?: string
  symbols?: string
  envelopeColor: string
  createdAt: string
  parentId: string | null
  replyIds: string[]
  position: LetterPosition
}

export interface CreateLetterPayload {
  content: string
  title: string
  coordinates?: string
  symbols?: string
  parentId?: string
}

export interface StarData {
  letter: Letter
  x: number
  y: number
  baseRadius: number
  pulsePhase: number
  pulseSpeed: number
  driftPhaseX: number
  driftPhaseY: number
  driftSpeedX: number
  driftSpeedY: number
  driftAmplitudeX: number
  driftAmplitudeY: number
  isHovered: boolean
  hoverScale: number
  isBinary: boolean
  binaryAngle: number
  binarySpeed: number
  isNew: boolean
  newOpacity: number
  particles: ParticleData[]
}

export interface ParticleData {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  radius: number
  color: string
}

export interface ConstellationNode {
  letter: Letter
  x: number
  y: number
  targetX: number
  targetY: number
  rotation: number
  targetRotation: number
  opacity: number
  targetOpacity: number
  delay: number
}

export interface ConstellationEdge {
  fromId: string
  toId: string
}
