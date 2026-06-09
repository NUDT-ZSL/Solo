import * as THREE from 'three'
import { getCrystalPalette, hslToHex, SceneState } from './colorPalette'

export interface CrystalData {
  id: number
  position: THREE.Vector3
  rotation: THREE.Euler
  rotationSpeed: THREE.Vector3
  scale: number
  seed: number
  hueCyclePeriod: number
  huePhase: number
  geometry: THREE.BufferGeometry
  color: number
  baseColor: number
  isFlashing: boolean
  flashStartTime: number
  isExpanded: boolean
  expandStartTime: number
  hasGlow: boolean
  glowStartTime: number
  clicked: boolean
}

export interface CrystalUpdateState {
  rotation: THREE.Euler
  color: number
  scale: number
  isFlashing: boolean
  isExpanded: boolean
  hasGlow: boolean
  glowOpacity: number
}

export interface PillarData {
  id: number
  basePosition: THREE.Vector3
  height: number
  radius: number
  floatAmplitude: number
  floatFrequency: number
  floatPhase: number
  colorPhase: number
}

export interface ParticleData {
  id: number
  crystalId: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  size: number
  color: number
}

export const createIrregularCrystalGeometry = (
  seed: number,
  faceCount: number = 16,
  baseSize: number = 0.3
): THREE.BufferGeometry => {
  const rng = mulberry32(Math.floor(seed * 1e9))
  const vertices: number[] = []
  const indices: number[] = []

  const topCount = Math.floor(faceCount / 3)
  const midCount = Math.floor(faceCount / 2)
  const bottomCount = faceCount - topCount - midCount

  const topY = baseSize * (1.2 + rng() * 0.6)
  const midY = 0
  const bottomY = -baseSize * (1.0 + rng() * 0.5)

  const positions: THREE.Vector3[] = []

  positions.push(new THREE.Vector3(0, topY * 1.1, 0))
  for (let i = 0; i < topCount; i++) {
    const angle = (i / topCount) * Math.PI * 2 + rng() * 0.3
    const r = baseSize * (0.3 + rng() * 0.4)
    const y = topY * (0.5 + rng() * 0.5)
    positions.push(new THREE.Vector3(
      Math.cos(angle) * r,
      y,
      Math.sin(angle) * r
    ))
  }

  for (let i = 0; i < midCount; i++) {
    const angle = (i / midCount) * Math.PI * 2 + rng() * 0.5
    const r = baseSize * (0.7 + rng() * 0.5)
    const y = midY + (rng() - 0.5) * baseSize * 0.5
    positions.push(new THREE.Vector3(
      Math.cos(angle) * r,
      y,
      Math.sin(angle) * r
    ))
  }

  for (let i = 0; i < bottomCount; i++) {
    const angle = (i / bottomCount) * Math.PI * 2 + rng() * 0.3
    const r = baseSize * (0.2 + rng() * 0.35)
    const y = bottomY * (0.4 + rng() * 0.6)
    positions.push(new THREE.Vector3(
      Math.cos(angle) * r,
      y,
      Math.sin(angle) * r
    ))
  }
  positions.push(new THREE.Vector3(0, bottomY * 1.1, 0))

  const topStart = 1
  const midStart = topStart + topCount
  const bottomStart = midStart + midCount
  const bottomTipIdx = positions.length - 1
  const topTipIdx = 0

  for (let i = 0; i < topCount; i++) {
    const next = (i + 1) % topCount
    indices.push(topTipIdx, topStart + i, topStart + next)
  }

  for (let i = 0; i < midCount; i++) {
    const nextMid = (i + 1) % midCount
    const tIdx = topStart + (i * topCount / midCount) % topCount
    const nextTIdx = topStart + ((i + 1) * topCount / midCount) % topCount

    indices.push(
      midStart + i, midStart + nextMid, Math.floor(tIdx)
    )
    indices.push(
      midStart + nextMid, Math.floor(nextTIdx), Math.floor(tIdx)
    )
  }

  for (let i = 0; i < midCount; i++) {
    const nextMid = (i + 1) % midCount
    const bIdx = bottomStart + (i * bottomCount / midCount) % bottomCount
    const nextBIdx = bottomStart + ((i + 1) * bottomCount / midCount) % bottomCount

    indices.push(
      bottomStart + Math.floor(bIdx), midStart + nextMid, midStart + i
    )
    indices.push(
      bottomStart + Math.floor(bIdx), bottomStart + Math.floor(nextBIdx), midStart + nextMid
    )
  }

  for (let i = 0; i < bottomCount; i++) {
    const next = (i + 1) % bottomCount
    indices.push(bottomTipIdx, bottomStart + next, bottomStart + i)
  }

  positions.forEach(p => {
    vertices.push(p.x, p.y, p.z)
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()

  return geometry
}

function mulberry32(a: number) {
  return function () {
    let t = a += 0x6D2B79F5
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const generateCrystalShellPositions = (
  count: number,
  minRadius: number,
  maxRadius: number
): THREE.Vector3[] => {
  const positions: THREE.Vector3[] = []
  const golden = (3 - Math.sqrt(5)) * Math.PI

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const radiusAtY = Math.sqrt(1 - y * y)
    const theta = golden * i

    const r = minRadius + Math.random() * (maxRadius - minRadius)
    const jitter = 0.15
    const x = Math.cos(theta) * radiusAtY * (1 + (Math.random() - 0.5) * jitter)
    const z = Math.sin(theta) * radiusAtY * (1 + (Math.random() - 0.5) * jitter)
    const yJ = y * (1 + (Math.random() - 0.5) * jitter)

    const len = Math.sqrt(x * x + yJ * yJ + z * z) || 1
    positions.push(new THREE.Vector3(
      x / len * r,
      yJ / len * r,
      z / len * r
    ))
  }

  return positions
}

export const generateCrystals = (
  state: SceneState,
  count: number = 135
): CrystalData[] => {
  const crystals: CrystalData[] = []
  const positions = generateCrystalShellPositions(count, 8, 15)

  for (let i = 0; i < count; i++) {
    const seed = Math.random()
    const faceCount = 12 + Math.floor(Math.random() * 9)
    const geometry = createIrregularCrystalGeometry(seed, faceCount, 0.25 + Math.random() * 0.2)

    const palette = getCrystalPalette(state, seed)
    const hue = palette.minHue + Math.random() * (palette.maxHue - palette.minHue + 360) % 360
    const baseColor = hslToHex(hue, palette.saturation, palette.lightness)

    crystals.push({
      id: i,
      position: positions[i],
      rotation: new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ),
      rotationSpeed: new THREE.Vector3(
        0.01 + Math.random() * 0.04,
        0.01 + Math.random() * 0.04,
        0.01 + Math.random() * 0.04
      ),
      scale: 0.8 + Math.random() * 0.6,
      seed,
      hueCyclePeriod: 30000 + Math.random() * 30000,
      huePhase: Math.random() * Math.PI * 2,
      geometry,
      color: baseColor,
      baseColor,
      isFlashing: false,
      flashStartTime: 0,
      isExpanded: false,
      expandStartTime: 0,
      hasGlow: false,
      glowStartTime: 0,
      clicked: false,
    })
  }

  return crystals
}

export const generatePillars = (count: number = 6): PillarData[] => {
  const pillars: PillarData[] = []
  const angleStep = (Math.PI * 2) / count
  const radius = 1.5 + Math.random() * 1.0

  for (let i = 0; i < count; i++) {
    const angle = i * angleStep + Math.random() * 0.5
    pillars.push({
      id: i,
      basePosition: new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ),
      height: 3 + Math.random() * 3,
      radius: 0.3 + Math.random() * 0.2,
      floatAmplitude: 0.5,
      floatFrequency: 0.1 + Math.random() * 0.2,
      floatPhase: Math.random() * Math.PI * 2,
      colorPhase: Math.random() * 100,
    })
  }

  return pillars
}

export const updateCrystalState = (
  crystal: CrystalData,
  state: SceneState,
  now: number
): CrystalUpdateState => {
  const deltaRotation = crystal.rotationSpeed.clone()
  const audioModulation = 1 + (state.audioLevel - 0.025) * 2

  const newRotation = new THREE.Euler(
    crystal.rotation.x + deltaRotation.x * audioModulation,
    crystal.rotation.y + deltaRotation.y * audioModulation,
    crystal.rotation.z + deltaRotation.z * audioModulation
  )

  const hueCycle = (now / crystal.hueCyclePeriod) * Math.PI * 2 + crystal.huePhase
  const hueShift = Math.sin(hueCycle) * 40
  const palette = getCrystalPalette(state, crystal.seed)
  const baseHue = (palette.minHue + palette.maxHue) / 2
  const hue = ((baseHue + hueShift + crystal.seed * 60) % 360 + 360) % 360
  let currentColor = hslToHex(hue, palette.saturation, palette.lightness)

  if (crystal.isFlashing) {
    const elapsed = now - crystal.flashStartTime
    if (elapsed > 500) {
      crystal.isFlashing = false
    } else {
      currentColor = 0xffffff
    }
  }

  let scale = crystal.scale
  if (crystal.isExpanded) {
    const elapsed = now - crystal.expandStartTime
    const expandDuration = 500
    if (elapsed > expandDuration) {
      crystal.isExpanded = false
    } else {
      const t = elapsed / expandDuration
      const expandFactor = 1 + 0.5 * Math.sin(t * Math.PI)
      scale = crystal.scale * expandFactor
    }
  }

  let glowOpacity = 0
  if (crystal.hasGlow) {
    const elapsed = now - crystal.glowStartTime
    if (elapsed > 1000) {
      crystal.hasGlow = false
    } else {
      const t = 1 - elapsed / 1000
      glowOpacity = 0.2 * t
    }
  }

  return {
    rotation: newRotation,
    color: currentColor,
    scale,
    isFlashing: crystal.isFlashing,
    isExpanded: crystal.isExpanded,
    hasGlow: crystal.hasGlow,
    glowOpacity,
  }
}

export const generateBurstParticles = (
  crystal: CrystalData,
  particleCount: number = 25
): ParticleData[] => {
  const particles: ParticleData[] = []

  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const speed = 0.03 + Math.random() * 0.05

    particles.push({
      id: Date.now() + i,
      crystalId: crystal.id,
      position: crystal.position.clone(),
      velocity: new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ),
      life: 2000,
      maxLife: 2000,
      size: 0.05 + Math.random() * 0.1,
      color: crystal.baseColor,
    })
  }

  return particles
}

export const updateParticle = (
  particle: ParticleData,
  deltaMs: number
): { particle: ParticleData; alive: boolean } => {
  particle.position.add(particle.velocity.clone().multiplyScalar(deltaMs / 16))
  particle.velocity.multiplyScalar(0.98)
  particle.life -= deltaMs

  return {
    particle,
    alive: particle.life > 0,
  }
}
