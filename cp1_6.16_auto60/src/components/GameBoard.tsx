import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import {
  Gear,
  GEAR_COLORS,
  GEAR_RADIUS_RATIO
} from '@/utils/gearData'
import { getLinkedGears } from '@/logic/PuzzleEngine'

interface GearMeshProps {
  gear: Gear
  isHighlighted: boolean
  isError: boolean
  isHinted: boolean
  rustCoverage: number
  isAnimating: boolean
  animDelay: number
  isVictoryAnimating: boolean
  victoryDelay: number
  victoryProgress: number
  onClick: (gear: Gear) => void
}

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    if (!audioContext) {
      audioContext = new Ctx()
    }
    return audioContext
  } catch {
    return null
  }
}

function playGearSound(intensity: number = 1) {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const duration = 0.18 * intensity

    const bufferSize = Math.floor(ctx.sampleRate * duration)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize
      const envelope = Math.exp(-t * 4)
      data[i] = (Math.random() * 2 - 1) * envelope * (0.6 + 0.4 * Math.sin(t * 80))
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(2200, now)
    filter.frequency.exponentialRampToValueAtTime(800, now + duration)
    filter.Q.value = 1.2

    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.18 * intensity, now)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    const osc1 = ctx.createOscillator()
    osc1.type = 'square'
    osc1.frequency.setValueAtTime(180, now)
    osc1.frequency.exponentialRampToValueAtTime(70, now + duration * 0.8)

    const osc1Gain = ctx.createGain()
    osc1Gain.gain.setValueAtTime(0.06 * intensity, now)
    osc1Gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.9)

    const osc2 = ctx.createOscillator()
    osc2.type = 'sawtooth'
    osc2.frequency.setValueAtTime(90, now)
    osc2.frequency.exponentialRampToValueAtTime(45, now + duration)

    const osc2Gain = ctx.createGain()
    osc2Gain.gain.setValueAtTime(0.04 * intensity, now)
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7)

    noise.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(ctx.destination)

    osc1.connect(osc1Gain)
    osc1Gain.connect(ctx.destination)

    osc2.connect(osc2Gain)
    osc2Gain.connect(ctx.destination)

    noise.start(now)
    osc1.start(now)
    osc2.start(now)
    noise.stop(now + duration)
    osc1.stop(now + duration)
    osc2.stop(now + duration)
  } catch {
    // ignore audio errors
  }
}

function playVictorySound() {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.50]

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      const gain = ctx.createGain()
      const start = now + i * 0.15
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.4)
    })
  } catch {
    // ignore
  }
}

function buildTeethGeometry(baseRadius: number, teethCount: number, teethHeight: number, teethWidth: number): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  const positions: number[] = []
  const indices: number[] = []
  const normals: number[] = []
  const uvs: number[] = []

  for (let i = 0; i < teethCount; i++) {
    const startAngle = (i / teethCount) * Math.PI * 2
    const endAngle = ((i + 0.35) / teethCount) * Math.PI * 2
    const innerR = baseRadius
    const outerR = baseRadius + teethHeight
    const hw = teethWidth / 2

    const segCount = 6
    for (let s = 0; s < segCount; s++) {
      const t1 = s / segCount
      const t2 = (s + 1) / segCount
      const a1 = startAngle + (endAngle - startAngle) * t1
      const a2 = startAngle + (endAngle - startAngle) * t2

      const cx1 = Math.cos(a1)
      const cy1 = Math.sin(a1)
      const cx2 = Math.cos(a2)
      const cy2 = Math.sin(a2)

      const p000 = [cx1 * innerR, cy1 * innerR, -hw]
      const p100 = [cx2 * innerR, cy2 * innerR, -hw]
      const p110 = [cx2 * outerR, cy2 * outerR, -hw]
      const p010 = [cx1 * outerR, cy1 * outerR, -hw]
      const p001 = [cx1 * innerR, cy1 * innerR, hw]
      const p101 = [cx2 * innerR, cy2 * innerR, hw]
      const p111 = [cx2 * outerR, cy2 * outerR, hw]
      const p011 = [cx1 * outerR, cy1 * outerR, hw]

      const baseIdx = positions.length / 3
      positions.push(
        p000[0], p000[1], p000[2],
        p100[0], p100[1], p100[2],
        p110[0], p110[1], p110[2],
        p010[0], p010[1], p010[2],
        p001[0], p001[1], p001[2],
        p101[0], p101[1], p101[2],
        p111[0], p111[1], p111[2],
        p011[0], p011[1], p011[2]
      )

      for (let k = 0; k < 8; k++) {
        normals.push(0, 0, k < 4 ? -1 : 1)
        uvs.push(t1, k % 2, t2, k % 2)
      }

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
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function GearMesh({
  gear, isHighlighted, isError, isHinted, rustCoverage,
  isAnimating, animDelay, isVictoryAnimating, victoryDelay, victoryProgress, onClick
}: GearMeshProps) {
  const groupRef = useRef<THREE.Group>(null)
  const currentRotation = useRef(gear.rotation * Math.PI / 180)
  const targetRotation = useRef(gear.rotation * Math.PI / 180)
  const animStartRef = useRef<number | null>(null)
  const victoryStartRef = useRef<number | null>(null)

  const baseRadius = GEAR_RADIUS_RATIO[gear.type] * 0.4
  const teethCount = gear.teethCount
  const teethHeight = 0.07
  const teethWidth = 0.06

  useEffect(() => {
    targetRotation.current = gear.rotation * Math.PI / 180
  }, [gear.rotation])

  useEffect(() => {
    if (isAnimating) {
      animStartRef.current = null
    }
  }, [isAnimating])

  useEffect(() => {
    if (isVictoryAnimating) {
      victoryStartRef.current = null
    }
  }, [isVictoryAnimating])

  useFrame((state) => {
    if (!groupRef.current) return

    if (isVictoryAnimating && victoryProgress > 0) {
      if (victoryStartRef.current === null) {
        victoryStartRef.current = state.clock.elapsedTime
      }
      const localProgress = Math.max(0, Math.min(1, victoryProgress - victoryDelay))
      if (localProgress > 0 && localProgress < 1) {
        const eased = localProgress < 0.5
          ? 2 * localProgress * localProgress
          : 1 - Math.pow(-2 * localProgress + 2, 2) / 2
        groupRef.current.rotation.z = eased * Math.PI * 2
      } else if (localProgress >= 1) {
        groupRef.current.rotation.z = Math.PI * 2
      }
      return
    }

    if (isAnimating) {
      if (animStartRef.current === null) {
        animStartRef.current = state.clock.elapsedTime
      }
      const elapsed = state.clock.elapsedTime - animStartRef.current - animDelay
      const localProgress = Math.max(0, Math.min(1, elapsed / 0.4))
      if (localProgress > 0) {
        const eased = 1 - Math.pow(1 - localProgress, 3)
        const diff = targetRotation.current - currentRotation.current
        groupRef.current.rotation.z = currentRotation.current + diff * eased
        if (localProgress >= 1) {
          currentRotation.current = targetRotation.current
        }
      }
    } else {
      const diff = targetRotation.current - currentRotation.current
      if (Math.abs(diff) > 0.001) {
        currentRotation.current += diff * 0.15
        groupRef.current.rotation.z = currentRotation.current
      } else {
        currentRotation.current = targetRotation.current
        groupRef.current.rotation.z = targetRotation.current
      }
      animStartRef.current = null
    }
  })

  const teethGeometry = useMemo(
    () => buildTeethGeometry(baseRadius, teethCount, teethHeight, teethWidth),
    [baseRadius, teethCount]
  )

  const bodyColor = GEAR_COLORS[gear.type]

  let teethEmissive = '#000000'
  let teethEmissiveIntensity = 0
  let bodyEmissive = '#000000'
  let bodyEmissiveIntensity = 0

  if (isError) {
    teethEmissive = '#E74C3C'
    teethEmissiveIntensity = 1.2
    bodyEmissive = '#E74C3C'
    bodyEmissiveIntensity = 0.2
  } else if (isVictoryAnimating && victoryProgress - victoryDelay > 0) {
    teethEmissive = '#FFD700'
    teethEmissiveIntensity = 1.5
    bodyEmissive = '#FFD700'
    bodyEmissiveIntensity = 0.15
  } else if (isHighlighted) {
    teethEmissive = '#FFD700'
    teethEmissiveIntensity = 0.8
    bodyEmissive = '#000000'
    bodyEmissiveIntensity = 0
  } else if (isHinted) {
    teethEmissive = '#FFC107'
    teethEmissiveIntensity = 0.5
    bodyEmissive = '#000000'
    bodyEmissiveIntensity = 0
  }

  if (gear.isEmpty) return null

  const cellSize = 1.1
  const centerOffset = (5 - 1) / 2
  const x = (gear.col - centerOffset) * cellSize
  const y = (centerOffset - gear.row) * cellSize

  return (
    <group
      ref={groupRef}
      position={[x, y, 0.1]}
      onClick={(e) => {
        e.stopPropagation()
        if (!gear.isSource && !gear.isTarget && !gear.isEmpty) {
          onClick(gear)
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (!gear.isEmpty && !gear.isSource && !gear.isTarget) {
          document.body.style.cursor = 'pointer'
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
      }}
    >
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[baseRadius * 0.98, baseRadius * 0.98, 0.09, 48]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.72}
          metalness={0.35}
          emissive={bodyEmissive}
          emissiveIntensity={bodyEmissiveIntensity}
        />
      </mesh>

      <mesh geometry={teethGeometry}>
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.55}
          metalness={0.55}
          emissive={teethEmissive}
          emissiveIntensity={teethEmissiveIntensity}
        />
      </mesh>

      <mesh position={[0, 0, 0.055]}>
        <cylinderGeometry args={[baseRadius * 0.28, baseRadius * 0.28, 0.035, 24]} />
        <meshStandardMaterial color="#2C1810" metalness={0.6} roughness={0.45} />
      </mesh>

      <mesh position={[0, 0, 0.07]}>
        <cylinderGeometry args={[baseRadius * 0.16, baseRadius * 0.16, 0.015, 20]} />
        <meshStandardMaterial color="#1A0F08" metalness={0.4} roughness={0.6} />
      </mesh>

      {gear.isSource && (
        <mesh position={[0, 0, 0.09]}>
          <torusGeometry args={[baseRadius * 0.18, 0.022, 12, 32]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFD700"
            emissiveIntensity={1.2}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      )}

      {gear.isTarget && (
        <mesh position={[0, 0, 0.09]}>
          <torusGeometry args={[baseRadius * 0.18, 0.022, 12, 32]} />
          <meshStandardMaterial
            color="#C5A55A"
            emissive="#C5A55A"
            emissiveIntensity={0.6}
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>
      )}

      {rustCoverage > 0 && (
        <mesh position={[0, 0, 0.046]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[baseRadius + teethHeight * 0.5, 48]} />
          <meshBasicMaterial
            color="#8B4513"
            transparent
            opacity={Math.min(rustCoverage * 0.85, 0.85)}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}

interface SourceParticlesProps {
  active: boolean
  position: [number, number, number]
  boost: number
}

function SourceParticles({ active, position, boost }: SourceParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const opacity = useRef(0)
  const particleCount = 120

  const { positions, velocities, lifetimes } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    const vel = new Float32Array(particleCount * 3)
    const life = new Float32Array(particleCount)
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = position[0]
      pos[i * 3 + 1] = position[1]
      pos[i * 3 + 2] = position[2]
      vel[i * 3] = (Math.random() - 0.5) * 0.08
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.08
      vel[i * 3 + 2] = 0.02 + Math.random() * 0.06
      life[i] = Math.random()
    }
    return { positions: pos, velocities: vel, lifetimes: life }
  }, [position])

  useFrame((_, delta) => {
    const targetOpacity = (active ? 1 : 0) * (0.4 + boost * 0.6)
    opacity.current += (targetOpacity - opacity.current) * Math.min(delta * 4, 1)

    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array
    const mat = pointsRef.current.material as THREE.PointsMaterial
    if (mat) mat.opacity = opacity.current * 0.85

    for (let i = 0; i < particleCount; i++) {
      lifetimes[i] += delta * (active ? 2.2 : 0.5)
      if (lifetimes[i] > 1) {
        lifetimes[i] = 0
        if (active) {
          posArray[i * 3] = position[0] + (Math.random() - 0.5) * 0.1
          posArray[i * 3 + 1] = position[1] + (Math.random() - 0.5) * 0.1
          posArray[i * 3 + 2] = position[2]
        }
      } else if (active) {
        posArray[i * 3] += velocities[i * 3] * (0.8 + boost * 0.8)
        posArray[i * 3 + 1] += velocities[i * 3 + 1] * (0.8 + boost * 0.8)
        posArray[i * 3 + 2] += velocities[i * 3 + 2] * (0.8 + boost * 0.8)
      }
    }
    posAttr.needsUpdate = true
  })

  return (
    <Points
      ref={pointsRef}
      positions={positions}
      stride={3}
      frustumCulled={false}
    >
      <PointMaterial
        transparent
        color="#FFE066"
        size={0.055}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={opacity.current * 0.85}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  )
}

function GridFloor({ size }: { size: number }) {
  const half = size / 2
  const cellSize = 1.1

  return (
    <group>
      <mesh position={[0, 0, -0.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size * cellSize + 0.8, size * cellSize + 0.8]} />
        <meshBasicMaterial color="#3E2723" />
      </mesh>

      <mesh position={[0, 0, -0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size * cellSize + 0.4, size * cellSize + 0.4]} />
        <meshBasicMaterial color="#4A2C1E" />
      </mesh>

      {Array.from({ length: size + 1 }).map((_, i) => {
        const offset = (i - half) * cellSize - cellSize / 2
        return (
          <group key={`grid-${i}`}>
            <mesh position={[offset, 0, -0.03]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
              <planeGeometry args={[size * cellSize, 0.008]} />
              <meshBasicMaterial color="#C5A55A" transparent opacity={0.55} />
            </mesh>
            <mesh position={[0, offset, -0.03]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[size * cellSize, 0.008]} />
              <meshBasicMaterial color="#C5A55A" transparent opacity={0.55} />
            </mesh>
          </group>
        )
      })}
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
  victoryProgress: number
  onVictorySound?: () => void
}

export default function GameBoard({
  gears, size, connectedPath, errorPositions, hintedGearId, rustCoverage,
  onGearClick, isVictory, victoryProgress, onVictorySound
}: GameBoardProps) {
  const [animatingGears, setAnimatingGears] = useState<Map<string, { order: number }>>(new Map())
  const [animTrigger, setAnimTrigger] = useState(0)

  const sourceGear = gears.find(g => g.isSource)
  const sourceActive = sourceGear ? animatingGears.has(sourceGear.id) : false
  const isSpinning = animatingGears.size > 0

  const cellSize = 1.1
  const centerOffset = (size - 1) / 2
  const sourcePosition: [number, number, number] = sourceGear
    ? [
        (sourceGear.col - centerOffset) * cellSize,
        (centerOffset - sourceGear.row) * cellSize,
        0.25
      ]
    : [0, 0, 0]

  const handleGearClick = useCallback((gear: Gear) => {
    if (gear.isEmpty || gear.isSource || isVictory) return

    const linked = getLinkedGears(gear, gears)
    const ordered = new Map<string, { order: number }>()

    const visited = new Set<string>([gear.id])
    const queue: { id: string; depth: number }[] = [{ id: gear.id, depth: 0 }]
    ordered.set(gear.id, { order: 0 })

    while (queue.length > 0) {
      const curr = queue.shift()!
      const currentGear = gears.find(g => g.id === curr.id)
      if (!currentGear) continue

      const neighbors = linked.filter(g => !visited.has(g.id))
      for (const n of neighbors) {
        visited.add(n.id)
        ordered.set(n.id, { order: curr.depth + 1 })
        queue.push({ id: n.id, depth: curr.depth + 1 })
      }
    }

    playGearSound(1 + linked.length * 0.08)
    setAnimatingGears(ordered)
    setAnimTrigger(t => t + 1)

    setTimeout(() => {
      onGearClick(gear)
    }, 50)

    setTimeout(() => {
      setAnimatingGears(new Map())
    }, 500 + linked.length * 60)
  }, [gears, isVictory, onGearClick])

  const victorySoundFired = useRef(false)
  useEffect(() => {
    if (isVictory && victoryProgress > 0.05 && !victorySoundFired.current) {
      victorySoundFired.current = true
      playVictorySound()
      onVictorySound?.()
    }
    if (!isVictory) {
      victorySoundFired.current = false
    }
  }, [isVictory, victoryProgress, onVictorySound])

  return (
    <Canvas
      camera={{ position: [0, 0, size * 1.3 + 2], fov: 42 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#3E2723']} />
      <fog attach="fog" args={['#2E1B0E', size * 1.2, size * 2.2]} />

      <ambientLight intensity={0.55} color="#FFF3DC" />
      <directionalLight position={[5, 5, 7]} intensity={0.9} color="#FFF8E1" castShadow />
      <pointLight position={[-size * 0.5, -size * 0.3, size * 0.8]} intensity={0.5} color="#FFD166" />
      <pointLight position={[size * 0.6, size * 0.4, size * 0.6]} intensity={0.35} color="#FFB347" />

      <GridFloor size={size} />

      {gears.map(gear => {
        const isHighlighted = connectedPath.some(g => g.id === gear.id)
        const isError = errorPositions.some(p => p.row === gear.row && p.col === gear.col)
        const isHinted = hintedGearId === gear.id

        const animInfo = animatingGears.get(gear.id)
        const isAnimating = !!animInfo
        const animDelay = (animInfo?.order ?? 0) * 0.05

        const isVictoryAnimating = isVictory && isHighlighted
        const victoryOrder = connectedPath.findIndex(g => g.id === gear.id)
        const victoryDelay = victoryOrder >= 0 ? victoryOrder * 0.08 : 0

        return (
          <GearMesh
            key={gear.id}
            gear={gear}
            isHighlighted={isHighlighted}
            isError={isError}
            isHinted={isHinted}
            rustCoverage={rustCoverage}
            isAnimating={isAnimating}
            animDelay={animDelay}
            isVictoryAnimating={isVictoryAnimating}
            victoryDelay={victoryDelay}
            victoryProgress={victoryProgress}
            onClick={handleGearClick}
          />
        )
      })}

      {sourceGear && (
        <SourceParticles
          active={sourceActive || isVictory}
          position={sourcePosition}
          boost={isSpinning ? 0.7 : 0.3}
        />
      )}
    </Canvas>
  )
}
