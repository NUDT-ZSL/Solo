import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { ControlParams } from '../ui/ControlPanel'

interface CableData {
  index: number
  hue: number
  baseRadius: number
  turns: number
  startPhase: number
  direction: 1 | -1
  points: THREE.Vector3[]
  baseScale: number
}

interface PulseEffect {
  cableIndex: number
  progress: number
  duration: number
  startTime: number
  pointProgress: number
}

interface RingWave {
  yPosition: number
  radius: number
  startTime: number
  duration: number
  direction: 1 | -1
}

interface CableFlash {
  cableIndex: number
  startTime: number
  duration: number
}

interface Props {
  params: ControlParams
  isBreathing: boolean
  breathingIntensity: number
  rotationSpeed: number
  onRaycasterHit?: (cableIndex: number) => void
}

const TOWER_HEIGHT = 4
const BASE_RADIUS = 1.2
const SEGMENTS = 200

const Tower: React.FC<Props> = ({
  params,
  isBreathing,
  breathingIntensity,
  rotationSpeed,
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const cableMeshesRef = useRef<THREE.Mesh[]>([])
  const nodeMeshesRef = useRef<THREE.Mesh[]>([])
  const materialRefs = useRef<THREE.MeshStandardMaterial[]>([])
  const nodeMaterialRefs = useRef<THREE.MeshStandardMaterial[]>([])
  const { camera, gl } = useThree()

  const raycaster = useRef(new THREE.Raycaster())
  const mouseNDC = useRef(new THREE.Vector2())
  const lastRaycastTime = useRef(0)
  const hoveredCable = useRef<number | null>(null)

  const pulsesRef = useRef<PulseEffect[]>([])
  const ringWavesRef = useRef<RingWave[]>([])
  const flashesRef = useRef<CableFlash[]>([])
  const rotationAngle = useRef(0)

  const [hoveredCableIndex, setHoveredCableIndex] = useState<number | null>(null)

  const cablesData = useMemo<CableData[]>(() => {
    const data: CableData[] = []
    for (let i = 0; i < params.cableCount; i++) {
      const hue = (i / params.cableCount) * 360
      const baseRadius = 0.02 + Math.random() * 0.08
      const turns = 3 + Math.floor(Math.random() * 6)
      const startPhase = (i / params.cableCount) * Math.PI * 2
      const direction: 1 | -1 = i % 2 === 0 ? 1 : -1
      const points: THREE.Vector3[] = []

      for (let s = 0; s <= SEGMENTS; s++) {
        const t = s / SEGMENTS
        const y = -TOWER_HEIGHT / 2 + t * TOWER_HEIGHT
        const angle = startPhase + direction * t * turns * Math.PI * 2
        const r = BASE_RADIUS + Math.sin(t * Math.PI * 3) * 0.2
        points.push(new THREE.Vector3(
          Math.cos(angle) * r,
          y,
          Math.sin(angle) * r
        ))
      }

      data.push({
        index: i,
        hue,
        baseRadius,
        turns,
        startPhase,
        direction,
        points,
        baseScale: 1,
      })
    }
    return data
  }, [params.cableCount])

  const nodeData = useMemo(() => {
    const nodes: { position: THREE.Vector3; color: THREE.Color }[] = []
    const halfCables = Math.floor(cablesData.length / 2)
    const clockwise = cablesData.filter((_, i) => i % 2 === 0)
    const counterClockwise = cablesData.filter((_, i) => i % 2 === 1)

    const sampleCount = Math.min(halfCables, 40)
    for (let i = 0; i < sampleCount; i++) {
      for (let j = 0; j < sampleCount; j++) {
        if (Math.abs(i - j) % 3 === 0) {
          const t = 0.2 + Math.random() * 0.6
          const idx1 = Math.floor(Math.random() * clockwise.length)
          const idx2 = Math.floor(Math.random() * counterClockwise.length)
          const c1 = clockwise[idx1] || clockwise[0]
          const c2 = counterClockwise[idx2] || counterClockwise[0]
          if (c1 && c2) {
            const segIdx = Math.floor(t * SEGMENTS)
            const p1 = c1.points[segIdx]
            const p2 = c2.points[segIdx]
            const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
            const dist = mid.distanceTo(new THREE.Vector3(mid.x, 0, mid.z).setY(0))
            if (dist < 2.5) {
              const hue = (c1.hue + c2.hue) / 2
              nodes.push({
                position: mid,
                color: new THREE.Color().setHSL(hue / 360, 1, 0.6),
              })
            }
          }
        }
      }
    }
    return nodes
  }, [cablesData])

  const stars = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(params.starDensity * 3)
    for (let i = 0; i < params.starDensity; i++) {
      const r = 15 + Math.random() * 25
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }, [params.starDensity])

  useEffect(() => {
    cableMeshesRef.current = []
    materialRefs.current = []
  }, [params.cableCount])

  const getPointOnCable = useCallback((cable: CableData, progress: number): THREE.Vector3 => {
    const clamped = Math.max(0, Math.min(1, progress))
    const idx = clamped * SEGMENTS
    const i0 = Math.floor(idx)
    const i1 = Math.min(SEGMENTS, i0 + 1)
    const f = idx - i0
    return new THREE.Vector3().lerpVectors(cable.points[i0], cable.points[i1], f)
  }, [])

  const handlePointerMove = useCallback((e: MouseEvent) => {
    const now = performance.now()
    if (now - lastRaycastTime.current < 1000 / 60) return
    lastRaycastTime.current = now

    const rect = gl.domElement.getBoundingClientRect()
    mouseNDC.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouseNDC.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.current.setFromCamera(mouseNDC.current, camera)

    if (groupRef.current) {
      const intersects = raycaster.current.intersectObjects(
        cableMeshesRef.current,
        false
      )

      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh
        const cableIdx = cableMeshesRef.current.indexOf(mesh)
        if (cableIdx !== -1) {
          if (hoveredCable.current !== cableIdx) {
            hoveredCable.current = cableIdx
            setHoveredCableIndex(cableIdx)
            const existingPulse = pulsesRef.current.find(p => p.cableIndex === cableIdx)
            if (!existingPulse) {
              const face = intersects[0].face
              const point = intersects[0].point.clone()
              const cable = cablesData[cableIdx]
              let nearestT = 0
              let minDist = Infinity
              for (let s = 0; s <= SEGMENTS; s++) {
                const dist = point.distanceTo(cable.points[s])
                if (dist < minDist) {
                  minDist = dist
                  nearestT = s / SEGMENTS
                }
              }
              pulsesRef.current.push({
                cableIndex: cableIdx,
                progress: 0,
                duration: 1.5,
                startTime: performance.now(),
                pointProgress: nearestT,
              })
            }
          }
        }
      } else {
        if (hoveredCable.current !== null) {
          hoveredCable.current = null
          setHoveredCableIndex(null)
        }
      }
    }
  }, [camera, gl, cablesData])

  const handleClick = useCallback((e: MouseEvent) => {
    const rect = gl.domElement.getBoundingClientRect()
    mouseNDC.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouseNDC.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.current.setFromCamera(mouseNDC.current, camera)

    if (groupRef.current) {
      const intersects = raycaster.current.intersectObjects(
        cableMeshesRef.current,
        false
      )
      if (intersects.length > 0) {
        const point = intersects[0].point
        const now = performance.now()
        ringWavesRef.current.push({
          yPosition: point.y,
          radius: 0.2,
          startTime: now,
          duration: 2,
          direction: 1,
        })
        ringWavesRef.current.push({
          yPosition: point.y,
          radius: 0.2,
          startTime: now,
          duration: 2,
          direction: -1,
        })
      }
    }
  }, [camera, gl])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('click', handleClick)
    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('click', handleClick)
    }
  }, [handlePointerMove, handleClick, gl])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    rotationAngle.current += rotationSpeed * delta
    groupRef.current.rotation.y = rotationAngle.current

    const now = performance.now()

    pulsesRef.current = pulsesRef.current.filter((pulse) => {
      const elapsed = (now - pulse.startTime) / 1000
      pulse.progress = elapsed / pulse.duration
      return pulse.progress < 1
    })

    ringWavesRef.current = ringWavesRef.current.filter((wave) => {
      const elapsed = (now - wave.startTime) / 1000
      wave.radius = 0.2 + (elapsed / wave.duration) * 1.8
      const currentY = wave.yPosition + wave.direction * elapsed * 2

      cablesData.forEach((cable, idx) => {
        for (let s = 0; s <= SEGMENTS; s++) {
          const p = cable.points[s]
          const dy = Math.abs(p.y - currentY)
          if (dy < 0.15) {
            const r = Math.sqrt(p.x * p.x + p.z * p.z)
            if (Math.abs(r - wave.radius) < 0.25) {
              const existingFlash = flashesRef.current.find(f => f.cableIndex === idx)
              if (!existingFlash) {
                flashesRef.current.push({
                  cableIndex: idx,
                  startTime: now,
                  duration: 0.3,
                })
              }
              break
            }
          }
        }
      })

      return elapsed < wave.duration
    })

    flashesRef.current = flashesRef.current.filter((flash) => {
      const elapsed = (now - flash.startTime) / 1000
      return elapsed < flash.duration
    })

    cableMeshesRef.current.forEach((mesh, idx) => {
      const mat = materialRefs.current[idx]
      if (!mat) return
      const cable = cablesData[idx]
      if (!cable) return

      let intensity = params.brightness
      if (isBreathing) {
        intensity *= breathingIntensity
      }

      const pulse = pulsesRef.current.find((p) => p.cableIndex === idx)
      const flash = flashesRef.current.find((f) => f.cableIndex === idx)
      let scaleMultiplier = 1

      if (pulse) {
        const pulseAlpha = 1 - pulse.progress
        intensity = Math.min(intensity + pulseAlpha * 0.8, 2)
        scaleMultiplier = 1 + pulseAlpha * 0.8
      }

      if (flash) {
        intensity *= 1.6
      }

      if (hoveredCableIndex === idx && !pulse) {
        intensity *= 1.2
      }

      const color = new THREE.Color().setHSL(cable.hue / 360, 1, 0.5 * intensity)
      mat.color.copy(color)
      mat.emissive = new THREE.Color().setHSL(cable.hue / 360, 1, 0.4 * intensity)
      mat.emissiveIntensity = intensity
      mat.opacity = 0.6 + Math.min(intensity * 0.2, 0.4)

      const baseR = cable.baseRadius
      mesh.scale.setScalar(scaleMultiplier)
    })

    nodeMaterialRefs.current.forEach((mat, idx) => {
      let intensity = params.brightness * 0.5
      if (isBreathing) {
        intensity *= breathingIntensity
      }
      mat.emissiveIntensity = intensity
    })
  })

  return (
    <group>
      <points>
        <primitive object={stars} attach="geometry" />
        <pointsMaterial size={0.08} color="#FFFFFF" transparent opacity={0.8} />
      </points>

      <group ref={groupRef}>
        {cablesData.map((cable, idx) => {
          const curve = new THREE.CatmullRomCurve3(cable.points)
          const tubeGeo = new THREE.TubeGeometry(curve, 120, cable.baseRadius, 8, false)
          const color = new THREE.Color().setHSL(cable.hue / 360, 1, 0.5)
          return (
            <mesh
              key={`cable-${idx}`}
              geometry={tubeGeo}
              ref={(el) => {
                if (el) {
                  cableMeshesRef.current[idx] = el
                  const mat = el.material as THREE.MeshStandardMaterial
                  if (mat) materialRefs.current[idx] = mat
                }
              }}
            >
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.5}
                transparent
                opacity={0.75}
                roughness={0.2}
                metalness={0.3}
                side={THREE.DoubleSide}
              />
            </mesh>
          )
        })}

        {nodeData.map((node, idx) => {
          const sphereGeo = new THREE.SphereGeometry(0.03, 8, 8)
          return (
            <mesh
              key={`node-${idx}`}
              position={node.position}
              geometry={sphereGeo}
              ref={(el) => {
                if (el) {
                  nodeMeshesRef.current[idx] = el
                  const mat = el.material as THREE.MeshStandardMaterial
                  if (mat) nodeMaterialRefs.current[idx] = mat
                }
              }}
            >
              <meshStandardMaterial
                color={node.color}
                emissive={node.color}
                emissiveIntensity={0.5}
                transparent
                opacity={0.9}
              />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

export default Tower
