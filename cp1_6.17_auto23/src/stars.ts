import * as THREE from 'three'
import { Star, StarSystemOptions } from './types'

export interface StarsSystem {
  points: THREE.Points
  geometry: THREE.BufferGeometry
  material: THREE.Material
  update: (delta: number, cameraDistance: number) => void
  getStarPosition: (index: number) => THREE.Vector3
  getStarData: (index: number) => Star
  getStarsData: () => Star[]
  starCount: number
}

const DEFAULT_STAR_COUNT = 3000
const COLOR_START = new THREE.Color('#8DB6F8')
const COLOR_END = new THREE.Color('#FF9F43')

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
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  return texture
}

export function generateStarsData(options: StarSystemOptions = {}): Star[] {
  const {
    starCount = DEFAULT_STAR_COUNT,
    radiusMin = 200,
    radiusMax = 500,
    minMagnitude = 1,
    maxMagnitude = 6
  } = options

  const stars: Star[] = []
  for (let i = 0; i < starCount; i++) {
    const radius = radiusMin + Math.random() * (radiusMax - radiusMin)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)
    const t = Math.random()
    const color = new THREE.Color().lerpColors(COLOR_START, COLOR_END, t)
    const magnitude = Math.floor(minMagnitude + Math.random() * (maxMagnitude - minMagnitude + 1))
    stars.push({
      id: i,
      x,
      y,
      z,
      color: '#' + color.getHexString(),
      magnitude
    })
  }
  return stars
}

export async function loadStarsData(options: StarSystemOptions = {}): Promise<Star[]> {
  const starCount = options.starCount ?? DEFAULT_STAR_COUNT
  try {
    const response = await fetch('/data/stars.json')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const data = await response.json()
    const staticStars = data.stars as Star[]
    const remaining = Math.max(0, starCount - staticStars.length)
    const additionalStars = generateStarsData({ ...options, starCount: remaining })
    additionalStars.forEach((s, i) => {
      s.id = staticStars.length + i
    })
    const result = [...staticStars, ...additionalStars]
    return result
  } catch (err) {
    console.warn('加载星星数据失败，使用随机生成数据:', err)
    return generateStarsData(options)
  }
}

export function createStarsSystem(
  starsData: Star[],
  options: StarSystemOptions = {}
): StarsSystem {
  const geometry = new THREE.BufferGeometry()
  const count = starsData.length

  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const baseAlphas = new Float32Array(count)
  const currentAlphas = new Float32Array(count)
  const flickerSpeeds = new Float32Array(count)
  const flickerOffsets = new Float32Array(count)
  const baseSizes = new Float32Array(count)

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
    const baseSize = 3 + sizeFactor * 5
    sizes[i] = baseSize
    baseSizes[i] = baseSize

    const baseAlpha = 0.3 + sizeFactor * 0.7
    baseAlphas[i] = baseAlpha
    currentAlphas[i] = baseAlpha

    flickerSpeeds[i] = (2 * Math.PI) / (0.5 + Math.random() * 1.0)
    flickerOffsets[i] = Math.random() * Math.PI * 2
  })

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(currentAlphas, 1))

  const texture = createCircleTexture()

  const uvs = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) {
    uvs[i * 2] = 0
    uvs[i * 2 + 1] = 0
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
    },
    vertexShader: `
      uniform float uPixelRatio;
      attribute float aSize;
      attribute float aAlpha;
      attribute vec3 color;
      varying float vAlpha;
      varying vec3 vColor;
      varying vec2 vUv;
      void main() {
        vAlpha = aAlpha;
        vColor = color;
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      varying float vAlpha;
      varying vec3 vColor;
      varying vec2 vUv;
      void main() {
        vec4 texColor = texture2D(uTexture, gl_PointCoord);
        if (texColor.a < 0.01) discard;
        gl_FragColor = vec4(vColor * texColor.rgb, texColor.a * vAlpha);
      }
    `,
    transparent: true,
    alphaTest: 0.01,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })

  const points = new THREE.Points(geometry, material)

  let time = 0

  function calculateLODScale(distance: number): number {
    const minDist = 100
    const maxDist = 800
    const clampedDist = Math.max(minDist, Math.min(maxDist, distance))
    const normalized = (maxDist - clampedDist) / (maxDist - minDist)
    const logScale = Math.log1p(normalized * 9) / Math.log(10)
    return 0.3 + logScale * 0.9
  }

  return {
    points,
    geometry,
    material,
    starCount: count,
    update(delta: number, cameraDistance: number) {
      time += delta

      const lodScale = calculateLODScale(cameraDistance)

      const sizeAttr = geometry.getAttribute('aSize') as THREE.BufferAttribute
      const alphaAttr = geometry.getAttribute('aAlpha') as THREE.BufferAttribute
      const sizeArr = sizeAttr.array as Float32Array
      const alphaArr = alphaAttr.array as Float32Array

      for (let i = 0; i < count; i++) {
        const flicker = 0.5 + 0.5 * Math.sin(time * flickerSpeeds[i] + flickerOffsets[i])
        alphaArr[i] = baseAlphas[i] * (0.2 + 0.8 * flicker)
        const flickerSizeScale = 0.6 + 0.4 * flicker
        sizeArr[i] = baseSizes[i] * lodScale * flickerSizeScale
      }

      sizeAttr.needsUpdate = true
      alphaAttr.needsUpdate = true
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
