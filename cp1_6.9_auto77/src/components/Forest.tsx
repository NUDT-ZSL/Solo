import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Crystal, { CrystalShape } from './Crystal'
import { ParticleSystem } from '@/utils/particleSystem'

interface CrystalData {
  id: number
  seedX: number
  seedZ: number
  height: number
  maxHeight: number
  shapeType: CrystalShape
  hue: number
  saturation: number
  lightness: number
  opacity: number
  isFullyGrown: boolean
  pulsePhase: number
  pulseSpeed: number
  vibrateActive: boolean
  vibratePhase: number
  vibrateFreq: number
  brightnessBoost: number
  resonanceShift: number
  resonanceFlashTimer: number
  resonanceFlashTotal: number
  prevHovered: boolean
  noiseSeed: number
}

interface ForestProps {
  onCountChange?: (n: number) => void
}

const CRYSTAL_COUNT = 50
const GROW_RATE = 0.01
const DISC_RADIUS = 10
const RESONANCE_RADIUS = 3

function noise2D(x: number, y: number, seed: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453
  return s - Math.floor(s)
}

function smoothNoise(x: number, y: number, seed: number) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)

  const a = noise2D(ix, iy, seed)
  const b = noise2D(ix + 1, iy, seed)
  const c = noise2D(ix, iy + 1, seed)
  const d = noise2D(ix + 1, iy + 1, seed)

  const ab = a + (b - a) * sx
  const cd = c + (d - c) * sx
  return ab + (cd - ab) * sy
}

export default function Forest({ onCountChange }: ForestProps) {
  const { camera, gl, scene } = useThree()
  const [crystals, setCrystals] = useState<CrystalData[]>([])
  const particlesRef = useRef<ParticleSystem | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2(-999, -999))
  const hoveredIdRef = useRef<number | null>(null)
  const topPositionsRef = useRef<Map<number, { x: number; y: number; z: number }>>(new Map())
  const crystalsRef = useRef<CrystalData[]>([])
  const initializedRef = useRef(false)

  useEffect(() => {
    crystalsRef.current = crystals
  }, [crystals])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const arr: CrystalData[] = []
    const baseSeed = Math.random() * 1000

    for (let i = 0; i < CRYSTAL_COUNT; i++) {
      const r = DISC_RADIUS * Math.sqrt(Math.random())
      const theta = Math.random() * Math.PI * 2
      const x = r * Math.cos(theta)
      const z = r * Math.sin(theta)

      const n1 = smoothNoise(x * 0.3, z * 0.3, baseSeed)
      const n2 = smoothNoise(x * 0.6 + 100, z * 0.6 - 50, baseSeed + 1)
      const n3 = smoothNoise(x * 0.15 - 200, z * 0.15 + 300, baseSeed + 2)

      let shape: CrystalShape
      if (n1 < 0.33) shape = 'hexagon'
      else if (n1 < 0.66) shape = 'cone'
      else shape = 'irregular'

      const maxHeight = 2 + n2 * 2
      const hue = 120 + n3 * 180
      const saturation = 0.7 + n1 * 0.25
      const lightness = 0.3 + n2 * 0.3
      const opacity = 0.3 + (1 - n3) * 0.6

      const pulsePeriod = 2 + n1 * 1
      const pulseSpeed = (Math.PI * 2) / pulsePeriod

      arr.push({
        id: i,
        seedX: x,
        seedZ: z,
        height: 0,
        maxHeight,
        shapeType: shape,
        hue,
        saturation,
        lightness,
        opacity,
        isFullyGrown: false,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed,
        vibrateActive: false,
        vibratePhase: 0,
        vibrateFreq: 4 + n2 * 2,
        brightnessBoost: 1,
        resonanceShift: 0,
        resonanceFlashTimer: 0,
        resonanceFlashTotal: 0,
        prevHovered: false,
        noiseSeed: baseSeed + i,
      })
    }

    setCrystals(arr)
    onCountChange?.(CRYSTAL_COUNT)
  }, [onCountChange])

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }

    const handlePointerLeave = () => {
      mouseRef.current.set(-999, -999)
    }

    const handleClick = (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(new THREE.Vector2(mx, my), camera)
      const allMeshes: THREE.Object3D[] = []
      scene.traverse((obj: THREE.Object3D) => {
        if ((obj as THREE.Mesh).isMesh && (obj as any).userData?.crystalId !== undefined && !(obj as any).userData?.isGlow) {
          allMeshes.push(obj)
        }
      })

      const hits = raycasterRef.current.intersectObjects(allMeshes, false)
      if (hits.length > 0) {
        const hitId = (hits[0].object as any).userData.crystalId as number
        triggerResonance(hitId)
      }
    }

    gl.domElement.addEventListener('pointermove', handlePointerMove)
    gl.domElement.addEventListener('pointerleave', handlePointerLeave)
    gl.domElement.addEventListener('click', handleClick)

    return () => {
      gl.domElement.removeEventListener('pointermove', handlePointerMove)
      gl.domElement.removeEventListener('pointerleave', handlePointerLeave)
      gl.domElement.removeEventListener('click', handleClick)
    }
  }, [camera, gl])

  const triggerResonance = useCallback((centerId: number) => {
    const current = crystalsRef.current
    const center = current.find((c) => c.id === centerId)
    if (!center) return

    const dx = center.seedX
    const dz = center.seedZ

    const affected = current
      .map((c) => {
        const dist = Math.sqrt((c.seedX - dx) ** 2 + (c.seedZ - dz) ** 2)
        return { c, dist }
      })
      .filter(({ dist }) => dist <= RESONANCE_RADIUS)
      .sort((a, b) => a.dist - b.dist)

    setCrystals((prev) => {
      const next = prev.map((c) => ({ ...c }))
      for (const item of affected) {
        const idx = next.findIndex((c) => c.id === item.c.id)
        if (idx === -1) continue
        if (item.c.id === centerId) {
          next[idx].brightnessBoost = 1.5
          setTimeout(() => {
            setCrystals((p2) => p2.map((cc) => (cc.id === centerId ? { ...cc, brightnessBoost: 1 } : cc)))
          }, 300)
        } else {
          const delay = (item.dist / RESONANCE_RADIUS) * 300
          const shift = (Math.random() > 0.5 ? 1 : -1) * 30
          setTimeout(() => {
            startFlash(item.c.id, shift)
          }, delay)
        }
      }
      return next
    })
  }, [])

  const startFlash = useCallback((id: number, shift: number) => {
    let flashCount = 0
    const totalFlashes = 2
    const flashDuration = 125

    const doFlash = () => {
      setCrystals((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c
          return {
            ...c,
            resonanceShift: shift,
            brightnessBoost: 1.4,
            resonanceFlashTimer: flashDuration,
            resonanceFlashTotal: flashDuration,
          }
        }),
      )

      setTimeout(() => {
        setCrystals((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c
            return { ...c, resonanceShift: 0, brightnessBoost: 1 }
          }),
        )
        flashCount++
        if (flashCount < totalFlashes) {
          setTimeout(doFlash, 80)
        }
      }, flashDuration)
    }

    doFlash()
  }, [])

  const handleRaycastRegister = useCallback(
    (mesh: THREE.Mesh, data: { id: number; topY: number; posX: number; posZ: number }) => {
      topPositionsRef.current.set(data.id, { x: data.posX, y: data.topY, z: data.posZ })
    },
    [],
  )

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)

    setCrystals((prev) => {
      const mouse = mouseRef.current
      let hoveredNow: number | null = null

      if (mouse.x > -100) {
        let minDist = 0.5
        const topPos = topPositionsRef.current

        for (const c of prev) {
          const tp = topPos.get(c.id)
          if (!tp) continue
          const actualHeight = Math.min(c.height, c.maxHeight)
          if (actualHeight < 0.3) continue

          raycasterRef.current.setFromCamera(mouse, camera)
          const ray = raycasterRef.current.ray
          const topPoint = new THREE.Vector3(tp.x, tp.y, tp.z)

          const toPoint = new THREE.Vector3().subVectors(topPoint, ray.origin)
          const t = toPoint.dot(ray.direction)
          const closest = ray.origin.clone().addScaledVector(ray.direction, Math.max(0, t))
          const dist = closest.distanceTo(topPoint)

          if (dist < minDist) {
            minDist = dist
            hoveredNow = c.id
          }
        }
      }

      hoveredIdRef.current = hoveredNow

      return prev.map((c) => {
        const nc = { ...c }

        if (!nc.isFullyGrown) {
          nc.height = Math.min(nc.height + GROW_RATE, nc.maxHeight)
          if (nc.height >= nc.maxHeight) {
            nc.isFullyGrown = true
          }
        } else {
          nc.pulsePhase += nc.pulseSpeed * dt
        }

        const isHovered = hoveredNow === nc.id
        if (isHovered && !nc.prevHovered) {
          nc.vibrateActive = true
          const topPos = topPositionsRef.current.get(nc.id)
          if (topPos && particlesRef.current) {
            const color = new THREE.Color().setHSL(nc.hue / 360, nc.saturation, Math.min(0.8, nc.lightness + 0.2))
            particlesRef.current.emit(
              new THREE.Vector3(topPos.x, topPos.y, topPos.z),
              color,
              20 + Math.floor(Math.random() * 21),
              { speed: 0.1, life: 2 },
            )
          }
        } else if (!isHovered && nc.prevHovered) {
          nc.vibrateActive = false
        }

        if (nc.vibrateActive) {
          nc.vibratePhase += dt
        }

        if (nc.resonanceFlashTimer > 0) {
          nc.vibratePhase += dt
          nc.resonanceFlashTimer -= dt * 1000
          if (nc.resonanceFlashTimer <= 0) {
            nc.resonanceFlashTimer = 0
          }
        }

        nc.prevHovered = isHovered
        return nc
      })
    })

    if (particlesRef.current) {
      particlesRef.current.update(dt)
    }
  })

  const particlePoints = useMemo(() => {
    if (!particlesRef.current) {
      particlesRef.current = new ParticleSystem(1000)
    }
    return <primitive object={particlesRef.current.points} />
  }, [])

  return (
    <group>
      {crystals.map((c) => (
        <Crystal
          key={c.id}
          id={c.id}
          seedX={c.seedX}
          seedZ={c.seedZ}
          height={c.height}
          maxHeight={c.maxHeight}
          shapeType={c.shapeType}
          hue={c.hue}
          saturation={c.saturation}
          lightness={c.lightness}
          opacity={c.opacity}
          isFullyGrown={c.isFullyGrown}
          pulsePhase={c.pulsePhase}
          pulseSpeed={c.pulseSpeed}
          vibrateActive={c.vibrateActive}
          vibratePhase={c.vibratePhase}
          vibrateFreq={c.vibrateFreq}
          brightnessBoost={c.brightnessBoost}
          resonanceShift={c.resonanceShift}
          onRaycast={handleRaycastRegister}
        />
      ))}
      {particlePoints}
    </group>
  )
}
