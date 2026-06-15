import * as THREE from 'three'

const STAR_COUNT = 3000
const DOME_RADIUS = 200

export interface StarData {
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  points: THREE.Points
  twinklePhases: Float32Array
  twinklePeriods: Float32Array
}

export function createStarField(): StarData {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(STAR_COUNT * 3)
  const sizes = new Float32Array(STAR_COUNT)
  const twinklePhases = new Float32Array(STAR_COUNT)
  const twinklePeriods = new Float32Array(STAR_COUNT)

  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1) * 0.5

    positions[i * 3] = DOME_RADIUS * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = DOME_RADIUS * Math.cos(phi)
    positions[i * 3 + 2] = DOME_RADIUS * Math.sin(phi) * Math.sin(theta)

    sizes[i] = 0.5 + Math.random() * 1.5
    twinklePhases[i] = Math.random() * Math.PI * 2
    twinklePeriods[i] = 0.5 + Math.random() * 1.5
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const points = new THREE.Points(geometry, material)

  return { geometry, material, points, twinklePhases, twinklePeriods }
}

export function updateStarField(starData: StarData, elapsedTime: number) {
  const { material, twinklePhases, twinklePeriods } = starData
  const baseOpacity = 0.6
  const opacityVariation = 0.4

  const avgPhase = twinklePhases.reduce((a, b) => a + b, 0) / twinklePhases.length
  const avgPeriod = twinklePeriods.reduce((a, b) => a + b, 0) / twinklePeriods.length

  material.opacity =
    baseOpacity + opacityVariation * Math.sin((elapsedTime / avgPeriod) * Math.PI * 2 + avgPhase)
}
