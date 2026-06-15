import * as THREE from 'three'
import type { ColorMode } from './store'

const RIBBON_WIDTH = 30
const RIBBON_LENGTH = 120
const TWIST_AMPLITUDE = 10
const ROTATION_SPEED = 0.02
const WAVE_AMPLITUDE = 5
const WAVE_FREQUENCY = 0.005
const EXPLOSION_RADIUS = 15
const EXPLOSION_DURATION = 0.3
const EXPLOSION_SPEED = 2
const RECOVERY_DELAY = 1.5
const COLOR_TRANSITION_DURATION = 0.5

export interface ExplosionState {
  isExploding: boolean
  isRecovering: boolean
  explosionStartTime: number
  recoveryStartTime: number
  originalPosition: THREE.Vector3
  explosionVelocity: THREE.Vector3
  originalColor: THREE.Color
}

export interface AuroraData {
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  points: THREE.Points
  basePositions: Float32Array
  originalColors: Float32Array
  currentColors: Float32Array
  targetColors: Float32Array
  sizes: Float32Array
  explosionStates: Map<number, ExplosionState>
  baseAngle: number
  currentColorMode: ColorMode
  colorTransitionStart: number
  isTransitioningColor: boolean
  newParticleIndices: Map<number, number>
}

function lerpColor(
  t: number,
  colors: THREE.Color[]
): THREE.Color {
  const clampedT = ((t % 1) + 1) % 1
  const segment = clampedT * (colors.length - 1)
  const index = Math.floor(segment)
  const localT = segment - index
  const nextIndex = (index + 1) % colors.length

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
  const color = new THREE.Color().setHSL(hue, 1, 0.5)
  return color
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function createAuroraParticles(count: number): AuroraData {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const basePositions = new Float32Array(count * 3)
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

  const material = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const points = new THREE.Points(geometry, material)

  return {
    geometry,
    material,
    points,
    basePositions,
    originalColors,
    currentColors,
    targetColors,
    sizes,
    explosionStates: new Map(),
    baseAngle: 0,
    currentColorMode: 'auto',
    colorTransitionStart: 0,
    isTransitioningColor: false,
    newParticleIndices: new Map(),
  }
}

export function triggerExplosion(
  auroraData: AuroraData,
  clickedIndex: number,
  currentTime: number
) {
  const { geometry, basePositions, explosionStates, originalColors, currentColors } = auroraData
  const positions = geometry.attributes.position.array as Float32Array

  const clickedPos = new THREE.Vector3(
    positions[clickedIndex * 3],
    positions[clickedIndex * 3 + 1],
    positions[clickedIndex * 3 + 2]
  )

  for (let i = 0; i < positions.length / 3; i++) {
    const pos = new THREE.Vector3(
      positions[i * 3],
      positions[i * 3 + 1],
      positions[i * 3 + 2]
    )

    const distance = pos.distanceTo(clickedPos)

    if (distance <= EXPLOSION_RADIUS) {
      const direction = new THREE.Vector3().subVectors(pos, clickedPos)
      if (direction.length() === 0) {
        direction.set(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize()
      } else {
        direction.normalize()
      }

      const distanceFactor = 1 - distance / EXPLOSION_RADIUS
      const velocity = direction.multiplyScalar(EXPLOSION_SPEED * distanceFactor)

      const brightColor = generateRandomBrightColor()

      explosionStates.set(i, {
        isExploding: true,
        isRecovering: false,
        explosionStartTime: currentTime,
        recoveryStartTime: 0,
        originalPosition: new THREE.Vector3(
          basePositions[i * 3],
          basePositions[i * 3 + 1],
          basePositions[i * 3 + 2]
        ),
        explosionVelocity: velocity,
        originalColor: new THREE.Color(
          originalColors[i * 3],
          originalColors[i * 3 + 1],
          originalColors[i * 3 + 2]
        ),
      })

      currentColors[i * 3] = brightColor.r
      currentColors[i * 3 + 1] = brightColor.g
      currentColors[i * 3 + 2] = brightColor.b
    }
  }

  ;(geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true
}

export function updateColorMode(
  auroraData: AuroraData,
  newMode: ColorMode,
  currentTime: number
) {
  if (auroraData.currentColorMode === newMode) return

  const palette = getColorPalette(newMode)
  const count = auroraData.basePositions.length / 3

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
    const newOriginalColors = new Float32Array(newCount * 3)
    const newCurrentColors = new Float32Array(newCount * 3)
    const newTargetColors = new Float32Array(newCount * 3)
    const newSizes = new Float32Array(newCount)

    newBasePositions.set(auroraData.basePositions)
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
    auroraData.originalColors = newOriginalColors
    auroraData.currentColors = newCurrentColors
    auroraData.targetColors = newTargetColors
    auroraData.sizes = newSizes

    auroraData.geometry.dispose()
    const newGeometry = new THREE.BufferGeometry()
    newGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(newBasePositions), 3)
    )
    newGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(newCurrentColors), 3)
    )
    newGeometry.setAttribute('size', new THREE.BufferAttribute(newSizes, 1))
    auroraData.geometry = newGeometry
    auroraData.points.geometry = newGeometry
  } else {
    auroraData.basePositions = auroraData.basePositions.slice(0, newCount * 3)
    auroraData.originalColors = auroraData.originalColors.slice(0, newCount * 3)
    auroraData.currentColors = auroraData.currentColors.slice(0, newCount * 3)
    auroraData.targetColors = auroraData.targetColors.slice(0, newCount * 3)
    auroraData.sizes = auroraData.sizes.slice(0, newCount)

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
    newGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(auroraData.basePositions), 3)
    )
    newGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(auroraData.currentColors), 3)
    )
    newGeometry.setAttribute('size', new THREE.BufferAttribute(auroraData.sizes, 1))
    auroraData.geometry = newGeometry
    auroraData.points.geometry = newGeometry
  }
}

export function updateAuroraParticles(
  auroraData: AuroraData,
  currentTime: number,
  elapsedFrames: number
) {
  const { geometry, basePositions, currentColors, targetColors, explosionStates, newParticleIndices } =
    auroraData
  const positions = geometry.attributes.position.array as Float32Array
  const colors = geometry.attributes.color.array as Float32Array
  const count = positions.length / 3

  auroraData.baseAngle += ROTATION_SPEED
  const rotationAngle = auroraData.baseAngle
  const waveOffset = Math.sin(elapsedFrames * WAVE_FREQUENCY) * WAVE_AMPLITUDE

  const cosR = Math.cos(rotationAngle)
  const sinR = Math.sin(rotationAngle)

  for (let i = 0; i < count; i++) {
    const i3 = i * 3

    let baseX = basePositions[i3]
    let baseY = basePositions[i3 + 1] + waveOffset
    let baseZ = basePositions[i3 + 2]

    let x = baseX * cosR - baseZ * sinR
    let z = baseX * sinR + baseZ * cosR
    let y = baseY

    const explosion = explosionStates.get(i)
    if (explosion) {
      if (explosion.isExploding) {
        const elapsed = currentTime - explosion.explosionStartTime
        if (elapsed < EXPLOSION_DURATION) {
          const progress = elapsed / EXPLOSION_DURATION
          x += explosion.explosionVelocity.x * progress * 60 * EXPLOSION_DURATION
          y += explosion.explosionVelocity.y * progress * 60 * EXPLOSION_DURATION
          z += explosion.explosionVelocity.z * progress * 60 * EXPLOSION_DURATION
        } else {
          explosion.isExploding = false
          explosion.isRecovering = true
          explosion.recoveryStartTime = currentTime
        }
      }

      if (explosion.isRecovering) {
        const timeSinceExplosion = currentTime - explosion.explosionStartTime
        if (timeSinceExplosion >= RECOVERY_DELAY) {
          const recoveryElapsed = currentTime - (explosion.explosionStartTime + RECOVERY_DELAY)
          const recoveryDuration = 1.0
          if (recoveryElapsed < recoveryDuration) {
            const t = easeOut(recoveryElapsed / recoveryDuration)

            const explodedX = x
            const explodedY = y
            const explodedZ = z

            const finalX =
              explosion.originalPosition.x * cosR - explosion.originalPosition.z * sinR
            const finalZ =
              explosion.originalPosition.x * sinR + explosion.originalPosition.z * cosR
            const finalY = explosion.originalPosition.y + waveOffset

            x = explodedX + (finalX - explodedX) * t
            y = explodedY + (finalY - explodedY) * t
            z = explodedZ + (finalZ - explodedZ) * t

            colors[i3] = currentColors[i3] + (explosion.originalColor.r - currentColors[i3]) * t
            colors[i3 + 1] =
              currentColors[i3 + 1] + (explosion.originalColor.g - currentColors[i3 + 1]) * t
            colors[i3 + 2] =
              currentColors[i3 + 2] + (explosion.originalColor.b - currentColors[i3 + 2]) * t
          } else {
            explosionStates.delete(i)
          }
        }
      }
    }

    positions[i3] = x
    positions[i3 + 1] = y
    positions[i3 + 2] = z

    if (!explosion || !explosion.isRecovering || (currentTime - explosion.explosionStartTime) < RECOVERY_DELAY) {
      const newParticleSpawn = newParticleIndices.get(i)
      if (newParticleSpawn !== undefined) {
        const spawnElapsed = currentTime - newParticleSpawn
        const spawnDuration = 0.8
        if (spawnElapsed < spawnDuration) {
          const t = spawnElapsed / spawnDuration
          const center = new THREE.Vector3(0, -10, 0)
          const targetPos = new THREE.Vector3(x, y, z)
          const lerped = center.lerp(targetPos, t)
          positions[i3] = lerped.x
          positions[i3 + 1] = lerped.y
          positions[i3 + 2] = lerped.z
        } else {
          newParticleIndices.delete(i)
        }
      }
    }
  }

  if (auroraData.isTransitioningColor) {
    const transitionElapsed = currentTime - auroraData.colorTransitionStart
    if (transitionElapsed < COLOR_TRANSITION_DURATION) {
      const t = easeOut(transitionElapsed / COLOR_TRANSITION_DURATION)
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        const explosion = explosionStates.get(i)
        if (!explosion || explosion.isRecovering) {
          colors[i3] = currentColors[i3] + (targetColors[i3] - currentColors[i3]) * t
          colors[i3 + 1] = currentColors[i3 + 1] + (targetColors[i3 + 1] - currentColors[i3 + 1]) * t
          colors[i3 + 2] = currentColors[i3 + 2] + (targetColors[i3 + 2] - currentColors[i3 + 2]) * t
        }
      }
    } else {
      auroraData.isTransitioningColor = false
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        currentColors[i3] = targetColors[i3]
        currentColors[i3 + 1] = targetColors[i3 + 1]
        currentColors[i3 + 2] = targetColors[i3 + 2]
      }
    }
  }

  geometry.attributes.position.needsUpdate = true
  geometry.attributes.color.needsUpdate = true
}
