import * as THREE from 'three'

export interface StarData {
  id: number
  x: number
  y: number
  z: number
  color: string
  magnitude: number
  name?: string
}

export interface StarsSystem {
  points: THREE.Points
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  update: (delta: number, cameraDistance: number) => void
  getStarPosition: (index: number) => THREE.Vector3
  getStarData: (index: number) => StarData
  getStarsData: () => StarData[]
  starCount: number
}

const STAR_COUNT = 3000
const COLOR_START = new THREE.Color('#8DB6F8')
const COLOR_END = new THREE.Color('#FF9F43')

function generateStarsData(count: number): StarData[] {
  const stars: StarData[] = []
  for (let i = 0; i < count; i++) {
    const radius = 200 + Math.random() * 300
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)
    const t = Math.random()
    const color = new THREE.Color().lerpColors(COLOR_START, COLOR_END, t)
    stars.push({
      id: i,
      x,
      y,
      z,
      color: '#' + color.getHexString(),
      magnitude: Math.floor(Math.random() * 6) + 1
    })
  }
  return stars
}

function createCircleTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  )
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)')
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export async function loadStarsData(): Promise<StarData[]> {
  try {
    const response = await fetch('/data/stars.json')
    if (!response.ok) throw new Error('Failed to load stars data')
    const data = await response.json()
    const staticStars = data.stars as StarData[]
    const additionalStars = generateStarsData(STAR_COUNT - staticStars.length)
    return [...staticStars, ...additionalStars]
  } catch {
    return generateStarsData(STAR_COUNT)
  }
}

export function createStarsSystem(starsData: StarData[]): StarsSystem {
  const geometry = new THREE.BufferGeometry()
  const count = starsData.length
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const baseAlphas = new Float32Array(count)
  const flickerSpeeds = new Float32Array(count)
  const flickerOffsets = new Float32Array(count)

  starsData.forEach((star, i) => {
    positions[i * 3] = star.x
    positions[i * 3 + 1] = star.y
    positions[i * 3 + 2] = star.z

    const color = new THREE.Color(star.color)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b

    const magnitude = star.magnitude
    const sizeFactor = (6 - magnitude + 1) / 6
    sizes[i] = 3 + sizeFactor * 5

    baseAlphas[i] = 0.3 + sizeFactor * 0.7

    flickerSpeeds[i] = (2 * Math.PI) / (0.5 + Math.random() * 1.0)
    flickerOffsets[i] = Math.random() * Math.PI * 2
  })

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aBaseAlpha', new THREE.BufferAttribute(baseAlphas, 1))
  geometry.setAttribute('aFlickerSpeed', new THREE.BufferAttribute(flickerSpeeds, 1))
  geometry.setAttribute('aFlickerOffset', new THREE.BufferAttribute(flickerOffsets, 1))

  const texture = createCircleTexture()

  const material = new THREE.PointsMaterial({
    size: 5,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    map: texture,
    alphaTest: 0.01,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })

  const points = new THREE.Points(geometry, material)

  let time = 0

  return {
    points,
    geometry,
    material,
    starCount: count,
    update(delta: number, cameraDistance: number) {
      time += delta
      const lodFactor = Math.min(1, 800 / cameraDistance)
      const sizeAttr = geometry.getAttribute('aSize') as THREE.BufferAttribute
      const sizesBase = new Float32Array(count)
      starsData.forEach((star, i) => {
        const magnitude = star.magnitude
        const sizeFactor = (6 - magnitude + 1) / 6
        sizesBase[i] = (3 + sizeFactor * 5) * (0.5 + 0.5 * lodFactor)
      })
      for (let i = 0; i < count; i++) {
        const flicker = 0.5 + 0.5 * Math.sin(time * flickerSpeeds[i] + flickerOffsets[i])
        const alpha = baseAlphas[i] * (0.2 + 0.8 * flicker)
        colors[i * 3 + 3] = colors[i * 3]
        material.opacity = 1
        sizeAttr.array[i] = sizesBase[i]
      }
      sizeAttr.needsUpdate = true
    },
    getStarPosition(index: number) {
      return new THREE.Vector3(
        starsData[index].x,
        starsData[index].y,
        starsData[index].z
      )
    },
    getStarData(index: number) {
      return starsData[index]
    },
    getStarsData() {
      return starsData
    }
  }
}
