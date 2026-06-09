import * as THREE from 'three'
import {
  RoadGridData,
  RoadSegment,
  RoadDirection,
  getSegmentById,
  getPointOnSegment,
  getLaneOffset
} from './roadGrid'

export interface TrafficParticle {
  id: number
  position: THREE.Vector3
  baseSpeed: number
  currentSpeed: number
  color: THREE.Color
  segmentId: string
  progress: number
  direction: 1 | -1
  lane: number
  isInHotspot: boolean
  hotspotTimer: number
  hotspotOrigin: THREE.Vector3
  hotspotTarget: THREE.Vector3
  originalProgress: number
  originalDirection: 1 | -1
  originalSegmentId: string
  recoverTimer: number
}

export interface CongestedSegment {
  segmentId: string
  particleCount: number
  startTime: number
  pulsePhase: number
}

export interface HotspotEvent {
  id: number
  center: THREE.Vector3
  radius: number
  affectedSegments: string[]
  startTime: number
  gatherDuration: number
  glowDuration: number
  totalDuration: number
}

export interface ParticleSystemState {
  particles: TrafficParticle[]
  congestedSegments: Map<string, CongestedSegment>
  hotspots: HotspotEvent[]
  segmentParticleCounts: Map<string, number>
  stats: {
    totalCount: number
    avgSpeed: number
    congestedCount: number
  }
}

const COLOR_LOW = new THREE.Color(0x00FFCC)
const COLOR_MID = new THREE.Color(0xFFAA00)
const COLOR_HIGH = new THREE.Color(0xFF4400)
const COLOR_CONGESTED = new THREE.Color(0xFF0066)
const COLOR_HOTSPOT = new THREE.Color(0xFF2200)

const CONGESTION_THRESHOLD = 200
const HOTSPOT_RADIUS = 30
const GATHER_DURATION = 1
const GLOW_DURATION = 2
const PULSE_PERIOD = 0.8

export function congestionToColor(densityRatio: number): THREE.Color {
  const r = Math.max(0, Math.min(1, densityRatio))
  const color = new THREE.Color()
  if (r < 0.5) {
    color.lerpColors(COLOR_LOW, COLOR_MID, r * 2)
  } else {
    color.lerpColors(COLOR_MID, COLOR_HIGH, (r - 0.5) * 2)
  }
  return color
}

let _particleIdCounter = 0
let _hotspotIdCounter = 0

function createSingleParticle(
  gridData: RoadGridData,
  particleId: number
): TrafficParticle {
  const segments = gridData.segments
  const seg = segments[Math.floor(Math.random() * segments.length)]
  const lane = Math.random() < 0.5 ? 0 : 1
  const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1
  const baseSpeed = 5 + Math.random() * 10
  const progress = Math.random()
  const laneOffset = getLaneOffset(seg, lane, 2)
  const position = getPointOnSegment(seg, progress, direction, laneOffset)
  position.y = 0.5 + Math.random() * 0.5

  return {
    id: particleId,
    position,
    baseSpeed,
    currentSpeed: baseSpeed,
    color: congestionToColor(0).clone(),
    segmentId: seg.id,
    progress,
    direction,
    lane,
    isInHotspot: false,
    hotspotTimer: 0,
    hotspotOrigin: new THREE.Vector3(),
    hotspotTarget: new THREE.Vector3(),
    originalProgress: progress,
    originalDirection: direction,
    originalSegmentId: seg.id,
    recoverTimer: 0
  }
}

export function createParticleSystem(
  gridData: RoadGridData,
  minParticles: number = 2500,
  maxParticles: number = 3500
): ParticleSystemState {
  _particleIdCounter = 0
  _hotspotIdCounter = 0
  const targetCount = Math.floor((minParticles + maxParticles) / 2)
  const particles: TrafficParticle[] = []
  for (let i = 0; i < targetCount; i++) {
    particles.push(createSingleParticle(gridData, _particleIdCounter++))
  }
  return {
    particles,
    congestedSegments: new Map(),
    hotspots: [],
    segmentParticleCounts: new Map(),
    stats: {
      totalCount: particles.length,
      avgSpeed: 10,
      congestedCount: 0
    }
  }
}

function chooseNextSegment(
  current: RoadSegment,
  direction: 1 | -1,
  gridData: RoadGridData
): { segment: RoadSegment; newDirection: 1 | -1 } | null {
  const adjacents = current.adjacentSegments
    .map(id => getSegmentById(gridData, id))
    .filter((s): s is RoadSegment => !!s)

  const isHorizontal = current.direction === RoadDirection.HORIZONTAL
  const targetCol = isHorizontal
    ? (direction === 1 ? current.gridIndex.segmentIndex + 1 : current.gridIndex.segmentIndex)
    : current.gridIndex.col
  const targetRow = isHorizontal
    ? current.gridIndex.row
    : (direction === 1 ? current.gridIndex.segmentIndex + 1 : current.gridIndex.segmentIndex)

  const straight = adjacents.find(s => {
    if (s.direction !== current.direction) return false
    if (isHorizontal) {
      if (direction === 1) return s.gridIndex.segmentIndex === current.gridIndex.segmentIndex + 1
      return s.gridIndex.segmentIndex === current.gridIndex.segmentIndex - 1
    } else {
      if (direction === 1) return s.gridIndex.segmentIndex === current.gridIndex.segmentIndex + 1
      return s.gridIndex.segmentIndex === current.gridIndex.segmentIndex - 1
    }
  })

  const perpendicular = adjacents.filter(s => s.direction !== current.direction)

  const candidates: Array<{ segment: RoadSegment; newDirection: 1 | -1; weight: number }> = []
  if (straight) {
    candidates.push({ segment: straight, newDirection: direction, weight: 0.34 })
  }
  perpendicular.forEach(s => {
    const sIsHorizontal = s.direction === RoadDirection.HORIZONTAL
    if (sIsHorizontal) {
      if (targetCol >= 0 && targetCol < 6 && s.gridIndex.row === targetRow) {
        candidates.push({ segment: s, newDirection: 1 as const, weight: 0.33 })
        candidates.push({ segment: s, newDirection: -1 as const, weight: 0.33 })
      }
    } else {
      if (targetRow >= 0 && targetRow < 6 && s.gridIndex.col === targetCol) {
        candidates.push({ segment: s, newDirection: 1 as const, weight: 0.33 })
        candidates.push({ segment: s, newDirection: -1 as const, weight: 0.33 })
      }
    }
  })

  if (candidates.length === 0) return null
  const totalWeight = candidates.reduce((s, c) => s + c.weight, 0)
  let r = Math.random() * totalWeight
  for (const c of candidates) {
    r -= c.weight
    if (r <= 0) return { segment: c.segment, newDirection: c.newDirection }
  }
  const last = candidates[candidates.length - 1]
  return { segment: last.segment, newDirection: last.newDirection }
}

const _tmpVec = new THREE.Vector3()

export function updateParticles(
  state: ParticleSystemState,
  gridData: RoadGridData,
  deltaTime: number,
  currentTime: number
): ParticleSystemState {
  const segmentCounts = new Map<string, number>()
  for (const p of state.particles) {
    segmentCounts.set(p.segmentId, (segmentCounts.get(p.segmentId) || 0) + 1)
  }
  state.segmentParticleCounts = segmentCounts

  const newCongested = new Map<string, CongestedSegment>()
  for (const [segId, count] of segmentCounts) {
    if (count > CONGESTION_THRESHOLD) {
      const existing = state.congestedSegments.get(segId)
      newCongested.set(segId, {
        segmentId: segId,
        particleCount: count,
        startTime: existing ? existing.startTime : currentTime,
        pulsePhase: ((existing ? existing.pulsePhase : 0) + deltaTime / PULSE_PERIOD) % 1
      })
    }
  }
  state.congestedSegments = newCongested

  state.hotspots = state.hotspots.filter(h => {
    const elapsed = currentTime - h.startTime
    return elapsed < h.totalDuration
  })

  let totalSpeed = 0

  for (const p of state.particles) {
    if (p.isInHotspot) {
      p.hotspotTimer -= deltaTime
      const hotspot = state.hotspots.find(h => h.affectedSegments.includes(p.segmentId))
      if (hotspot) {
        const elapsed = currentTime - hotspot.startTime
        const gatherT = Math.min(1, elapsed / GATHER_DURATION)
        const easeOutQuad = 1 - (1 - gatherT) * (1 - gatherT)
        _tmpVec.lerpVectors(p.hotspotOrigin, p.hotspotTarget, easeOutQuad)
        p.position.copy(_tmpVec)
        p.color.copy(COLOR_HOTSPOT)
        p.currentSpeed = 0

        if (elapsed >= hotspot.totalDuration - 0.3) {
          p.recoverTimer += deltaTime
          if (p.recoverTimer > 0.3) {
            p.isInHotspot = false
            p.currentSpeed = p.baseSpeed
            const origSeg = getSegmentById(gridData, p.originalSegmentId)
            if (origSeg) {
              p.segmentId = p.originalSegmentId
              p.progress = p.originalProgress
              p.direction = p.originalDirection
              const laneOffset = getLaneOffset(origSeg, p.lane, 2)
              const pos = getPointOnSegment(origSeg, p.progress, p.direction, laneOffset)
              p.position.copy(pos)
              p.position.y = 0.5 + Math.random() * 0.5
            }
          }
        }
      } else {
        p.isInHotspot = false
        p.currentSpeed = p.baseSpeed
      }
      totalSpeed += p.currentSpeed
      continue
    }

    p.recoverTimer = 0
    const inHotspotSeg = state.hotspots.some(h => h.affectedSegments.includes(p.segmentId))
    const segCount = segmentCounts.get(p.segmentId) || 0
    const isCongested = segCount > CONGESTION_THRESHOLD

    let speedMultiplier = 1
    if (inHotspotSeg) {
      speedMultiplier = 0.2
      p.color = COLOR_HOTSPOT.clone()
    } else if (isCongested) {
      speedMultiplier = 0.5
      p.color = COLOR_CONGESTED.clone()
    } else {
      const densityRatio = segCount / CONGESTION_THRESHOLD
      p.color = congestionToColor(densityRatio)
    }
    p.currentSpeed = p.baseSpeed * speedMultiplier
    totalSpeed += p.currentSpeed

    const seg = getSegmentById(gridData, p.segmentId)
    if (!seg) {
      p.progress += (p.currentSpeed * deltaTime) / 200
      if (p.progress > 1 || p.progress < 0) {
        const newSeg = gridData.segments[Math.floor(Math.random() * gridData.segments.length)]
        p.segmentId = newSeg.id
        p.progress = Math.random()
        p.direction = Math.random() < 0.5 ? 1 : -1
      }
      continue
    }

    const moveAmount = (p.currentSpeed * deltaTime) / seg.length
    if (p.direction === 1) {
      p.progress += moveAmount
    } else {
      p.progress -= moveAmount
    }

    if (p.progress >= 1 || p.progress <= 0) {
      const nextDir = p.progress >= 1 ? 1 : -1
      const next = chooseNextSegment(seg, nextDir as 1 | -1, gridData)
      if (next) {
        p.segmentId = next.segment.id
        p.direction = next.newDirection
        if (nextDir === 1) {
          p.progress = p.progress - 1
        } else {
          p.progress = 1 + p.progress
        }
        p.progress = Math.max(0.01, Math.min(0.99, p.progress))
      } else {
        p.direction = (p.direction === 1 ? -1 : 1) as 1 | -1
        p.progress = Math.max(0.05, Math.min(0.95, p.progress))
      }
    }

    const currentSeg = getSegmentById(gridData, p.segmentId) || seg
    const laneOffset = getLaneOffset(currentSeg, p.lane, 2)
    const newPos = getPointOnSegment(currentSeg, p.progress, p.direction, laneOffset)
    newPos.y = 0.5 + (p.id % 10) * 0.05
    p.position.lerp(newPos, Math.min(1, deltaTime * 10))
  }

  state.stats.totalCount = state.particles.length
  state.stats.avgSpeed = state.particles.length > 0
    ? totalSpeed / state.particles.length
    : 0
  state.stats.congestedCount = state.congestedSegments.size

  return state
}

export function triggerHotspot(
  state: ParticleSystemState,
  gridData: RoadGridData,
  targetSegmentId: string,
  clickWorldPos: THREE.Vector3,
  currentTime: number
): ParticleSystemState {
  const targetSeg = getSegmentById(gridData, targetSegmentId)
  if (!targetSeg) return state

  const affectedSet = new Set<string>([targetSegmentId])
  for (const adjId of targetSeg.adjacentSegments.slice(0, 2)) {
    affectedSet.add(adjId)
  }
  const affectedSegments = Array.from(affectedSet)

  const hotspotId = _hotspotIdCounter++
  const hotspot: HotspotEvent = {
    id: hotspotId,
    center: clickWorldPos.clone(),
    radius: HOTSPOT_RADIUS,
    affectedSegments,
    startTime: currentTime,
    gatherDuration: GATHER_DURATION,
    glowDuration: GLOW_DURATION,
    totalDuration: GATHER_DURATION + GLOW_DURATION
  }
  state.hotspots.push(hotspot)

  for (const p of state.particles) {
    if (affectedSegments.includes(p.segmentId)) {
      if (p.isInHotspot) continue
      p.isInHotspot = true
      p.hotspotTimer = hotspot.totalDuration
      p.hotspotOrigin.copy(p.position)

      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * HOTSPOT_RADIUS * 0.6
      p.hotspotTarget.set(
        clickWorldPos.x + Math.cos(angle) * r,
        clickWorldPos.y + 1 + Math.random() * 2,
        clickWorldPos.z + Math.sin(angle) * r
      )
      p.originalSegmentId = p.segmentId
      p.originalProgress = p.progress
      p.originalDirection = p.direction
      p.recoverTimer = 0
    }
  }

  return state
}

export function adjustParticleCount(
  state: ParticleSystemState,
  gridData: RoadGridData,
  targetCount: number
): ParticleSystemState {
  const diff = targetCount - state.particles.length
  if (diff === 0) return state

  if (diff > 0) {
    for (let i = 0; i < diff; i++) {
      state.particles.push(createSingleParticle(gridData, _particleIdCounter++))
    }
  } else {
    state.particles.splice(state.particles.length + diff, -diff)
  }
  state.stats.totalCount = state.particles.length
  return state
}
