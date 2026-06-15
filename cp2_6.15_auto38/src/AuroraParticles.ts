import * as THREE from 'three'
import type { ColorMode } from './store'

const RIBBON_WIDTH = 30
const RIBBON_LENGTH = 120
const TWIST_AMPLITUDE = 10
const ROTATION_SPEED = 1.2
const WAVE_AMPLITUDE = 5
const WAVE_FREQUENCY = 0.3
const EXPLOSION_RADIUS = 15
const EXPLOSION_DURATION = 0.3
const EXPLOSION_SPEED = 120
const RECOVERY_DELAY = 1.5
const RECOVERY_DURATION = 1.0
const COLOR_TRANSITION_DURATION = 0.5
const COLOR_CYCLE_SPEED = 0.15
const PARTICLE_SPAWN_DURATION = 0.8

export interface ExplosionState {
  isExploding: boolean
  isRecovering: boolean
  explosionStartTime: number
  explodedOffset: THREE.Vector3 | null
  explodedColor: THREE.Color | null
  originalPosition: THREE.Vector3
  originalColor: THREE.Color
}

export interface AuroraData {
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  points: THREE.Points
  basePositions: Float32Array
  colorPhases: Float32Array
  originalColors: Float32Array
  currentColors: Float32Array
  targetColors: Float32Array
  sizes: Float32Array
  explosionStates: Map<number, ExplosionState>
  baseAngle: number
  currentColorMode: ColorMode
  colorTransitionStart: number
  isTransitioningColor: boolean
  transitionStartColors: Float32Array | null
  transitionStartPhases: Float32Array | null
  newParticleIndices: Map<number, number>
  lastUpdateTime: number
}

function lerpColor(
  t: number,
  colors: THREE.Color[]
): THREE.Color {
  const clampedT = ((t % 1) + 1) % 1
  const segmentCount = colors.length - 1
  const segment = clampedT * segmentCount
  const index = Math.floor(segment)
  const localT = segment - index
  const nextIndex = Math.min(index + 1, colors.length - 1)

  const color = new THREE.Color()
  color.r = colors[index].r + (colors[nextIndex].r - colors[index].r) * localT
  color.g = colors[index].g + (colors[nextIndex].g - colors[index].g) * localT
  color.b = colors[index].b + (colors[nextIndex].b - colors[index].b) * localT
  return color
}

function getColorPalette(mode: ColorMode): THREE.Color[] {
  switch (mode) {
    case 'arcticGreen':
      return [
        new THREE.Color('#00ff88'),
        new THREE.Color('#00ffcc'),
        new THREE.Color('#88ffaa'),
        new THREE.Color('#00ff88'),
      ]
    case 'auroraPurple':
      return [
        new THREE.Color('#6600ff'),
        new THREE.Color('#aa00ff'),
        new THREE.Color('#ff00cc'),
        new THREE.Color('#6600ff'),
      ]
    case 'flameRed':
      return [
        new THREE.Color('#ff4400'),
        new THREE.Color('#ffaa00'),
        new THREE.Color('#ff0066'),
        new THREE.Color('#ff4400'),
      ]
    case 'auto':
    default:
      return [
        new THREE.Color('#00ffaa'),
        new THREE.Color('#4400ff'),
        new THREE.Color('#ff00aa'),
        new THREE.Color('#00ffaa'),
      ]
  }
}

function generateRandomBrightColor(): THREE.Color {
  const hue = Math.random()
  const color = new THREE.Color().setHSL(hue, 1, 0.6)
  return color
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function easeOutQuadratic(t: number): number {
  return t * (2 - t)
}

export function createAuroraParticles(count: number): AuroraData {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const basePositions = new Float32Array(count * 3)
  const colorPhases = new Float32Array(count)
  const originalColors = new Float32Array(count * 3)
  const currentColors = new Float32Array(count * 3)
  const targetColors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)

  const autoPalette = getColorPalette('auto')

  for (let i = 0; i < count; i++) {
    const t = i / count
    const xOffset = (Math.random() - 0.5) * RIBBON_WIDTH
    const zOffset = (t - 0.5) * RIBBON_LENGTH

    const twistAngle = t * Math.PI * 4
    const yOffset = Math.sin(twistAngle) * TWIST_AMPLITUDE * Math.random()
    const xTwist = Math.cos(twistAngle) * 3 * Math.random()

    const x = xOffset + xTwist
    const y = yOffset - 10
    const z = zOffset

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    basePositions[i * 3] = x
    basePositions[i * 3 + 1] = y
    basePositions[i * 3 + 2] = z

    colorPhases[i] = Math.random()

    const colorT = t
    const color = lerpColor(colorT, autoPalette)
    originalColors[i * 3] = color.r
    originalColors[i * 3 + 1] = color.g
    originalColors[i * 3 + 2] = color.b

    currentColors[i * 3] = color.r
    currentColors[i * 3 + 1] = color.g
    currentColors[i * 3 + 2] = color.b

    targetColors[i * 3] = color.r
    targetColors[i * 3 + 1] = color.g
    targetColors[i * 3 + 2] = color.b

    sizes[i] = 1 + Math.random() * 3
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(currentColors, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.5)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)
  const particleTexture = new THREE.CanvasTexture(canvas)

  const material = new THREE.PointsMaterial({
    size: 2.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    map: particleTexture,
    alphaMap: particleTexture,
    alphaTest: 0.01,
  })

  const points = new THREE.Points(geometry, material)

  return {
    geometry,
    material,
    points,
    basePositions,
    colorPhases,
    originalColors,
    currentColors,
    targetColors,
    sizes,
    explosionStates: new Map(),
    baseAngle: 0,
    currentColorMode: 'auto',
    colorTransitionStart: 0,
    isTransitioningColor: false,
    transitionStartColors: null,
    transitionStartPhases: null,
    newParticleIndices: new Map(),
    lastUpdateTime: 0,
  }
}

export function triggerExplosion(
  auroraData: AuroraData,
  clickedIndex: number,
  currentTime: number
) {
  const { geometry, basePositions, explosionStates } = auroraData
  const positions = geometry.attributes.position.array as Float32Array
  const colors = geometry.attributes.color.array as Float32Array

  const clickedPos = new THREE.Vector3(
    positions[clickedIndex * 3],
    positions[clickedIndex * 3 + 1],
    positions[clickedIndex * 3 + 2]
  )

  const count = positions.length / 3

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const pos = new THREE.Vector3(
      positions[i3],
      positions[i3 + 1],
      positions[i3 + 2]
    )

    const distance = pos.distanceTo(clickedPos)

    if (distance <= EXPLOSION_RADIUS) {
      let direction = new THREE.Vector3().subVectors(pos, clickedPos)
      if (direction.lengthSq() < 0.0001) {
        direction.set(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        )
      }
      direction.normalize()

      const distanceFactor = 1 - distance / EXPLOSION_RADIUS
      const velocity = direction.multiplyScalar(EXPLOSION_SPEED * distanceFactor)

      const brightColor = generateRandomBrightColor()

      explosionStates.set(i, {
        isExploding: true,
        isRecovering: false,
        explosionStartTime: currentTime,
        explodedOffset: null,
        explodedColor: brightColor.clone(),
        originalPosition: new THREE.Vector3(
          basePositions[i3],
          basePositions[i3 + 1],
          basePositions[i3 + 2]
        ),
        originalColor: new THREE.Color(
          auroraData.originalColors[i3],
          auroraData.originalColors[i3 + 1],
          auroraData.originalColors[i3 + 2]
        ),
        explosionVelocity: velocity,
      } as ExplosionState & { explosionVelocity: THREE.Vector3 })

      colors[i3] = brightColor.r
      colors[i3 + 1] = brightColor.g
      colors[i3 + 2] = brightColor.b
    }
  }

  geometry.attributes.color.needsUpdate = true
}

export function updateColorMode(
  auroraData: AuroraData,
  newMode: ColorMode,
  currentTime: number
) {
  if (auroraData.currentColorMode === newMode) return

  const count = auroraData.basePositions.length / 3

  auroraData.transitionStartColors = new Float32Array(auroraData.currentColors)
  auroraData.transitionStartPhases = new Float32Array(auroraData.colorPhases)

  const palette = getColorPalette(newMode)
  for (let i = 0; i < count; i++) {
    const t = i / count
    const color = lerpColor(t, palette)
    auroraData.targetColors[i * 3] = color.r
    auroraData.targetColors[i * 3 + 1] = color.g
    auroraData.targetColors[i * 3 + 2] = color.b

    auroraData.originalColors[i * 3] = color.r
    auroraData.originalColors[i * 3 + 1] = color.g
    auroraData.originalColors[i * 3 + 2] = color.b
  }

  auroraData.currentColorMode = newMode
  auroraData.colorTransitionStart = currentTime
  auroraData.isTransitioningColor = true
}

export function updateParticleCount(
  auroraData: AuroraData,
  newCount: number,
  currentTime: number
) {
  const currentCount = auroraData.basePositions.length / 3

  if (newCount === currentCount) return

  if (newCount > currentCount) {
    const addedCount = newCount - currentCount

    const newBasePositions = new Float32Array(newCount * 3)
    const newColorPhases = new Float32Array(newCount)
    const newOriginalColors = new Float32Array(newCount * 3)
    const newCurrentColors = new Float32Array(newCount * 3)
    const newTargetColors = new Float32Array(newCount * 3)
    const newSizes = new Float32Array(newCount)

    newBasePositions.set(auroraData.basePositions)
    newColorPhases.set(auroraData.colorPhases)
    newOriginalColors.set(auroraData.originalColors)
    newCurrentColors.set(auroraData.currentColors)
    newTargetColors.set(auroraData.targetColors)
    newSizes.set(auroraData.sizes)

    const palette = getColorPalette(auroraData.currentColorMode)

    for (let i = 0; i < addedCount; i++) {
      const idx = currentCount + i
      const t = Math.random()
      const xOffset = (Math.random() - 0.5) * RIBBON_WIDTH
      const zOffset = (t - 0.5) * RIBBON_LENGTH

      const twistAngle = t * Math.PI * 4
      const yOffset = Math.sin(twistAngle) * TWIST_AMPLITUDE * Math.random()
      const xTwist = Math.cos(twistAngle) * 3 * Math.random()

      const x = xOffset + xTwist
      const y = yOffset - 10
      const z = zOffset

      newBasePositions[idx * 3] = x
      newBasePositions[idx * 3 + 1] = y
      newBasePositions[idx * 3 + 2] = z

      newColorPhases[idx] = Math.random()

      const colorT = t
      const color = lerpColor(colorT, palette)
      newOriginalColors[idx * 3] = color.r
      newOriginalColors[idx * 3 + 1] = color.g
      newOriginalColors[idx * 3 + 2] = color.b

      newCurrentColors[idx * 3] = color.r
      newCurrentColors[idx * 3 + 1] = color.g
      newCurrentColors[idx * 3 + 2] = color.b

      newTargetColors[idx * 3] = color.r
      newTargetColors[idx * 3 + 1] = color.g
      newTargetColors[idx * 3 + 2] = color.b

      newSizes[idx] = 1 + Math.random() * 3

      auroraData.newParticleIndices.set(idx, currentTime)
    }

    auroraData.basePositions = newBasePositions
    auroraData.colorPhases = newColorPhases
    auroraData.originalColors = newOriginalColors
    auroraData.currentColors = newCurrentColors
    auroraData.targetColors = newTargetColors
    auroraData.sizes = newSizes

    if (auroraData.transitionStartColors) {
      const newTransitionColors = new Float32Array(newCount * 3)
      newTransitionColors.set(auroraData.transitionStartColors)
      for (let i = currentCount; i < newCount; i++) {
        newTransitionColors[i * 3] = newCurrentColors[i * 3]
        newTransitionColors[i * 3 + 1] = newCurrentColors[i * 3 + 1]
        newTransitionColors[i * 3 + 2] = newCurrentColors[i * 3 + 2]
      }
      auroraData.transitionStartColors = newTransitionColors
    }
    if (auroraData.transitionStartPhases) {
      const newTransitionPhases = new Float32Array(newCount)
      newTransitionPhases.set(auroraData.transitionStartPhases)
      for (let i = currentCount; i < newCount; i++) {
        newTransitionPhases[i] = newColorPhases[i]
      }
      auroraData.transitionStartPhases = newTransitionPhases
    }

    auroraData.geometry.dispose()
    const newGeometry = new THREE.BufferGeometry()
    const posAttr = new Float32Array(newBasePositions.length)
    posAttr.set(newBasePositions)
    newGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(posAttr, 3)
    )
    const colAttr = new Float32Array(newCurrentColors.length)
    colAttr.set(newCurrentColors)
    newGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colAttr, 3)
    )
    newGeometry.setAttribute('size', new THREE.BufferAttribute(newSizes, 1))
    auroraData.geometry = newGeometry
    auroraData.points.geometry = newGeometry
  } else {
    auroraData.basePositions = auroraData.basePositions.slice(0, newCount * 3)
    auroraData.colorPhases = auroraData.colorPhases.slice(0, newCount)
    auroraData.originalColors = auroraData.originalColors.slice(0, newCount * 3)
    auroraData.currentColors = auroraData.currentColors.slice(0, newCount * 3)
    auroraData.targetColors = auroraData.targetColors.slice(0, newCount * 3)
    auroraData.sizes = auroraData.sizes.slice(0, newCount)

    if (auroraData.transitionStartColors) {
      auroraData.transitionStartColors = auroraData.transitionStartColors.slice(0, newCount * 3)
    }
    if (auroraData.transitionStartPhases) {
      auroraData.transitionStartPhases = auroraData.transitionStartPhases.slice(0, newCount)
    }

    const newExplosionStates = new Map<number, ExplosionState>()
    auroraData.explosionStates.forEach((state, idx) => {
      if (idx < newCount) {
        newExplosionStates.set(idx, state)
      }
    })
    auroraData.explosionStates = newExplosionStates

    const newNewParticleIndices = new Map<number, number>()
    auroraData.newParticleIndices.forEach((time, idx) => {
      if (idx < newCount) {
        newNewParticleIndices.set(idx, time)
      }
    })
    auroraData.newParticleIndices = newNewParticleIndices

    auroraData.geometry.dispose()
    const newGeometry = new THREE.BufferGeometry()
    const posAttr = new Float32Array(auroraData.basePositions)
    newGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(posAttr, 3)
    )
    const colAttr = new Float32Array(auroraData.currentColors)
    newGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colAttr, 3)
    )
    newGeometry.setAttribute('size', new THREE.BufferAttribute(auroraData.sizes, 1))
    auroraData.geometry = newGeometry
    auroraData.points.geometry = newGeometry
  }
}

export function updateAuroraParticles(
  auroraData: AuroraData,
  currentTime: number,
  deltaTime: number
) {
  const {
    geometry,
    basePositions,
    colorPhases,
    currentColors,
    explosionStates,
    newParticleIndices,
  } = auroraData
  const positions = geometry.attributes.position.array as Float32Array
  const colors = geometry.attributes.color.array as Float32Array
  const count = positions.length / 3

  auroraData.baseAngle += ROTATION_SPEED * deltaTime
  const rotationAngle = auroraData.baseAngle
  const waveOffset = Math.sin(currentTime * WAVE_FREQUENCY * Math.PI * 2) * WAVE_AMPLITUDE
  const waveOffset2 = Math.cos(currentTime * WAVE_FREQUENCY * 1.3 * Math.PI * 2) * WAVE_AMPLITUDE * 0.4

  const cosR = Math.cos(rotationAngle)
  const sinR = Math.sin(rotationAngle)

  const palette = getColorPalette(auroraData.currentColorMode)

  for (let i = 0; i < count; i++) {
    const i3 = i * 3

    let baseX = basePositions[i3]
    let baseY = basePositions[i3 + 1] + waveOffset + waveOffset2
    let baseZ = basePositions[i3 + 2]

    let offsetX = 0
    let offsetY = 0
    let offsetZ = 0
    let overrideColor = false

    const explosion = explosionStates.get(i)
    if (explosion) {
      if (explosion.isExploding) {
        const elapsed = currentTime - explosion.explosionStartTime
        if (elapsed < EXPLOSION_DURATION) {
          const velocity = (explosion as ExplosionState & { explosionVelocity: THREE.Vector3 }).explosionVelocity
          const t = elapsed / EXPLOSION_DURATION
          const easedT = easeOutCubic(t)
          const dist = easedT * EXPLOSION_SPEED * EXPLOSION_DURATION
          const dir = velocity.clone().normalize()
          offsetX = dir.x * dist
          offsetY = dir.y * dist
          offsetZ = dir.z * dist
          overrideColor = true
        } else {
          explosion.isExploding = false
          explosion.isRecovering = true
          const velocity = (explosion as ExplosionState & { explosionVelocity: THREE.Vector3 }).explosionVelocity
          const dir = velocity.clone().normalize()
          const dist = EXPLOSION_SPEED * EXPLOSION_DURATION
          explosion.explodedOffset = new THREE.Vector3(
            dir.x * dist,
            dir.y * dist,
            dir.z * dist
          )
        }
      }

      if (explosion.isRecovering && explosion.explodedOffset) {
        const timeSinceExplosion = currentTime - explosion.explosionStartTime

        if (timeSinceExplosion < RECOVERY_DELAY) {
          offsetX = explosion.explodedOffset.x
          offsetY = explosion.explodedOffset.y
          offsetZ = explosion.explodedOffset.z
          overrideColor = true
        } else if (timeSinceExplosion < RECOVERY_DELAY + RECOVERY_DURATION) {
          const recoveryElapsed = timeSinceExplosion - RECOVERY_DELAY
          const rawT = recoveryElapsed / RECOVERY_DURATION
          const t = easeOutCubic(rawT)

          offsetX = explosion.explodedOffset.x * (1 - t)
          offsetY = explosion.explodedOffset.y * (1 - t)
          offsetZ = explosion.explodedOffset.z * (1 - t)

          if (explosion.explodedColor) {
            const cycleT = (colorPhases[i] + currentTime * COLOR_CYCLE_SPEED) % 1
            const targetCol = lerpColor(cycleT, palette)

            colors[i3] = explosion.explodedColor.r + (targetCol.r - explosion.explodedColor.r) * t
            colors[i3 + 1] = explosion.explodedColor.g + (targetCol.g - explosion.explodedColor.g) * t
            colors[i3 + 2] = explosion.explodedColor.b + (targetCol.b - explosion.explodedColor.b) * t
            overrideColor = true
          }
        } else {
          explosionStates.delete(i)
        }
      }
    }

    const newParticleSpawn = newParticleIndices.get(i)
    if (newParticleSpawn !== undefined) {
      const spawnElapsed = currentTime - newParticleSpawn
      if (spawnElapsed < PARTICLE_SPAWN_DURATION) {
        const rawT = spawnElapsed / PARTICLE_SPAWN_DURATION
        const t = easeOutCubic(rawT)
        baseX = baseX * t
        baseY = -10 + (baseY - (-10)) * t
        baseZ = baseZ * t
      } else {
        newParticleIndices.delete(i)
      }
    }

    const finalX = baseX * cosR - baseZ * sinR + offsetX
    const finalZ = baseX * sinR + baseZ * cosR + offsetZ
    const finalY = baseY + offsetY

    positions[i3] = finalX
    positions[i3 + 1] = finalY
    positions[i3 + 2] = finalZ

    if (!overrideColor) {
      if (auroraData.isTransitioningColor && auroraData.transitionStartColors && auroraData.transitionStartPhases) {
        const transitionElapsed = currentTime - auroraData.colorTransitionStart
        if (transitionElapsed < COLOR_TRANSITION_DURATION) {
          const rawT = transitionElapsed / COLOR_TRANSITION_DURATION
          const t = easeOutCubic(rawT)

          const startCycleT = (auroraData.transitionStartPhases[i] + currentTime * COLOR_CYCLE_SPEED) % 1
          const startCol = lerpColor(startCycleT, getColorPalette(auroraData.currentColorMode))
          // 用初始颜色作为起点
          startCol.r = auroraData.transitionStartColors[i3]
          startCol.g = auroraData.transitionStartColors[i3 + 1]
          startCol.b = auroraData.transitionStartColors[i3 + 2]

          const targetCycleT = (colorPhases[i] + currentTime * COLOR_CYCLE_SPEED) % 1
          const targetCol = lerpColor(targetCycleT, palette)

          colors[i3] = startCol.r + (targetCol.r - startCol.r) * t
          colors[i3 + 1] = startCol.g + (targetCol.g - startCol.g) * t
          colors[i3 + 2] = startCol.b + (targetCol.b - startCol.b) * t
          currentColors[i3] = colors[i3]
          currentColors[i3 + 1] = colors[i3 + 1]
          currentColors[i3 + 2] = colors[i3 + 2]
        } else {
          auroraData.isTransitioningColor = false
          auroraData.transitionStartColors = null
          auroraData.transitionStartPhases = null

          const cycleT = (colorPhases[i] + currentTime * COLOR_CYCLE_SPEED) % 1
          const cycleColor = lerpColor(cycleT, palette)
          colors[i3] = cycleColor.r
          colors[i3 + 1] = cycleColor.g
          colors[i3 + 2] = cycleColor.b
          currentColors[i3] = cycleColor.r
          currentColors[i3 + 1] = cycleColor.g
          currentColors[i3 + 2] = cycleColor.b
        }
      } else {
        const cycleT = (colorPhases[i] + currentTime * COLOR_CYCLE_SPEED) % 1
        const cycleColor = lerpColor(cycleT, palette)
        colors[i3] = cycleColor.r
        colors[i3 + 1] = cycleColor.g
        colors[i3 + 2] = cycleColor.b
        currentColors[i3] = cycleColor.r
        currentColors[i3 + 1] = cycleColor.g
        currentColors[i3 + 2] = cycleColor.b
      }
    }
  }

  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate = true

  auroraData.lastUpdateTime = currentTime
}
