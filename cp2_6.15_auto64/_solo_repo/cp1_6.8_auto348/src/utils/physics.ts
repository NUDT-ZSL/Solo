export interface Vec2 {
  x: number
  y: number
}

export function vec2(x: number, y: number): Vec2 {
  return { x, y }
}

export function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function vecSub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function vecScale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s }
}

export function vecLen(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

export function vecNorm(v: Vec2): Vec2 {
  const l = vecLen(v)
  if (l < 1e-8) return { x: 0, y: 0 }
  return { x: v.x / l, y: v.y / l }
}

export function vecDist(a: Vec2, b: Vec2): number {
  return vecLen(vecSub(a, b))
}

export function vecDot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

export function vecCross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x
}

export function vecRotate(v: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export type StarGateType = 'normal' | 'rare' | 'hidden'

export interface StarGate {
  id: string
  pos: Vec2
  radius: number
  type: StarGateType
  requiredHits: number
  currentHits: number
  unlocked: boolean
  hiddenOrbitType?: 'circle' | 'curve'
  glowPhase: number
}

export interface Asteroid {
  id: string
  pos: Vec2
  vel: Vec2
  radius: number
  rotation: number
  rotSpeed: number
  textureSeed: number
  active: boolean
  speedBoostTimer: number
  trail: Vec2[]
}

export interface GravityLine {
  points: Vec2[]
  energyCost: number
  fadeTimer: number
  active: boolean
}

export interface GravityInterferenceZone {
  pos: Vec2
  radius: number
  strength: number
  angle: number
}

export interface BlackHole {
  pos: Vec2
  radius: number
  pullStrength: number
  consumeRadius: number
  pulsePhase: number
}

export interface SpeedStar {
  pos: Vec2
  radius: number
  speedMultiplier: number
  duration: number
  consumed: boolean
  pulsePhase: number
}

export interface StarFragment {
  id: string
  pos: Vec2
  radius: number
  collected: boolean
  pulsePhase: number
}

export interface Nebula {
  pos: Vec2
  size: Vec2
  color: string
  opacity: number
  rotation: number
}

export interface BackgroundStar {
  pos: Vec2
  size: number
  brightness: number
  twinkleSpeed: number
  twinklePhase: number
}

export interface Particle {
  pos: Vec2
  vel: Vec2
  life: number
  maxLife: number
  size: number
  color: string
}

export const GRAVITY_LINE_MAX_LENGTH = 350
export const GRAVITY_LINE_MAX_CURVATURE = Math.PI / 3
export const GRAVITY_LINE_ENERGY_COST_PER_UNIT = 0.25
export const GRAVITY_FORCE_STRENGTH = 800
export const GRAVITY_FORCE_RANGE = 120
export const ENERGY_MAX = 100
export const ENERGY_REGEN_RATE = 8
export const ASTEROID_SPAWN_INTERVAL = 2.5
export const ASTEROID_BASE_SPEED = 60
export const SPEED_BOOST_MULTIPLIER = 2.5
export const SPEED_BOOST_DURATION = 3

export function calculateGravityLineLength(points: Vec2[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += vecDist(points[i - 1], points[i])
  }
  return total
}

export function calculateGravityLineEnergyCost(points: Vec2[]): number {
  return calculateGravityLineLength(points) * GRAVITY_LINE_ENERGY_COST_PER_UNIT
}

export function validateGravityLineCurvature(points: Vec2[]): boolean {
  if (points.length < 3) return true
  for (let i = 2; i < points.length; i++) {
    const a = vecSub(points[i - 1], points[i - 2])
    const b = vecSub(points[i], points[i - 1])
    const na = vecNorm(a)
    const nb = vecNorm(b)
    const dot = vecDot(na, nb)
    const angle = Math.acos(clamp(dot, -1, 1))
    if (angle > GRAVITY_LINE_MAX_CURVATURE) return false
  }
  return true
}

export function canDrawGravityLine(
  points: Vec2[],
  currentEnergy: number
): { valid: boolean; reason?: string } {
  if (points.length < 2) return { valid: false, reason: 'too_short' }
  const length = calculateGravityLineLength(points)
  if (length > GRAVITY_LINE_MAX_LENGTH) return { valid: false, reason: 'too_long' }
  if (!validateGravityLineCurvature(points)) return { valid: false, reason: 'too_curved' }
  const cost = calculateGravityLineEnergyCost(points)
  if (cost > currentEnergy) return { valid: false, reason: 'no_energy' }
  return { valid: true }
}

export function applyGravityForce(
  asteroid: Asteroid,
  gravityLines: GravityLine[],
  interferenceZones: GravityInterferenceZone[],
  dt: number
): Vec2 {
  let totalForce = vec2(0, 0)

  for (const line of gravityLines) {
    if (!line.active) continue
    for (let i = 1; i < line.points.length; i++) {
      const segStart = line.points[i - 1]
      const segEnd = line.points[i]
      const seg = vecSub(segEnd, segStart)
      const segLen = vecLen(seg)
      if (segLen < 1e-4) continue
      const segNorm = vecNorm(seg)
      const toAst = vecSub(asteroid.pos, segStart)
      const proj = clamp(vecDot(toAst, segNorm), 0, segLen)
      const closest = vecAdd(segStart, vecScale(segNorm, proj))
      const dist = vecDist(asteroid.pos, closest)
      if (dist < GRAVITY_FORCE_RANGE && dist > 1) {
        const dir = vecSub(closest, asteroid.pos)
        const ndir = vecNorm(dir)
        const strength = GRAVITY_FORCE_STRENGTH * (1 - dist / GRAVITY_FORCE_RANGE) * dt
        totalForce = vecAdd(totalForce, vecScale(ndir, strength))
      }
    }
  }

  for (const zone of interferenceZones) {
    const dist = vecDist(asteroid.pos, zone.pos)
    if (dist < zone.radius) {
      const deflection = vecRotate(totalForce, zone.angle * zone.strength * dt * (1 - dist / zone.radius))
      totalForce = deflection
    }
  }

  return totalForce
}

export function applyBlackHolePull(
  asteroid: Asteroid,
  blackHoles: BlackHole[],
  dt: number
): { force: Vec2; consumed: boolean } {
  let force = vec2(0, 0)
  let consumed = false

  for (const bh of blackHoles) {
    const dist = vecDist(asteroid.pos, bh.pos)
    if (dist < bh.consumeRadius) {
      consumed = true
      break
    }
    if (dist < bh.radius * 3) {
      const dir = vecNorm(vecSub(bh.pos, asteroid.pos))
      const pull = (bh.pullStrength * bh.radius) / (dist * dist) * dt
      force = vecAdd(force, vecScale(dir, pull))
    }
  }

  return { force, consumed }
}

export function applySpeedStar(
  asteroid: Asteroid,
  speedStars: SpeedStar[]
): SpeedStar | null {
  if (asteroid.speedBoostTimer > 0) return null
  for (const star of speedStars) {
    if (star.consumed) continue
    if (vecDist(asteroid.pos, star.pos) < star.radius + asteroid.radius) {
      return star
    }
  }
  return null
}

export function checkStarGateCollision(
  asteroid: Asteroid,
  gate: StarGate
): boolean {
  if (gate.unlocked) return false
  return vecDist(asteroid.pos, gate.pos) < gate.radius + asteroid.radius
}

export function checkHiddenGateOrbit(
  gate: StarGate,
  asteroids: Asteroid[]
): boolean {
  if (gate.type !== 'hidden' || !gate.hiddenOrbitType) return false

  const nearAsteroids = asteroids.filter(
    a => a.active && vecDist(a.pos, gate.pos) < gate.radius * 4
  )

  if (nearAsteroids.length < 2) return false

  if (gate.hiddenOrbitType === 'circle') {
    const dists = nearAsteroids.map(a => vecDist(a.pos, gate.pos))
    const avgDist = dists.reduce((s, d) => s + d, 0) / dists.length
    const variance = dists.reduce((s, d) => s + (d - avgDist) ** 2, 0) / dists.length
    return variance < 400 && avgDist < gate.radius * 3
  }

  if (gate.hiddenOrbitType === 'curve') {
    const angles = nearAsteroids.map(a => Math.atan2(a.pos.y - gate.pos.y, a.pos.x - gate.pos.x))
    const sortedAngles = angles.sort((a, b) => a - b)
    let totalArc = 0
    for (let i = 1; i < sortedAngles.length; i++) {
      totalArc += sortedAngles[i] - sortedAngles[i - 1]
    }
    return totalArc > Math.PI * 0.8
  }

  return false
}

export function checkFragmentCollection(
  asteroid: Asteroid,
  fragment: StarFragment
): boolean {
  if (fragment.collected) return false
  return vecDist(asteroid.pos, fragment.pos) < fragment.radius + asteroid.radius + 15
}

export function updateAsteroid(
  asteroid: Asteroid,
  gravityLines: GravityLine[],
  interferenceZones: GravityInterferenceZone[],
  blackHoles: BlackHole[],
  speedStars: SpeedStar[],
  dt: number
): Asteroid {
  if (!asteroid.active) return asteroid

  const gravForce = applyGravityForce(asteroid, gravityLines, interferenceZones, dt)
  const { force: bhForce, consumed } = applyBlackHolePull(asteroid, blackHoles, dt)

  if (consumed) {
    return { ...asteroid, active: false, trail: [] }
  }

  let newVel = vecAdd(asteroid.vel, vecAdd(gravForce, bhForce))
  if (asteroid.speedBoostTimer > 0) {
    newVel = vecScale(newVel, 1 + (SPEED_BOOST_MULTIPLIER - 1) * Math.min(asteroid.speedBoostTimer / SPEED_BOOST_DURATION, 1) * 0.02)
  }

  const speed = vecLen(newVel)
  const maxSpeed = ASTEROID_BASE_SPEED * 8
  if (speed > maxSpeed) {
    newVel = vecScale(vecNorm(newVel), maxSpeed)
  }

  const newPos = vecAdd(asteroid.pos, vecScale(newVel, dt))
  const newRotation = asteroid.rotation + asteroid.rotSpeed * dt
  const newBoostTimer = Math.max(0, asteroid.speedBoostTimer - dt)

  const newTrail = [...asteroid.trail, newPos]
  const maxTrailLen = 20
  const trimmedTrail = newTrail.length > maxTrailLen ? newTrail.slice(newTrail.length - maxTrailLen) : newTrail

  return {
    ...asteroid,
    pos: newPos,
    vel: newVel,
    rotation: newRotation,
    speedBoostTimer: newBoostTimer,
    trail: trimmedTrail,
  }
}

export function updateEnergy(currentEnergy: number, dt: number): number {
  return Math.min(ENERGY_MAX, currentEnergy + ENERGY_REGEN_RATE * dt)
}

export interface LevelScore {
  time: number
  energyUsed: number
  fragmentsCollected: number
  totalFragments: number
  starRating: number
}

export function calculateLevelScore(
  time: number,
  energyUsed: number,
  fragmentsCollected: number,
  totalFragments: number
): LevelScore {
  const timeScore = Math.max(0, 100 - time * 2)
  const energyEfficiency = Math.max(0, 100 - energyUsed)
  const fragmentRate = totalFragments > 0 ? (fragmentsCollected / totalFragments) * 100 : 100
  const totalScore = (timeScore + energyEfficiency + fragmentRate) / 3
  const starRating = totalScore > 80 ? 3 : totalScore > 50 ? 2 : totalScore > 20 ? 1 : 0

  return {
    time,
    energyUsed,
    fragmentsCollected,
    totalFragments,
    starRating,
  }
}

export interface LevelConfig {
  id: number
  name: string
  asteroids: { pos: Vec2; vel: Vec2; radius: number }[]
  starGates: { pos: Vec2; type: StarGateType; hiddenOrbitType?: 'circle' | 'curve' }[]
  fragments: Vec2[]
  interferenceZones: { pos: Vec2; radius: number; strength: number; angle: number }[]
  blackHoles: { pos: Vec2; radius: number }[]
  speedStars: { pos: Vec2; radius: number }[]
  nebulae: { pos: Vec2; size: Vec2; color: string; opacity: number }[]
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    id: 1,
    name: '星尘起航',
    asteroids: [
      { pos: vec2(120, 300), vel: vec2(ASTEROID_BASE_SPEED, 10), radius: 12 },
      { pos: vec2(120, 400), vel: vec2(ASTEROID_BASE_SPEED, -5), radius: 10 },
      { pos: vec2(100, 200), vel: vec2(ASTEROID_BASE_SPEED + 10, 20), radius: 14 },
      { pos: vec2(140, 500), vel: vec2(ASTEROID_BASE_SPEED - 5, -15), radius: 11 },
      { pos: vec2(110, 350), vel: vec2(ASTEROID_BASE_SPEED + 5, 0), radius: 13 },
    ],
    starGates: [
      { pos: vec2(700, 350), type: 'normal' },
    ],
    fragments: [
      vec2(400, 200),
      vec2(500, 450),
      vec2(300, 500),
    ],
    interferenceZones: [],
    blackHoles: [],
    speedStars: [],
    nebulae: [
      { pos: vec2(600, 150), size: vec2(200, 120), color: '#4a1a7a', opacity: 0.15 },
      { pos: vec2(200, 500), size: vec2(150, 100), color: '#1a3a7a', opacity: 0.1 },
    ],
  },
  {
    id: 2,
    name: '暗流涌动',
    asteroids: [
      { pos: vec2(100, 250), vel: vec2(ASTEROID_BASE_SPEED, 30), radius: 12 },
      { pos: vec2(130, 400), vel: vec2(ASTEROID_BASE_SPEED, -20), radius: 10 },
      { pos: vec2(90, 150), vel: vec2(ASTEROID_BASE_SPEED + 5, 15), radius: 14 },
      { pos: vec2(110, 500), vel: vec2(ASTEROID_BASE_SPEED - 10, -10), radius: 11 },
      { pos: vec2(140, 350), vel: vec2(ASTEROID_BASE_SPEED, 0), radius: 13 },
      { pos: vec2(120, 450), vel: vec2(ASTEROID_BASE_SPEED + 10, -25), radius: 10 },
      { pos: vec2(100, 300), vel: vec2(ASTEROID_BASE_SPEED, 5), radius: 12 },
    ],
    starGates: [
      { pos: vec2(650, 250), type: 'normal' },
      { pos: vec2(700, 480), type: 'rare' },
    ],
    fragments: [
      vec2(350, 180),
      vec2(450, 350),
      vec2(550, 520),
      vec2(250, 400),
      vec2(400, 100),
    ],
    interferenceZones: [
      { pos: vec2(400, 300), radius: 100, strength: 0.8, angle: Math.PI / 4 },
    ],
    blackHoles: [],
    speedStars: [
      { pos: vec2(500, 150), radius: 20 },
    ],
    nebulae: [
      { pos: vec2(300, 200), size: vec2(180, 130), color: '#2a1a5a', opacity: 0.18 },
      { pos: vec2(650, 400), size: vec2(120, 80), color: '#5a1a3a', opacity: 0.12 },
    ],
  },
  {
    id: 3,
    name: '深渊回响',
    asteroids: [
      { pos: vec2(80, 200), vel: vec2(ASTEROID_BASE_SPEED + 10, 40), radius: 12 },
      { pos: vec2(100, 350), vel: vec2(ASTEROID_BASE_SPEED, -30), radius: 14 },
      { pos: vec2(120, 500), vel: vec2(ASTEROID_BASE_SPEED - 5, -15), radius: 10 },
      { pos: vec2(90, 100), vel: vec2(ASTEROID_BASE_SPEED + 15, 25), radius: 13 },
      { pos: vec2(110, 450), vel: vec2(ASTEROID_BASE_SPEED + 5, -10), radius: 11 },
      { pos: vec2(130, 280), vel: vec2(ASTEROID_BASE_SPEED, 10), radius: 12 },
      { pos: vec2(100, 420), vel: vec2(ASTEROID_BASE_SPEED - 10, 20), radius: 10 },
      { pos: vec2(80, 550), vel: vec2(ASTEROID_BASE_SPEED + 20, -35), radius: 14 },
    ],
    starGates: [
      { pos: vec2(680, 200), type: 'normal' },
      { pos: vec2(720, 450), type: 'rare' },
      { pos: vec2(400, 100), type: 'hidden', hiddenOrbitType: 'circle' },
    ],
    fragments: [
      vec2(300, 150),
      vec2(500, 300),
      vec2(350, 450),
      vec2(600, 500),
      vec2(200, 350),
      vec2(450, 100),
      vec2(550, 200),
    ],
    interferenceZones: [
      { pos: vec2(350, 300), radius: 120, strength: 1.0, angle: Math.PI / 3 },
      { pos: vec2(550, 450), radius: 80, strength: 0.6, angle: -Math.PI / 6 },
    ],
    blackHoles: [
      { pos: vec2(450, 350), radius: 30 },
    ],
    speedStars: [
      { pos: vec2(250, 200), radius: 22 },
      { pos: vec2(600, 300), radius: 18 },
    ],
    nebulae: [
      { pos: vec2(200, 300), size: vec2(200, 150), color: '#3a0a5a', opacity: 0.2 },
      { pos: vec2(550, 150), size: vec2(160, 110), color: '#0a2a5a', opacity: 0.15 },
      { pos: vec2(400, 500), size: vec2(180, 90), color: '#5a0a2a', opacity: 0.12 },
    ],
  },
]

export function createLevelState(config: LevelConfig): {
  asteroids: Asteroid[]
  starGates: StarGate[]
  fragments: StarFragment[]
} {
  const asteroids: Asteroid[] = config.asteroids.map((a, i) => ({
    id: `ast_${i}`,
    pos: { ...a.pos },
    vel: { ...a.vel },
    radius: a.radius,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 2,
    textureSeed: Math.random() * 1000,
    active: true,
    speedBoostTimer: 0,
    trail: [],
  }))

  const hitReqs: Record<StarGateType, number> = {
    normal: 3,
    rare: 5,
    hidden: 3,
  }

  const starGates: StarGate[] = config.starGates.map((g, i) => ({
    id: `gate_${i}`,
    pos: { ...g.pos },
    radius: g.type === 'rare' ? 38 : g.type === 'hidden' ? 32 : 34,
    type: g.type,
    requiredHits: hitReqs[g.type],
    currentHits: 0,
    unlocked: false,
    hiddenOrbitType: g.hiddenOrbitType,
    glowPhase: Math.random() * Math.PI * 2,
  }))

  const fragments: StarFragment[] = config.fragments.map((f, i) => ({
    id: `frag_${i}`,
    pos: { ...f },
    radius: 8,
    collected: false,
    pulsePhase: Math.random() * Math.PI * 2,
  }))

  return { asteroids, starGates, fragments }
}
