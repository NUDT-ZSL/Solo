import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleSystemProps {
  targetTime: number
  remainingTime: number
  setRemainingTime: (v: number) => void
  isRunning: boolean
  isResetting: boolean
  onTimeUp: () => void
}

const MAX_PARTICLES = 3000
const PARTICLES_PER_SECOND = 20
const HOURGLASS_HEIGHT = 400
const TOP_Y = HOURGLASS_HEIGHT / 2
const MAX_RADIUS = 80
const EXPLOSION_RADIUS = 200
const EXPLOSION_DURATION = 1.0

function lerpColor(h1: number, s1: number, l1: number, h2: number, s2: number, l2: number, t: number): [number, number, number] {
  return [
    h1 + (h2 - h1) * t,
    s1 + (s2 - s1) * t,
    l1 + (l2 - l1) * t,
  ]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}

export default function ParticleSystem({
  targetTime,
  remainingTime,
  setRemainingTime,
  isRunning,
  isResetting,
  onTimeUp,
}: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const spawnAccumulator = useRef(0)
  const lastTimeRef = useRef<number>(0)
  const shadowUpdateCounter = useRef(0)

  const explosionRef = useRef({
    active: false,
    startTime: 0,
    velocities: [] as THREE.Vector3[],
    startPositions: [] as THREE.Vector3[],
  })

  const { positions, colors, alive, progress, spiralOffsets, spiralRadii, spiralSpeeds } = useMemo(() => {
    const p = new Float32Array(MAX_PARTICLES * 3)
    const c = new Float32Array(MAX_PARTICLES * 3)
    const a = new Uint8Array(MAX_PARTICLES)
    const prog = new Float32Array(MAX_PARTICLES)
    const so = new Float32Array(MAX_PARTICLES)
    const sr = new Float32Array(MAX_PARTICLES)
    const ss = new Float32Array(MAX_PARTICLES)

    for (let i = 0; i < MAX_PARTICLES; i++) {
      p[i * 3] = 0
      p[i * 3 + 1] = -1000
      p[i * 3 + 2] = 0
      c[i * 3] = 0.3
      c[i * 3 + 1] = 0.5
      c[i * 3 + 2] = 0.9
      a[i] = 0
      prog[i] = 0
      so[i] = Math.random() * Math.PI * 2
      sr[i] = 2 + Math.random() * 4
      ss[i] = 0.5 + Math.random() * 1.5
    }
    return { positions: p, colors: c, alive: a, progress: prog, spiralOffsets: so, spiralRadii: sr, spiralSpeeds: ss }
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [positions, colors])

  useEffect(() => {
    if (isResetting && !explosionRef.current.active) {
      explosionRef.current.active = true
      explosionRef.current.startTime = performance.now() / 1000
      explosionRef.current.velocities = []
      explosionRef.current.startPositions = []
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (alive[i]) {
          const theta = Math.random() * Math.PI * 2
          const phi = Math.random() * Math.PI
          const speed = 50 + Math.random() * 150
          explosionRef.current.velocities[i] = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.cos(phi) * speed * 0.5,
            Math.sin(phi) * Math.sin(theta) * speed
          )
          explosionRef.current.startPositions[i] = new THREE.Vector3(
            positions[i * 3],
            positions[i * 3 + 1],
            positions[i * 3 + 2]
          )
        }
      }
    }
  }, [isResetting, alive, positions])

  useEffect(() => {
    if (!isResetting && explosionRef.current.active) {
      explosionRef.current.active = false
      for (let i = 0; i < MAX_PARTICLES; i++) {
        alive[i] = 0
        positions[i * 3] = 0
        positions[i * 3 + 1] = -1000
        positions[i * 3 + 2] = 0
        progress[i] = 0
      }
      if (pointsRef.current) {
        const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
        posAttr.needsUpdate = true
      }
    }
  }, [isResetting, alive, positions, progress])

  useFrame((state) => {
    if (!pointsRef.current) return
    const currentTime = state.clock.getElapsedTime()
    const deltaTime = lastTimeRef.current ? Math.min(currentTime - lastTimeRef.current, 0.05) : 0
    lastTimeRef.current = currentTime

    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = pointsRef.current.geometry.getAttribute('color') as THREE.BufferAttribute

    if (explosionRef.current.active) {
      const explosionElapsed = currentTime - explosionRef.current.startTime
      const explosionT = Math.min(explosionElapsed / EXPLOSION_DURATION, 1)

      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (!alive[i]) continue
        const vel = explosionRef.current.velocities[i]
        const startPos = explosionRef.current.startPositions[i]
        if (vel && startPos) {
          positions[i * 3] = startPos.x + vel.x * explosionT * (EXPLOSION_RADIUS / 200)
          positions[i * 3 + 1] = startPos.y + vel.y * explosionT * (EXPLOSION_RADIUS / 200)
          positions[i * 3 + 2] = startPos.z + vel.z * explosionT * (EXPLOSION_RADIUS / 200)

          const fadeT = explosionT
          colors[i * 3] = 1.0 * (1 - fadeT)
          colors[i * 3 + 1] = 0.5 * (1 - fadeT)
          colors[i * 3 + 2] = 0.2 * (1 - fadeT)
        }
      }

      posAttr.needsUpdate = true
      colAttr.needsUpdate = true
      return
    }

    if (isRunning) {
      setRemainingTime(Math.max(0, remainingTime - deltaTime))

      if (remainingTime - deltaTime <= 0) {
        onTimeUp()
      }
    }

    const fallSpeed = HOURGLASS_HEIGHT / Math.max(targetTime, 1)

    if (isRunning) {
      spawnAccumulator.current += PARTICLES_PER_SECOND * deltaTime
      while (spawnAccumulator.current >= 1) {
        spawnAccumulator.current -= 1
        for (let i = 0; i < MAX_PARTICLES; i++) {
          if (!alive[i]) {
            alive[i] = 1
            progress[i] = 0
            spiralOffsets[i] = Math.random() * Math.PI * 2
            spiralRadii[i] = 2 + Math.random() * 4
            spiralSpeeds[i] = 0.5 + Math.random() * 1.5
            positions[i * 3] = (Math.random() - 0.5) * 10
            positions[i * 3 + 1] = TOP_Y - 5
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10
            break
          }
        }
      }
    }

    const timeProgress = targetTime > 0 ? (targetTime - remainingTime) / targetTime : 0

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!alive[i]) continue

      progress[i] += (deltaTime * fallSpeed) / HOURGLASS_HEIGHT
      const p = Math.min(progress[i], 1)

      let y = TOP_Y - p * HOURGLASS_HEIGHT

      const radiusAtHeight = (() => {
        if (y > 0) {
          const t = 1 - y / TOP_Y
          return MAX_RADIUS * t * 0.9
        } else {
          const t = 1 + y / TOP_Y
          return MAX_RADIUS * (1 - t) * 0.9 + 10 * t
        }
      })()

      const angle = spiralOffsets[i] + progress[i] * Math.PI * 2 * spiralSpeeds[i]
      const effRadius = Math.min(spiralRadii[i], Math.max(radiusAtHeight - 5, 1))

      positions[i * 3] = Math.cos(angle) * effRadius + (Math.random() - 0.5) * 0.5
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = Math.sin(angle) * effRadius + (Math.random() - 0.5) * 0.5

      const colorT = Math.min(p, timeProgress > 0 ? p : 0)
      const [h, s, l] = lerpColor(220, 80, 70, 30, 90, 60, colorT)
      const [r, g, b] = hslToRgb(h, s, l)
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b

      if (p >= 1) {
        alive[i] = 0
        positions[i * 3] = 0
        positions[i * 3 + 1] = -1000
        positions[i * 3 + 2] = 0
      }
    }

    shadowUpdateCounter.current += deltaTime
    if (shadowUpdateCounter.current >= 0.1) {
      shadowUpdateCounter.current = 0
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={2.5}
        vertexColors
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
