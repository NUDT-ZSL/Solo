export interface SandParticle {
  x: number
  y: number
  z: number
  initialX: number
  initialY: number
  initialZ: number
  radius: number
  color: string
  velocityX: number
  velocityY: number
  velocityZ: number
  displaced: boolean
  bouncePhase: number
  originalIndex: number
  merged: boolean
}

export interface SparkParticle {
  x: number
  y: number
  z: number
  life: number
  maxLife: number
}

export interface FlowLine {
  x1: number
  y1: number
  z1: number
  x2: number
  y2: number
  z2: number
  life: number
}

const GRID_SIZE = 40
const NOISE_FREQ = 0.02
const NOISE_AMP = 1.0
const COLOR_LIGHT = [210, 180, 140]
const COLOR_DARK = [139, 69, 19]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpColor(t: number): string {
  const r = Math.round(lerp(COLOR_DARK[0], COLOR_LIGHT[0], t))
  const g = Math.round(lerp(COLOR_DARK[1], COLOR_LIGHT[1], t))
  const b = Math.round(lerp(COLOR_DARK[2], COLOR_LIGHT[2], t))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3
  const u = h < 2 ? x : y
  const v = h < 2 ? y : x
  return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v)
}

const PERM = new Uint8Array(512)
;(function initPerm() {
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]
})()

export function perlinNoise(x: number, y: number): number {
  const xi = Math.floor(x) & 255
  const yi = Math.floor(y) & 255
  const xf = x - Math.floor(x)
  const yf = y - Math.floor(y)
  const u = fade(xf)
  const v = fade(yf)
  const aa = PERM[PERM[xi] + yi]
  const ab = PERM[PERM[xi] + yi + 1]
  const ba = PERM[PERM[xi + 1] + yi]
  const bb = PERM[PERM[xi + 1] + yi + 1]
  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u)
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u)
  return lerp(x1, x2, v)
}

export function generateInitialTerrain(): SandParticle[] {
  const particles: SandParticle[] = []
  const half = GRID_SIZE / 2
  let maxHeight = -Infinity
  let minHeight = Infinity
  const heights: number[][] = []

  for (let i = 0; i < GRID_SIZE; i++) {
    heights[i] = []
    for (let j = 0; j < GRID_SIZE; j++) {
      const h = perlinNoise(i * NOISE_FREQ, j * NOISE_FREQ) * NOISE_AMP * 6
      heights[i][j] = h
      if (h > maxHeight) maxHeight = h
      if (h < minHeight) minHeight = h
    }
  }

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const x = i - half
      const z = j - half
      const y = heights[i][j]
      const normalizedH = (y - minHeight) / (maxHeight - minHeight || 1)
      particles.push({
        x,
        y,
        z,
        initialX: x,
        initialY: y,
        initialZ: z,
        radius: 1 + Math.random(),
        color: lerpColor(normalizedH),
        velocityX: 0,
        velocityY: 0,
        velocityZ: 0,
        displaced: false,
        bouncePhase: 0,
        originalIndex: i * GRID_SIZE + j,
        merged: false
      })
    }
  }

  return particles
}

export interface BrushStroke {
  centerX: number
  centerZ: number
  dirX: number
  dirZ: number
  radius: number
  strength: number
}

export function applyBrush(
  particles: SandParticle[],
  stroke: BrushStroke
): { particles: SandParticle[]; sparks: SparkParticle[] } {
  const sparks: SparkParticle[] = []
  const updated = particles.map((p) => {
    const dx = p.x - stroke.centerX
    const dz = p.z - stroke.centerZ
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < stroke.radius) {
      const falloff = 1 - dist / stroke.radius
      const pushForce = stroke.strength * falloff * 0.6
      const perpX = stroke.dirX
      const perpZ = stroke.dirZ
      const len = Math.sqrt(perpX * perpX + perpZ * perpZ) || 1
      const nx = perpX / len
      const nz = perpZ / len
      const pushDist = 2 + Math.random() * 2 * falloff
      const newP = { ...p }
      newP.x += nx * pushDist * pushForce
      newP.z += nz * pushDist * pushForce
      newP.y -= (3 + Math.random() * 2) * falloff
      newP.velocityX = nx * pushForce * 0.3
      newP.velocityZ = nz * pushForce * 0.3
      newP.displaced = true
      newP.bouncePhase = 0

      if (Math.random() < 0.4 * falloff) {
        const sparkCount = 3 + Math.floor(Math.random() * 3)
        for (let s = 0; s < sparkCount; s++) {
          sparks.push({
            x: newP.x + (Math.random() - 0.5) * 2,
            y: newP.y + Math.random() * 2,
            z: newP.z + (Math.random() - 0.5) * 2,
            life: 0.3,
            maxLife: 0.3
          })
        }
      }
      return newP
    }
    return p
  })

  return { particles: updated, sparks }
}

export function stepGravity(
  particles: SandParticle[],
  iterations: number = 3
): { particles: SandParticle[]; flowLines: FlowLine[] } {
  const flowLines: FlowLine[] = []
  let working = [...particles]

  for (let iter = 0; iter < iterations; iter++) {
    const positions = [...working]
    working = positions.map((p) => {
      if (p.displaced) {
        const gravityPull = 0.1
        const dy = p.initialY - p.y
        if (Math.abs(dy) > 0.01) {
          const dirY = Math.sign(dy)
          const moveY = Math.min(Math.abs(dy), gravityPull)
          const newP = { ...p }
          newP.y += dirY * moveY

          if (Math.abs(dy) < 1 && p.bouncePhase === 0) {
            newP.bouncePhase = 1
          }

          if (p.bouncePhase > 0) {
            const bounceHeight = Math.sin(p.bouncePhase * Math.PI) * 0.8 * Math.pow(0.8, p.bouncePhase)
            newP.y += bounceHeight
            newP.bouncePhase += 0.05
            if (newP.bouncePhase > 3) {
              newP.bouncePhase = 0
              newP.displaced = false
            }
          }

          newP.x += newP.velocityX
          newP.z += newP.velocityZ
          newP.velocityX *= 0.92
          newP.velocityZ *= 0.92

          if (Math.abs(dy) < 0.05 && Math.abs(newP.velocityX) < 0.01) {
            newP.displaced = false
            newP.velocityX = 0
            newP.velocityZ = 0
          }

          if (Math.random() < 0.02 && iter === 0) {
            flowLines.push({
              x1: p.x,
              y1: p.y,
              z1: p.z,
              x2: newP.x,
              y2: newP.y,
              z2: newP.z,
              life: 0.5
            })
          }

          return newP
        } else {
          return { ...p, displaced: false, velocityX: 0, velocityZ: 0 }
        }
      }
      return p
    })
  }

  working = resolveCollisions(working)
  return { particles: working, flowLines }
}

function resolveCollisions(particles: SandParticle[]): SandParticle[] {
  const grid = new Map<string, number[]>()

  particles.forEach((p, idx) => {
    const key = `${Math.floor(p.x / 2)},${Math.floor(p.z / 2)}`
    if (!grid.has(key)) grid.set(key, [])
    grid.get(key)!.push(idx)
  })

  const result = [...particles]

  particles.forEach((p, i) => {
    const gx = Math.floor(p.x / 2)
    const gz = Math.floor(p.z / 2)
    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        const key = `${gx + ox},${gz + oz}`
        const neighbors = grid.get(key)
        if (!neighbors) continue
        for (const j of neighbors) {
          if (i >= j) continue
          const other = result[j]
          const dx = p.x - other.x
          const dz = p.z - other.z
          const dist = Math.sqrt(dx * dx + dz * dz)
          const minDist = (p.radius + other.radius) * 0.8
          if (dist < minDist && dist > 0) {
            const overlap = (minDist - dist) / 2
            const nx = dx / dist
            const nz = dz / dist
            result[i] = { ...result[i], x: result[i].x + nx * overlap, z: result[i].z + nz * overlap }
            result[j] = { ...result[j], x: result[j].x - nx * overlap, z: result[j].z - nz * overlap }
          }
          const dy = p.y - other.y
          if (Math.abs(dx) < 1.5 && Math.abs(dz) < 1.5 && dy < -0.5) {
            result[i] = { ...result[i], y: other.y + 0.8 }
          }
        }
      }
    }
  })

  return result
}

export function mergeParticles(particles: SandParticle[]): SandParticle[] {
  if (particles.length <= 2000) return particles

  let maxDepth = 0
  particles.forEach(p => {
    const depth = Math.abs(p.initialY - p.y)
    if (depth > maxDepth) maxDepth = depth
  })
  if (maxDepth <= 8) return particles

  const grid = new Map<string, SandParticle[]>()
  particles.forEach(p => {
    const key = `${Math.floor(p.x)},${Math.floor(p.z)}`
    if (!grid.has(key)) grid.set(key, [])
    grid.get(key)!.push(p)
  })

  const merged: SandParticle[] = []
  grid.forEach(group => {
    if (group.length >= 3 && group.length <= 5) {
      const avgRadius = group.reduce((s, p) => s + p.radius, 0) / group.length
      const colors = group.map(p => p.color).sort()
      const midColor = colors[Math.floor(colors.length / 2)]
      const rep = group[0]
      merged.push({
        ...rep,
        x: group.reduce((s, p) => s + p.x, 0) / group.length,
        y: group.reduce((s, p) => s + p.y, 0) / group.length,
        z: group.reduce((s, p) => s + p.z, 0) / group.length,
        radius: avgRadius,
        color: midColor,
        merged: true
      })
    } else {
      merged.push(...group)
    }
  })

  return merged
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function interpolateParticles(
  current: SandParticle[],
  target: SandParticle[],
  t: number
): SandParticle[] {
  const eased = easeOutCubic(t)
  return current.map((p, i) => {
    const tgt = target[i] || p
    return {
      ...p,
      x: lerp(p.x, tgt.initialX, eased),
      y: lerp(p.y, tgt.initialY, eased),
      z: lerp(p.z, tgt.initialZ, eased),
      velocityX: 0,
      velocityY: 0,
      velocityZ: 0,
      displaced: false,
      bouncePhase: 0
    }
  })
}

export const GRID_SIZE_CONST = GRID_SIZE
