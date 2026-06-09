import { useRef, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 6000
const SPHERE_RADIUS = 5
const TRAIL_LENGTH = 10
const REPULSION_RADIUS = 1.2
const MIN_MAGNET_DIST = 0.1
const DAMPING = 0.98
const DT = 1 / 60

interface Explosion {
  pos: THREE.Vector3
  strength: number
  maxRadius: number
  currentRadius: number
  duration: number
  elapsed: number
}

interface AutoPole {
  pos: THREE.Vector3
  strength: number
  duration: number
  elapsed: number
}

interface SceneProps {
  magnetStrength: number
  flowRate: number
  resetTrigger: number
  autoEvolve: boolean
  onAutoEvolveChange?: (evolving: boolean) => void
}

export interface SceneHandle {
  updateMagnet: (pos: THREE.Vector3 | null) => void
  addExplosion: (point: THREE.Vector3, strength: number) => void
  resetParticles: () => void
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255
  ]
}

const COLORS = {
  warm1: hexToRgb('#FF3366'),
  warm2: hexToRgb('#FF9933'),
  cool1: hexToRgb('#9933FF'),
  cool2: hexToRgb('#3366FF'),
  gold: hexToRgb('#FFD700'),
  white: hexToRgb('#FFFFFF'),
  deepBlue: hexToRgb('#000033')
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ]
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export const Scene = forwardRef<SceneHandle, SceneProps>(function Scene(
  { magnetStrength, flowRate, resetTrigger, autoEvolve },
  ref
) {
  const { camera, size } = useThree()
  const pointsRef = useRef<THREE.Points>(null)
  const trailRefs = useRef<THREE.Points[]>([])
  const geometryRef = useRef<THREE.BufferGeometry>(null)
  const trailGeometriesRef = useRef<THREE.BufferGeometry[]>([])

  const positionsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3))
  const velocitiesRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3))
  const initialPositionsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3))
  const colorsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3))
  const trailHistoryRef = useRef<Float32Array[]>([])
  const explosionFlashRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT))

  const magnetPosRef = useRef<THREE.Vector3 | null>(null)
  const explosionsRef = useRef<Explosion[]>([])
  const autoPolesRef = useRef<AutoPole[]>([])
  const autoHueOffsetRef = useRef<{ from: number; to: number; progress: number }>({ from: 0, to: 0, progress: 1 })
  const lastAutoPoleSwitchRef = useRef<number>(0)

  const resetAnimRef = useRef<{ active: boolean; start: number; duration: number }>({
    active: false, start: 0, duration: 1.5
  })

  const spatialGridRef = useRef<Map<number, number[]>>(new Map())

  const createInitialPositions = () => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = SPHERE_RADIUS * Math.cbrt(Math.random())
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)
      positionsRef.current[i * 3] = x
      positionsRef.current[i * 3 + 1] = y
      positionsRef.current[i * 3 + 2] = z
      initialPositionsRef.current[i * 3] = x
      initialPositionsRef.current[i * 3 + 1] = y
      initialPositionsRef.current[i * 3 + 2] = z
      velocitiesRef.current[i * 3] = 0
      velocitiesRef.current[i * 3 + 1] = 0
      velocitiesRef.current[i * 3 + 2] = 0
      explosionFlashRef.current[i] = 0

      const history: Float32Array = new Float32Array(TRAIL_LENGTH * 3)
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        history[t * 3] = x
        history[t * 3 + 1] = y
        history[t * 3 + 2] = z
      }
      trailHistoryRef.current[i] = history
    }
  }

  useMemo(() => {
    createInitialPositions()
  }, [])

  const geometries = useMemo(() => {
    const mainGeom = new THREE.BufferGeometry()
    const posAttr = new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3)
    const colAttr = new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3)
    mainGeom.setAttribute('position', posAttr)
    mainGeom.setAttribute('color', colAttr)

    const trailGeoms: THREE.BufferGeometry[] = []
    for (let t = 0; t < TRAIL_LENGTH; t++) {
      const tg = new THREE.BufferGeometry()
      const tp = new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3)
      const tc = new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3)
      tg.setAttribute('position', tp)
      tg.setAttribute('color', tc)
      trailGeoms.push(tg)
    }
    return { mainGeom, trailGeoms }
  }, [])

  const generateAutoPoles = () => {
    const poles: AutoPole[] = []
    for (let i = 0; i < 15; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 2 + Math.random() * 4
      poles.push({
        pos: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ),
        strength: (Math.random() - 0.5) * magnetStrength * 2,
        duration: 2 + Math.random() * 2,
        elapsed: 0
      })
    }
    autoPolesRef.current = poles

    const newHue = (Math.random() * 60 + 60) * (Math.random() > 0.5 ? 1 : -1)
    autoHueOffsetRef.current = {
      from: autoHueOffsetRef.current.to,
      to: newHue,
      progress: 0
    }
    lastAutoPoleSwitchRef.current = performance.now()
  }

  useEffect(() => {
    if (autoEvolve && autoPolesRef.current.length === 0) {
      generateAutoPoles()
    }
  }, [autoEvolve])

  useEffect(() => {
    if (resetTrigger > 0) {
      resetAnimRef.current = {
        active: true,
        start: performance.now(),
        duration: 1500
      }
    }
  }, [resetTrigger])

  useImperativeHandle(ref, () => ({
    updateMagnet: (pos) => {
      magnetPosRef.current = pos
    },
    addExplosion: (point, strength) => {
      const now = performance.now()
      const isDouble = explosionsRef.current.length > 0 &&
        now - explosionsRef.current[explosionsRef.current.length - 1].elapsed < 500

      explosionsRef.current.push({
        pos: point.clone(),
        strength: strength * (isDouble ? 4 : 2),
        maxRadius: isDouble ? 4 : 3,
        currentRadius: 0,
        duration: 0.3,
        elapsed: 0
      })

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const px = positionsRef.current[i * 3]
        const py = positionsRef.current[i * 3 + 1]
        const pz = positionsRef.current[i * 3 + 2]
        const dx = px - point.x
        const dy = py - point.y
        const dz = pz - point.z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < (isDouble ? 4 : 3)) {
          explosionFlashRef.current[i] = 0.2
        }
      }
    },
    resetParticles: () => {
      resetAnimRef.current = {
        active: true,
        start: performance.now(),
        duration: 1500
      }
    }
  }))

  const updateSpatialGrid = () => {
    const grid = spatialGridRef.current
    grid.clear()
    const cellSize = REPULSION_RADIUS
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = positionsRef.current[i * 3]
      const y = positionsRef.current[i * 3 + 1]
      const z = positionsRef.current[i * 3 + 2]
      const cx = Math.floor(x / cellSize)
      const cy = Math.floor(y / cellSize)
      const cz = Math.floor(z / cellSize)
      const key = (cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791)
      let bucket = grid.get(key)
      if (!bucket) {
        bucket = []
        grid.set(key, bucket)
      }
      bucket.push(i)
    }
  }

  const queryNeighbors = (i: number): number[] => {
    const cellSize = REPULSION_RADIUS
    const x = positionsRef.current[i * 3]
    const y = positionsRef.current[i * 3 + 1]
    const z = positionsRef.current[i * 3 + 2]
    const cx = Math.floor(x / cellSize)
    const cy = Math.floor(y / cellSize)
    const cz = Math.floor(z / cellSize)
    const neighbors: number[] = []
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = ((cx + dx) * 73856093) ^ ((cy + dy) * 19349663) ^ ((cz + dz) * 83492791)
          const bucket = spatialGridRef.current.get(key)
          if (bucket) {
            for (const j of bucket) {
              if (j !== i) neighbors.push(j)
            }
          }
        }
      }
    }
    return neighbors
  }

  useFrame(() => {
    const now = performance.now()

    if (resetAnimRef.current.active) {
      const t = (now - resetAnimRef.current.start) / resetAnimRef.current.duration
      if (t >= 1) {
        resetAnimRef.current.active = false
        for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
          positionsRef.current[i] = initialPositionsRef.current[i]
          velocitiesRef.current[i] = 0
        }
      } else {
        const ease = 1 - Math.pow(1 - t, 3)
        for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
          positionsRef.current[i] =
            positionsRef.current[i] + (initialPositionsRef.current[i] - positionsRef.current[i]) * ease * 0.1
          velocitiesRef.current[i] *= DAMPING
        }
      }
    }

    updateSpatialGrid()

    if (autoEvolve) {
      if (now - lastAutoPoleSwitchRef.current > 10000 + Math.random() * 5000) {
        generateAutoPoles()
      }

      if (autoHueOffsetRef.current.progress < 1) {
        autoHueOffsetRef.current.progress = Math.min(1, autoHueOffsetRef.current.progress + DT * 0.5)
      }

      for (const pole of autoPolesRef.current) {
        pole.elapsed += DT
        if (pole.elapsed > pole.duration) {
          pole.elapsed = 0
          pole.duration = 2 + Math.random() * 2
          const theta = Math.random() * Math.PI * 2
          const phi = Math.acos(2 * Math.random() - 1)
          const r = 2 + Math.random() * 4
          pole.pos.set(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
          )
          pole.strength = (Math.random() - 0.5) * magnetStrength * 2
        }
      }
    }

    for (let ei = explosionsRef.current.length - 1; ei >= 0; ei--) {
      const exp = explosionsRef.current[ei]
      exp.elapsed += DT
      const t = exp.elapsed / exp.duration
      exp.currentRadius = exp.maxRadius * Math.min(1, t * 2)
      if (exp.elapsed >= exp.duration) {
        explosionsRef.current.splice(ei, 1)
      }
    }

    const hueT = autoHueOffsetRef.current.progress
    const currentHue = autoHueOffsetRef.current.from + (autoHueOffsetRef.current.to - autoHueOffsetRef.current.from) * hueT
    const hueShift = autoEvolve ? currentHue : 0

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      let fx = 0, fy = 0, fz = 0

      if (magnetPosRef.current) {
        const mp = magnetPosRef.current
        const dx = mp.x - positionsRef.current[i3]
        const dy = mp.y - positionsRef.current[i3 + 1]
        const dz = mp.z - positionsRef.current[i3 + 2]
        const distSq = dx * dx + dy * dy + dz * dz
        if (distSq > MIN_MAGNET_DIST * MIN_MAGNET_DIST) {
          const dist = Math.sqrt(distSq)
          const invDist = 1 / dist
          const force = (magnetStrength / distSq) * flowRate
          fx += dx * invDist * force
          fy += dy * invDist * force
          fz += dz * invDist * force
        }
      }

      if (autoEvolve) {
        for (const pole of autoPolesRef.current) {
          const dx = pole.pos.x - positionsRef.current[i3]
          const dy = pole.pos.y - positionsRef.current[i3 + 1]
          const dz = pole.pos.z - positionsRef.current[i3 + 2]
          const distSq = dx * dx + dy * dy + dz * dz
          if (distSq > MIN_MAGNET_DIST * MIN_MAGNET_DIST) {
            const dist = Math.sqrt(distSq)
            const invDist = 1 / dist
            const force = (pole.strength / distSq) * flowRate * 0.5
            fx += dx * invDist * force
            fy += dy * invDist * force
            fz += dz * invDist * force
          }
        }
      }

      const neighbors = queryNeighbors(i)
      const repulseStrength = 0.8
      for (const j of neighbors) {
        const j3 = j * 3
        const dx = positionsRef.current[i3] - positionsRef.current[j3]
        const dy = positionsRef.current[i3 + 1] - positionsRef.current[j3 + 1]
        const dz = positionsRef.current[i3 + 2] - positionsRef.current[j3 + 2]
        const distSq = dx * dx + dy * dy + dz * dz
        if (distSq < REPULSION_RADIUS * REPULSION_RADIUS && distSq > 0.000001) {
          const dist = Math.sqrt(distSq)
          const invDist = 1 / dist
          const falloff = (REPULSION_RADIUS - dist) / REPULSION_RADIUS
          const force = falloff * repulseStrength
          fx += dx * invDist * force * 0.1
          fy += dy * invDist * force * 0.1
          fz += dz * invDist * force * 0.1
        }
      }

      for (const exp of explosionsRef.current) {
        const dx = positionsRef.current[i3] - exp.pos.x
        const dy = positionsRef.current[i3 + 1] - exp.pos.y
        const dz = positionsRef.current[i3 + 2] - exp.pos.z
        const distSq = dx * dx + dy * dy + dz * dz
        if (distSq < exp.currentRadius * exp.currentRadius && distSq > 0.000001) {
          const dist = Math.sqrt(distSq)
          const invDist = 1 / dist
          const falloff = 1 - dist / exp.currentRadius
          const force = exp.strength * falloff
          fx += dx * invDist * force
          fy += dy * invDist * force
          fz += dz * invDist * force
        }
      }

      velocitiesRef.current[i3] = (velocitiesRef.current[i3] + fx * DT) * DAMPING
      velocitiesRef.current[i3 + 1] = (velocitiesRef.current[i3 + 1] + fy * DT) * DAMPING
      velocitiesRef.current[i3 + 2] = (velocitiesRef.current[i3 + 2] + fz * DT) * DAMPING

      positionsRef.current[i3] += velocitiesRef.current[i3] * DT
      positionsRef.current[i3 + 1] += velocitiesRef.current[i3 + 1] * DT
      positionsRef.current[i3 + 2] += velocitiesRef.current[i3 + 2] * DT

      if (explosionFlashRef.current[i] > 0) {
        explosionFlashRef.current[i] = Math.max(0, explosionFlashRef.current[i] - DT)
      }

      const history = trailHistoryRef.current[i]
      for (let t = TRAIL_LENGTH - 1; t > 0; t--) {
        history[t * 3] = history[(t - 1) * 3]
        history[t * 3 + 1] = history[(t - 1) * 3 + 1]
        history[t * 3 + 2] = history[(t - 1) * 3 + 2]
      }
      history[0] = positionsRef.current[i3]
      history[1] = positionsRef.current[i3 + 1]
      history[2] = positionsRef.current[i3 + 2]

      let nearestDist = Infinity
      if (magnetPosRef.current) {
        const mp = magnetPosRef.current
        const dx = mp.x - positionsRef.current[i3]
        const dy = mp.y - positionsRef.current[i3 + 1]
        const dz = mp.z - positionsRef.current[i3 + 2]
        nearestDist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      } else if (autoEvolve && autoPolesRef.current.length > 0) {
        for (const pole of autoPolesRef.current) {
          const dx = pole.pos.x - positionsRef.current[i3]
          const dy = pole.pos.y - positionsRef.current[i3 + 1]
          const dz = pole.pos.z - positionsRef.current[i3 + 2]
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (d < nearestDist) nearestDist = d
        }
      } else {
        nearestDist = Math.sqrt(
          positionsRef.current[i3] ** 2 +
          positionsRef.current[i3 + 1] ** 2 +
          positionsRef.current[i3 + 2] ** 2
        )
      }

      const maxDist = 10
      let ct = clamp(nearestDist / maxDist, 0, 1)
      let color: [number, number, number]
      if (ct < 0.33) {
        color = lerpColor(COLORS.warm1, COLORS.warm2, ct / 0.33)
      } else if (ct < 0.66) {
        color = lerpColor(COLORS.warm2, COLORS.cool1, (ct - 0.33) / 0.33)
      } else {
        color = lerpColor(COLORS.cool1, COLORS.cool2, (ct - 0.66) / 0.34)
      }

      if (nearestDist < 2) {
        const boost = 1 + 0.5 * (1 - nearestDist / 2)
        color = [
          clamp(color[0] * boost, 0, 1),
          clamp(color[1] * boost, 0, 1),
          clamp(color[2] * boost, 0, 1)
        ]
      }

      if (explosionFlashRef.current[i] > 0) {
        const flashT = explosionFlashRef.current[i] / 0.2
        color = lerpColor(color, COLORS.gold, flashT)
      }

      if (autoEvolve && Math.abs(hueShift) > 0.1) {
        const rad = hueShift * Math.PI / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const [r, g, b] = color
        const y = 0.299 * r + 0.587 * g + 0.114 * b
        const u = (b - y) * 0.493
        const v = (r - y) * 0.877
        const u1 = u * cos - v * sin
        const v1 = u * sin + v * cos
        color = [
          clamp(y + 1.14 * v1, 0, 1),
          clamp(y - 0.395 * u1 - 0.581 * v1, 0, 1),
          clamp(y + 2.032 * u1, 0, 1)
        ]
      }

      colorsRef.current[i3] = color[0]
      colorsRef.current[i3 + 1] = color[1]
      colorsRef.current[i3 + 2] = color[2]
    }

    const posAttr = geometries.mainGeom.getAttribute('position') as THREE.BufferAttribute
    const colAttr = geometries.mainGeom.getAttribute('color') as THREE.BufferAttribute
    ;(posAttr.array as Float32Array).set(positionsRef.current)
    ;(colAttr.array as Float32Array).set(colorsRef.current)
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true

    for (let t = 0; t < TRAIL_LENGTH; t++) {
      const tp = geometries.trailGeoms[t].getAttribute('position') as THREE.BufferAttribute
      const tc = geometries.trailGeoms[t].getAttribute('color') as THREE.BufferAttribute
      const posArr = tp.array as Float32Array
      const colArr = tc.array as Float32Array
      const alpha = 0.6 * (1 - t / TRAIL_LENGTH)

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3
        const history = trailHistoryRef.current[i]
        const speed = Math.sqrt(
          velocitiesRef.current[i3] ** 2 +
          velocitiesRef.current[i3 + 1] ** 2 +
          velocitiesRef.current[i3 + 2] ** 2
        )
        const trailIntensity = clamp((speed - 0.2) / 1.8, 0, 1)
        const effectiveAlpha = alpha * trailIntensity

        posArr[i3] = history[t * 3]
        posArr[i3 + 1] = history[t * 3 + 1]
        posArr[i3 + 2] = history[t * 3 + 2]

        colArr[i3] = colorsRef.current[i3]
        colArr[i3 + 1] = colorsRef.current[i3 + 1]
        colArr[i3 + 2] = colorsRef.current[i3 + 2]
      }
      tp.needsUpdate = true
      tc.needsUpdate = true
    }
  })

  const trailMaterials = useMemo(() => {
    return Array.from({ length: TRAIL_LENGTH }, (_, t) => {
      const alpha = 0.6 * (1 - t / TRAIL_LENGTH)
      return new THREE.PointsMaterial({
        size: 2 - t * 0.1,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: alpha,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    })
  }, [])

  return (
    <group>
      <points ref={pointsRef} geometry={geometries.mainGeom}>
        <pointsMaterial
          size={3}
          sizeAttenuation
          vertexColors
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      {geometries.trailGeoms.map((geo, i) => (
        <points key={i} ref={(el) => { if (el) trailRefs.current[i] = el }} geometry={geo} material={trailMaterials[i]} />
      ))}
    </group>
  )
})
