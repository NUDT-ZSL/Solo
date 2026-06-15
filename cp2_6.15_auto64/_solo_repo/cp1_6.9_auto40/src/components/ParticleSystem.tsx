import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ParticleData } from '../App'

interface ParticleSystemProps {
  particles: ParticleData[]
  warmColor: string
  perturbation: number
  onStatsUpdate: (avgConnections: number) => void
}

const PARTICLE_COUNT = 800
const BOUNDARY_RADIUS = 250
const CONNECTION_DISTANCE = 30
const MAX_CONNECTIONS = 2000
const CLICK_DURATION = 2
const CLICK_RADIUS = 2.0
const BASE_SIZE_MIN = 0.5
const BASE_SIZE_MAX = 1.5
const HOVER_BRIGHTNESS_BOOST = 0.2
const ANIMATION_DURATION = 0.3

function createGlowTexture(): THREE.Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)')
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)')
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)')
  gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.05)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function hslToRgb(h: number, s: number, l: number): THREE.Color {
  return new THREE.Color().setHSL(h / 360, s / 100, l / 100)
}

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(a, b, t)
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

interface ParticleRuntimeState {
  velocity: THREE.Vector3
  targetColor: THREE.Color
  baseColor: THREE.Color
  colorCycleOffset: number
  colorCyclePeriod: number
  sizePhase: number
  sizeFrequency: number
  baseSize: number
  isClicked: boolean
  clickTimer: number
  isHovered: boolean
  hoverProgress: number
  clickProgress: number
}

function ParticleSystem({ particles, warmColor, perturbation, onStatsUpdate }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const linesRef = useRef<THREE.LineSegments>(null)
  const glowTextureRef = useRef<THREE.Texture | null>(null)
  const { camera, gl } = useThree()

  const warmColorObj = useMemo(() => new THREE.Color(warmColor), [warmColor])

  const runtimeStates = useRef<ParticleRuntimeState[]>([])
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const hoveredIndex = useRef<number>(-1)
  const statsAccumulator = useRef<{ connections: number; frames: number }>({ connections: 0, frames: 0 })

  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), [])
  const colors = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), [])
  const sizes = useMemo(() => new Float32Array(PARTICLE_COUNT), [])

  const linePositions = useMemo(() => new Float32Array(MAX_CONNECTIONS * 6), [])
  const lineColors = useMemo(() => new Float32Array(MAX_CONNECTIONS * 6), [])

  useEffect(() => {
    glowTextureRef.current = createGlowTexture()
    return () => {
      glowTextureRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    runtimeStates.current = particles.map((p) => ({
      velocity: new THREE.Vector3(...p.velocity),
      targetColor: hslToRgb(p.targetHue, 80, 60),
      baseColor: hslToRgb(p.targetHue, 80, 60),
      colorCycleOffset: Math.random() * Math.PI * 2,
      colorCyclePeriod: p.colorCyclePeriod,
      sizePhase: Math.random() * Math.PI * 2,
      sizeFrequency: p.sizeFrequency,
      baseSize: BASE_SIZE_MIN + Math.random() * (BASE_SIZE_MAX - BASE_SIZE_MIN),
      isClicked: false,
      clickTimer: 0,
      isHovered: false,
      hoverProgress: 0,
      clickProgress: 0,
    }))

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = particles[i].position[0]
      positions[i * 3 + 1] = particles[i].position[1]
      positions[i * 3 + 2] = particles[i].position[2]

      const c = runtimeStates.current[i].baseColor
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b

      sizes[i] = runtimeStates.current[i].baseSize
    }
  }, [particles, positions, colors, sizes])

  useEffect(() => {
    const canvas = gl.domElement

    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    const onClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const clickMouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      )

      raycaster.current.setFromCamera(clickMouse, camera)
      if (pointsRef.current) {
        const intersects = raycaster.current.intersectObject(pointsRef.current)
        if (intersects.length > 0) {
          const idx = intersects[0].index
          if (idx !== undefined) {
            const state = runtimeStates.current[idx]
            if (state) {
              state.isClicked = true
              state.clickTimer = CLICK_DURATION
            }
          }
        }
      }
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('click', onClick)

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('click', onClick)
    }
  }, [camera, gl])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    const clampedDelta = Math.min(delta, 0.05)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const s = runtimeStates.current[i]
      if (!s) continue

      if (perturbation > 0) {
        s.velocity.x += (Math.random() - 0.5) * 2 * perturbation * clampedDelta
        s.velocity.y += (Math.random() - 0.5) * 2 * perturbation * clampedDelta
        s.velocity.z += (Math.random() - 0.5) * 2 * perturbation * clampedDelta
      }

      positions[i * 3] += s.velocity.x * clampedDelta
      positions[i * 3 + 1] += s.velocity.y * clampedDelta
      positions[i * 3 + 2] += s.velocity.z * clampedDelta

      const dist = Math.sqrt(
        positions[i * 3] ** 2 + positions[i * 3 + 1] ** 2 + positions[i * 3 + 2] ** 2
      )

      if (dist > BOUNDARY_RADIUS) {
        const nx = positions[i * 3] / dist
        const ny = positions[i * 3 + 1] / dist
        const nz = positions[i * 3 + 2] / dist

        const dot = s.velocity.x * nx + s.velocity.y * ny + s.velocity.z * nz
        s.velocity.x = (s.velocity.x - 2 * dot * nx) * 0.95
        s.velocity.y = (s.velocity.y - 2 * dot * ny) * 0.95
        s.velocity.z = (s.velocity.z - 2 * dot * nz) * 0.95

        const jitter = 0.3
        s.velocity.x += (Math.random() - 0.5) * jitter
        s.velocity.y += (Math.random() - 0.5) * jitter
        s.velocity.z += (Math.random() - 0.5) * jitter

        const scale = BOUNDARY_RADIUS / dist * 0.98
        positions[i * 3] *= scale
        positions[i * 3 + 1] *= scale
        positions[i * 3 + 2] *= scale
      }

      const colorT = (Math.sin(time / s.colorCyclePeriod * Math.PI * 2 + s.colorCycleOffset) + 1) / 2
      const cycledColor = lerpColor(warmColorObj, s.targetColor, colorT)

      let displayColor = cycledColor.clone()

      if (s.isHovered || s.hoverProgress > 0) {
        const targetProgress = s.isHovered ? 1 : 0
        if (s.hoverProgress < targetProgress) {
          s.hoverProgress = Math.min(1, s.hoverProgress + clampedDelta / ANIMATION_DURATION)
        } else {
          s.hoverProgress = Math.max(0, s.hoverProgress - clampedDelta / ANIMATION_DURATION)
        }
        if (s.hoverProgress > 0) {
          const boost = HOVER_BRIGHTNESS_BOOST * easeOutCubic(s.hoverProgress)
          displayColor = new THREE.Color(
            Math.min(1, displayColor.r + displayColor.r * boost),
            Math.min(1, displayColor.g + displayColor.g * boost),
            Math.min(1, displayColor.b + displayColor.b * boost)
          )
        }
      }

      if (s.isClicked || s.clickProgress > 0) {
        if (s.isClicked) {
          s.clickTimer -= clampedDelta
          if (s.clickTimer <= 0) {
            s.isClicked = false
          }
        }
        const targetProgress = s.isClicked ? 1 : 0
        if (s.clickProgress < targetProgress) {
          s.clickProgress = Math.min(1, s.clickProgress + clampedDelta / ANIMATION_DURATION)
        } else {
          s.clickProgress = Math.max(0, s.clickProgress - clampedDelta / ANIMATION_DURATION)
        }
        if (s.clickProgress > 0) {
          const t = easeOutCubic(s.clickProgress)
          displayColor = lerpColor(displayColor, new THREE.Color(0xffffff), t)
        }
      }

      colors[i * 3] = displayColor.r
      colors[i * 3 + 1] = displayColor.g
      colors[i * 3 + 2] = displayColor.b

      const sizeWave = (Math.sin(time * s.sizeFrequency * Math.PI * 2 + s.sizePhase) + 1) / 2
      let particleSize = s.baseSize + sizeWave * (BASE_SIZE_MAX - s.baseSize) * 0.5

      if (s.clickProgress > 0) {
        const t = easeOutCubic(s.clickProgress)
        particleSize = particleSize * (1 - t) + CLICK_RADIUS * t
      }

      sizes[i] = particleSize
    }

    raycaster.current.setFromCamera(mouse.current, camera)
    let newHoveredIndex = -1
    if (pointsRef.current) {
      const intersects = raycaster.current.intersectObject(pointsRef.current)
      if (intersects.length > 0 && intersects[0].index !== undefined) {
        newHoveredIndex = intersects[0].index
      }
    }
    if (newHoveredIndex !== hoveredIndex.current) {
      if (hoveredIndex.current >= 0) {
        const prev = runtimeStates.current[hoveredIndex.current]
        if (prev) prev.isHovered = false
      }
      if (newHoveredIndex >= 0) {
        const curr = runtimeStates.current[newHoveredIndex]
        if (curr) curr.isHovered = true
      }
      hoveredIndex.current = newHoveredIndex
    }

    type ConnectionPair = { i: number; j: number; dist: number; ci: THREE.Color; cj: THREE.Color }
    const connectionPairs: ConnectionPair[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < CONNECTION_DISTANCE) {
          connectionPairs.push({
            i,
            j,
            dist,
            ci: new THREE.Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]),
            cj: new THREE.Color(colors[j * 3], colors[j * 3 + 1], colors[j * 3 + 2]),
          })
        }
      }
    }

    connectionPairs.sort((a, b) => a.dist - b.dist)
    const activeConnections = connectionPairs.slice(0, MAX_CONNECTIONS)

    let lineIndex = 0
    for (let k = 0; k < MAX_CONNECTIONS; k++) {
      if (k < activeConnections.length) {
        const pair = activeConnections[k]
        linePositions[lineIndex++] = positions[pair.i * 3]
        linePositions[lineIndex++] = positions[pair.i * 3 + 1]
        linePositions[lineIndex++] = positions[pair.i * 3 + 2]
        linePositions[lineIndex++] = positions[pair.j * 3]
        linePositions[lineIndex++] = positions[pair.j * 3 + 1]
        linePositions[lineIndex++] = positions[pair.j * 3 + 2]

        const distRatio = 1 - pair.dist / CONNECTION_DISTANCE
        const alpha = 0.1 + distRatio * 0.2
        const mixedColor = lerpColor(pair.ci, pair.cj, 0.5)

        const lineColorIdx = k * 6
        lineColors[lineColorIdx] = mixedColor.r
        lineColors[lineColorIdx + 1] = mixedColor.g
        lineColors[lineColorIdx + 2] = mixedColor.b
        lineColors[lineColorIdx + 3] = mixedColor.r
        lineColors[lineColorIdx + 4] = mixedColor.g
        lineColors[lineColorIdx + 5] = mixedColor.b
        void alpha
      } else {
        lineIndex += 6
      }
    }

    statsAccumulator.current.connections += activeConnections.length * 2 / PARTICLE_COUNT
    statsAccumulator.current.frames += 1
    if (statsAccumulator.current.frames >= 30) {
      const avg = statsAccumulator.current.connections / statsAccumulator.current.frames
      onStatsUpdate(avg)
      statsAccumulator.current = { connections: 0, frames: 0 }
    }

    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      const colorAttr = pointsRef.current.geometry.getAttribute('color') as THREE.BufferAttribute
      const sizeAttr = pointsRef.current.geometry.getAttribute('size') as THREE.BufferAttribute
      posAttr.needsUpdate = true
      colorAttr.needsUpdate = true
      sizeAttr.needsUpdate = true
    }

    if (linesRef.current) {
      const linePosAttr = linesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      const lineColorAttr = linesRef.current.geometry.getAttribute('color') as THREE.BufferAttribute
      linePosAttr.needsUpdate = true
      lineColorAttr.needsUpdate = true
      linesRef.current.geometry.setDrawRange(0, activeConnections.length * 2)
    }
  })

  const pointsGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [positions, colors, sizes])

  const linesGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))
    geo.setDrawRange(0, 0)
    return geo
  }, [linePositions, lineColors])

  return (
    <group>
      <points ref={pointsRef} geometry={pointsGeometry}>
        <shaderMaterial
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uGlowTexture: { value: glowTextureRef.current },
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          }}
          vertexShader={`
            attribute float size;
            varying vec3 vColor;
            uniform float uPixelRatio;
            void main() {
              vColor = color;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * 300.0 * uPixelRatio / -mvPosition.z;
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            uniform sampler2D uGlowTexture;
            varying vec3 vColor;
            void main() {
              vec4 texColor = texture2D(uGlowTexture, gl_PointCoord);
              if (texColor.a < 0.01) discard;
              gl_FragColor = vec4(vColor * texColor.rgb, texColor.a);
            }
          `}
        />
      </points>

      <lineSegments ref={linesRef} geometry={linesGeometry}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          linewidth={1}
        />
      </lineSegments>
    </group>
  )
}

export default ParticleSystem
