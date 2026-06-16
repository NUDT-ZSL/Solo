import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import {
  Gear,
  GEAR_COLORS,
  GEAR_RADIUS_RATIO,
  DEFAULT_CONFIG
} from '@/utils/gearData'
import { getLinkedGears } from '@/logic/PuzzleEngine'

interface GearMeshProps {
  gear: Gear
  isHighlighted: boolean
  isError: boolean
  isHinted: boolean
  rustCoverage: number
  isAnimating: boolean
  animProgress: number
  isVictoryAnimating: boolean
  victoryProgress: number
  onClick: (gear: Gear) => void
}

function playGearSound() {
  try {
    const AudioCtx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    const ctx = new AudioCtx()
    const now = ctx.currentTime

    const bufferSize = ctx.sampleRate * 0.15
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3))
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1500
    filter.Q.value = 0.8

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(120, now)
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1)

    const oscGain = ctx.createGain()
    oscGain.gain.setValueAtTime(0.08, now)
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.connect(oscGain)
    oscGain.connect(ctx.destination)

    noise.start(now)
    osc.start(now)
    noise.stop(now + 0.15)
    osc.stop(now + 0.15)

    setTimeout(() => ctx.close(), 300)
  } catch {
    // ignore
  }
}

function GearMesh({
  gear, isHighlighted, isError, isHinted, rustCoverage, isAnimating, animProgress, isVictoryAnimating, victoryProgress, onClick }: GearMeshProps) {
  const groupRef = useRef<THREE.Group>(null)
  const teethRef = useRef<THREE.Mesh>(null)
  const currentRotation = useRef(gear.rotation * Math.PI / 180)
  const targetRotation = useRef(gear.rotation * Math.PI / 180)

  const baseRadius = GEAR_RADIUS_RATIO[gear.type] * 0.4
  const teethCount = gear.teethCount
  const teethHeight = 0.06
  const teethWidth = 0.05

  useEffect(() => {
    targetRotation.current = gear.rotation * Math.PI / 180
  }, [gear.rotation])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    if (isVictoryAnimating) {
      const targetVictory = victoryProgress * Math.PI * 2
      groupRef.current.rotation.z = targetVictory + (gear.isSource ? 0 : 0)
      return
    }

    if (isAnimating) {
      const eased = 1 - Math.pow(1 - animProgress, 3)
      const diff = targetRotation.current - currentRotation.current
      groupRef.current.rotation.z = currentRotation.current + diff * eased
      if (animProgress >= 1) {
        currentRotation.current = targetRotation.current
      }
    } else {
      const diff = targetRotation.current - currentRotation.current
      if (Math.abs(diff) > 0.001) {
        currentRotation.current += diff * Math.min(delta * 8, 1)
        groupRef.current.rotation.z = currentRotation.current
      }
    }
  }

  const teethGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions: number[] = []
    const indices: number[] = []
    const normals: number[] = []

    for (let i = 0; i < teethCount; i++) {
      const angle1 = (i / teethCount) * Math.PI * 2
      const angle2 = ((i + 0.3 / teethCount) * Math.PI * 2
      const innerR = baseRadius
      const outerR = baseRadius + teethHeight

      const segments = 8
      for (let s = 0; s < segments; s++) {
        const a1 = angle1 + (angle2 - angle1) * (s / segments)
        const a2 = angle1 + (angle2 - angle1) * ((s + 1) / segments)

        const p1 = [Math.cos(a1) * innerR, Math.sin(a1) * innerR]
        const p2 = [Math.cos(a2) * innerR, Math.sin(a2) * innerR]
        const p3 = [Math.cos(a2) * outerR, Math.sin(a2) * outerR]
        const p4 = [Math.cos(a1) * outerR, Math.sin(a1) * outerR]

        const baseIdx = positions.length / 3

        positions.push(
          p1[0], p1[1], -teethWidth / 2,
          p2[0], p2[1], -teethWidth / 2,
          p3[0], p3[1], -teethWidth / 2,
          p4[0], p4[1], -teethWidth / 2,
          p1[0], p1[1], teethWidth / 2,
          p2[0], p2[1], teethWidth / 2,
          p3[0], p3[1], teethWidth / 2,
          p4[0], p4[1], teethWidth / 2
        )

        indices.push(
          baseIdx, baseIdx + 1, baseIdx + 2,
          baseIdx, baseIdx + 2, baseIdx + 3,
          baseIdx + 4, baseIdx + 6, baseIdx + 5,
          baseIdx + 4, baseIdx + 7, baseIdx + 6,
          baseIdx, baseIdx + 4, baseIdx + 5,
          baseIdx, baseIdx + 5, baseIdx + 1,
          baseIdx + 1, baseIdx + 5, baseIdx + 6,
          baseIdx + 1, baseIdx + 6, baseIdx + 2,
          baseIdx + 2, baseIdx + 6, baseIdx + 7,
          baseIdx + 2, baseIdx + 7, baseIdx + 3,
          baseIdx + 3, baseIdx + 7, baseIdx + 4,
          baseIdx + 3, baseIdx + 4, baseIdx
        )

        for (let n = 0; n < 8; n++) normals.push(0, 0, 1)
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geo.setIndex(indices)
    return geo
  }, [baseRadius, teethCount])

  const emissiveColor = isError
    ? '#E74C3C'
    : isVictoryAnimating
    ? '#FFD700'
    : isHighlighted
    ? '#FFD700'
    : '#000000'

  const emissiveIntensity = isError
    ? 0.8
    : isVictoryAnimating
    ? 1.0
    : isHighlighted
    ? 0.5
    : isHinted
    ? 0.3
    : 0

  if (gear.isEmpty) return null

  const x = (gear.col - 2) * 1.1
  const y = (2 - gear.row) * 1.1

  return (
    <group
      ref={groupRef}
      position={[x, y, 0.1]}
      onClick={(e) => {
        e.stopPropagation()
        if (!gear.isSource && !gear.isTarget) onClick(gear)
      }}
    >
      <mesh>
        <cylinderGeometry args={[baseRadius, baseRadius, 0.08, 32} />
        <meshStandardMaterial
          color={GEAR_COLORS[gear.type]}
          roughness={0.7}
          metalness={0.3}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity * 0.2}
        />
      </mesh>

      <mesh ref={teethRef} geometry={teethGeometry}>
        <meshStandardMaterial
          color={GEAR_COLORS[gear.type]}
          roughness={0.6}
          metalness={0.4}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      <mesh position={[0, 0, 0.05]}>
        <cylinderGeometry args={[baseRadius * 0.25, baseRadius * 0.25, 0.03, 16} />
        <meshStandardMaterial color="#3E2723" metalness={0.5} roughness={0.5} />
      </mesh>

      {gear.isSource && (
        <mesh position={[0, 0, 0.08]}>
          <torusGeometry args={[baseRadius * 0.15, 0.02, 8, 16]} />
          <meshStandardMaterial
            color="#FFD700" emissive="#FFD700" emissiveIntensity={0.8} />
        </mesh>
      )}

      {gear.isTarget && (
        <mesh position={[0, 0, 0.08]}>
          <torusGeometry args={[baseRadius * 0.15, 0.02, 8, 16]} />
          <meshStandardMaterial
            color="#C5A55A" emissive="#C5A55A" emissiveIntensity={0.5} />
        </mesh>
      )}

      {rustCoverage > 0 && (
        <mesh position={[0, 0, 0.041]}>
          <circleGeometry args={[baseRadius + 0.001, 32]} />
          <meshBasicMaterial
            color="#8B4513"
            transparent
            opacity={Math.min(rustCoverage * 0.8, 0.8)}
          />
        </mesh>
      )}
    </group>
  )
}

function SourceParticles({ active, position }: { active: boolean; position: [number, number, number] }) {
  const pointsRef = useRef<THREE.Points>(null)
  const opacity = useRef(0)

  const particleCount = 80

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    const vel = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = position[0]
      pos[i * 3 + 1] = position[1]
      pos[i * 3 + 2] = position[2]
      vel[i * 3] = (Math.random() - 0.5) * 0.1
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.1
      vel[i * 3 + 2] = Math.random() * 0.05
    }
    return { positions: pos, velocities: vel }
  }, [position])

  useFrame((_, delta) => {
    opacity.current = Math.max(0, Math.min(1, opacity.current + (active ? delta * 3 : -delta * 1.5))
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array
    for (let i = 0; i < particleCount; i++) {
      if (active) {
        posArray[i * 3] += velocities[i * 3]
        posArray[i * 3 + 1] += velocities[i * 3 + 1]
        posArray[i * 3 + 2] += velocities[i * 3 + 2]
        if (Math.abs(posArray[i * 3] - position[0]) > 0.4 ||
          Math.abs(posArray[i * 3 + 1] - position[1]) > 0.4 ||
          posArray[i * 3 + 2] > 0.6) {
          posArray[i * 3] = position[0]
          posArray[i * 3 + 1] = position[1]
          posArray[i * 3 + 2] = position[2]
        }
      }
    }
    posAttr.needsUpdate = true
  }

  return (
    <Points
      ref={pointsRef}
      positions={positions}
      stride={3}
      frustumCulled={false}
    >
      <PointMaterial
        transparent
        color="#FFD700"
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={opacity.current * 0.8}
      />
    </Points>
  )
}

function GridFloor({ size }: { size: number }) {
  const lines = useMemo(() => {
    const result: JSX.Element[] = []
    const half = size / 2
    for (let i = 0; i <= size; i++) {
      const offset = i - half
      result.push(
        <mesh key={`h${i}`} position={[0, offset - 0.05, -0.01]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[size * 1.1, 0.003]} />
          <meshBasicMaterial color="#C5A55A" />
        </mesh>
      )
      result.push(
        <mesh key={`v${i}`} position={[offset - 0.05, 0, -0.01]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[size * 1.1, 0.003]} />
          <meshBasicMaterial color="#C5A55A" />
        </mesh>
      )
    }
    return result
  }, [size])

  return (
    <group>
      <mesh position={[0, 0, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size * 1.2, size * 1.2]} />
        <meshBasicMaterial color="#3E2723" />
      </mesh>
      {lines}
    </group>
  )
}

export interface GameBoardProps {
  gears: Gear[]
  size: number
  connectedPath: Gear[]
  errorPositions: { row: number; col: number }[]
  hintedGearId: string | null
  rustCoverage: number
  onGearClick: (gear: Gear) => void
  isVictory: boolean
  victoryPhase: number
}

export default function GameBoard({
  gears, size, connectedPath, errorPositions, hintedGearId, rustCoverage, onGearClick, isVictory, victoryPhase }: GameBoardProps) {
  const [animatingGears, setAnimatingGears] = useState<Map<string, { progress: number; linkedIds: string[]>>(new Map())
  const [soundPlayed, setSoundPlayed] = useState(false)

  const handleGearClick = useCallback((gear: Gear) => {
    if (gear.isEmpty || gear.isSource) return
    const linked = getLinkedGears(gear, gears)
    const linkedIds = linked.map(g => g.id)
    const newMap = new Map<string, { progress: number; linkedIds: string[]}>()
    linked.forEach((g, idx) => {
      newMap.set(g.id, { progress: 0, linkedIds })
      setTimeout(() => {
        setAnimatingGears(prev => {
          const updated = new Map(prev)
          updated.set(g.id, { progress: 0, linkedIds })
          return updated
        })
      }, idx * 50)
    })
    if (!soundPlayed) {
      playGearSound()
      setSoundPlayed(true)
      setTimeout(() => setSoundPlayed(false), 200)
    }
    onGearClick(gear)
  }, [gears, onGearClick, soundPlayed])

  useEffect(() => {
    let raf: number
    const startTime = performance.now()
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 400
      setAnimatingGears(prev => {
        const updated = new Map(prev)
        updated.forEach((val, key) => {
          const newProgress = Math.min(1, elapsed)
          updated.set(key, { ...val, progress: newProgress })
        })
        return updated
      })
      if (elapsed < 1) raf = requestAnimationFrame(animate)
      else setTimeout(() => setAnimatingGears(new Map()), 100)
    }
    if (animatingGears.size > 0) {
      raf = requestAnimationFrame(animate)
    }
    return () => { if (raf) cancelAnimationFrame(raf) }
  }, [animatingGears.size])

  const sourceGear = gears.find(g => g.isSource)
  const sourceActive = sourceGear ? animatingGears.has(sourceGear.id) || isVictory : false

  const sourcePosition: [number, number, number] = sourceGear
    ? [(sourceGear.col - 2) * 1.1, (2 - sourceGear.row) * 1.1, 0.2]
    : [0, 0, 0]

  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 50 }} style={{ width: '100%', height: '100%' }}>
      <color attach="background" args={['#3E2723]} />
      <fog attach="fog" args={['#2E1B0E', 8, 15]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#FFF8E1" />
      <pointLight position={[-5, -3, 3]} intensity={0.4} color="#FFD700" />
      <GridFloor size={size} />
      {gears.map(gear => {
        const isHighlighted = connectedPath.some(g => g.id === gear.id)
        const isError = errorPositions.some(p => p.row === gear.row && p.col === gear.col)
        const isHinted = hintedGearId === gear.id
        const animInfo = animatingGears.get(gear.id)
        const isAnimating = !!animInfo
        const animProgress = animInfo?.progress || 0
        const isVictoryAnimating = isVictory && isHighlighted
        const victoryDelay = connectedPath.findIndex(g => g.id === gear.id)
        const adjustedVictoryProgress = Math.max(0, Math.min(1, (victoryPhase - victoryDelay * 0.1) * 1.5)
        return (
          <GearMesh
            key={gear.id}
            gear={gear}
            isHighlighted={isHighlighted}
            isError={isError}
            isHinted={isHinted}
            rustCoverage={rustCoverage}
            isAnimating={isAnimating}
            animProgress={animProgress}
            isVictoryAnimating={isVictoryAnimating && adjustedVictoryProgress > 0 && adjustedVictoryProgress < 1.5}
            victoryProgress={adjustedVictoryProgress}
            onClick={handleGearClick}
          />
        )
      })}
      {sourceGear && <SourceParticles active={sourceActive} position={sourcePosition} />}
    </Canvas>
  )
}
