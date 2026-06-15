import React, { useRef, useMemo, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { MirageInfo } from './UIControls'

interface MirageBuilderProps {
  opacity: number
  particleDensity: number
  onMirageClick: (info: MirageInfo) => void
}

interface BuildingData {
  id: string
  name: string
  position: [number, number, number]
  parts: { geo: 'box' | 'cone' | 'cylinder' | 'octahedron'; args: number[]; pos: [number, number, number]; rot: [number, number, number]; scale: [number, number, number] }[]
  color: string
  emissiveColor: string
  luminosity: number
  stability: number
  floatOffset: number
  rotSpeed: number
}

interface ShatterState {
  buildingId: string
  fragments: { pos: THREE.Vector3; vel: THREE.Vector3; rot: THREE.Euler; rotVel: THREE.Vector3; scale: number; geo: 'box' | 'tetra'; color: string }[]
  startTime: number
}

const BUILDING_NAMES = [
  '紫霞阁', '金阙殿', '云隐塔', '幻光宫', '星落楼',
  '碧瑶台', '凌虚阁', '梦虹桥', '浮屠塔', '镜花殿',
  '霜月轩', '凤鸣阁', '龙翔殿', '玉清楼', '天璇塔',
]

function generateBuildings(): BuildingData[] {
  const buildings: BuildingData[] = []
  const count = 12
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
    const radius = 6 + Math.random() * 10
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const height = 2 + Math.random() * 4
    const baseH = 1 + Math.random() * 2
    const topGeo: 'box' | 'cone' | 'octahedron' = ['box', 'cone', 'octahedron'][Math.floor(Math.random() * 3)] as any

    const parts: BuildingData['parts'] = [
      { geo: 'box', args: [1.2, baseH, 1.2], pos: [0, baseH / 2, 0], rot: [0, 0, 0], scale: [1, 1, 1] },
      { geo: 'cylinder', args: [0.5, 0.5, height, 6], pos: [0, baseH + height / 2, 0], rot: [0, 0, 0], scale: [1, 1, 1] },
    ]

    if (topGeo === 'cone') {
      parts.push({ geo: 'cone', args: [0.7, 1.5, 6], pos: [0, baseH + height + 0.75, 0], rot: [0, 0, 0], scale: [1, 1, 1] })
    } else if (topGeo === 'octahedron') {
      parts.push({ geo: 'octahedron', args: [0.6, 0], pos: [0, baseH + height + 0.6, 0], rot: [0, Math.PI / 4, 0], scale: [1, 1, 1] })
    } else {
      parts.push({ geo: 'box', args: [0.8, 0.8, 0.8], pos: [0, baseH + height + 0.4, 0], rot: [0, Math.PI / 4, 0], scale: [1, 1, 1] })
    }

    if (Math.random() > 0.4) {
      parts.push({ geo: 'box', args: [1.8, 0.15, 1.8], pos: [0, baseH, 0], rot: [0, 0, 0], scale: [1, 1, 1] })
    }

    const hue = 0.75 + Math.random() * 0.15
    const color = new THREE.Color().setHSL(hue, 0.6, 0.7)
    const emissiveColor = new THREE.Color().setHSL(hue, 0.8, 0.5)

    buildings.push({
      id: `building-${i}`,
      name: BUILDING_NAMES[i % BUILDING_NAMES.length],
      position: [x, 3 + Math.random() * 2, z],
      parts,
      color: `#${color.getHexString()}`,
      emissiveColor: `#${emissiveColor.getHexString()}`,
      luminosity: +(0.5 + Math.random() * 0.5).toFixed(2),
      stability: +(0.3 + Math.random() * 0.6).toFixed(2),
      floatOffset: Math.random() * Math.PI * 2,
      rotSpeed: 0.1 + Math.random() * 0.2,
    })
  }
  return buildings
}

function MirageBuilding({
  data,
  opacity,
  onShatter,
}: {
  data: BuildingData
  opacity: number
  onShatter: (id: string) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const [destroyed, setDestroyed] = useState(false)

  useFrame((state) => {
    if (!groupRef.current || destroyed) return
    const t = state.clock.elapsedTime
    groupRef.current.position.y = data.position[1] + Math.sin(t * 0.4 + data.floatOffset) * 0.5
    groupRef.current.rotation.y = Math.sin(t * data.rotSpeed * 0.1) * 0.15
  })

  const handleClick = useCallback((e: THREE.Event) => {
    e.stopPropagation()
    if (destroyed) return
    setDestroyed(true)
    onShatter(data.id)
  }, [destroyed, data.id, onShatter])

  if (destroyed) return null

  return (
    <group
      ref={groupRef}
      position={data.position}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {data.parts.map((part, i) => (
        <mesh key={i} position={part.pos} rotation={part.rot} scale={part.scale} castShadow>
          {part.geo === 'box' && <boxGeometry args={part.args as [number, number, number]} />}
          {part.geo === 'cone' && <coneGeometry args={part.args as [number, number, number]} />}
          {part.geo === 'cylinder' && <cylinderGeometry args={part.args as [number, number, number, number]} />}
          {part.geo === 'octahedron' && <octahedronGeometry args={part.args as [number, number]} />}
          <meshStandardMaterial
            color={data.color}
            emissive={data.emissiveColor}
            emissiveIntensity={hovered ? 1.2 : 0.6}
            transparent
            opacity={hovered ? Math.min(opacity + 0.2, 1) : opacity}
            side={THREE.DoubleSide}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  )
}

function ShatterEffect({ state, opacity }: { state: ShatterState; opacity: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const fragmentsRef = useRef<THREE.Mesh[]>([])
  const startTime = useRef(state.startTime)

  useFrame((state2) => {
    if (!groupRef.current) return
    const elapsed = state2.clock.elapsedTime - startTime.current
    const duration = 3.0
    if (elapsed > duration) {
      groupRef.current.visible = false
      return
    }

    fragmentsRef.current.forEach((mesh, i) => {
      if (!mesh) return
      const frag = state.fragments[i]
      mesh.position.copy(frag.pos)
      mesh.position.addScaledVector(frag.vel, elapsed)
      frag.vel.y -= 0.5 * (1 / 60)
      mesh.rotation.x += frag.rotVel.x * 0.016
      mesh.rotation.y += frag.rotVel.y * 0.016
      mesh.rotation.z += frag.rotVel.z * 0.016
      const fadeStart = duration * 0.6
      if (elapsed > fadeStart) {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.opacity = opacity * (1 - (elapsed - fadeStart) / (duration - fadeStart))
      }
    })
  })

  return (
    <group ref={groupRef}>
      {state.fragments.map((frag, i) => (
        <mesh
          key={i}
          ref={el => { if (el) fragmentsRef.current[i] = el }}
          position={frag.pos}
          scale={frag.scale}
        >
          {frag.geo === 'box' ? (
            <boxGeometry args={[0.2, 0.2, 0.2]} />
          ) : (
            <tetrahedronGeometry args={[0.15, 0]} />
          )}
          <meshStandardMaterial
            color={frag.color}
            emissive={frag.color}
            emissiveIntensity={2.0}
            transparent
            opacity={opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function LightDustParticles({ density }: { density: number }) {
  const meshRef = useRef<THREE.Points>(null)
  const count = Math.floor(1500 * density)

  const [positions, offsets] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const off = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50
      pos[i * 3 + 1] = Math.random() * 15 + 2
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50
      off[i] = Math.random() * Math.PI * 2
    }
    return [pos, off]
  }, [count])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    const posAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    for (let i = 0; i < count; i++) {
      arr[i * 3] += Math.sin(t * 0.1 + offsets[i]) * 0.005
      arr[i * 3 + 1] += Math.cos(t * 0.15 + offsets[i]) * 0.003
      arr[i * 3 + 2] += Math.cos(t * 0.12 + offsets[i] * 0.7) * 0.005
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffddaa"
        size={0.08}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

export function MirageBuilder({ opacity, particleDensity, onMirageClick }: MirageBuilderProps) {
  const buildings = useMemo(() => generateBuildings(), [])
  const [shatters, setShatters] = useState<ShatterState[]>([])
  const { clock } = useThree()

  const handleShatter = useCallback((buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId)
    if (!building) return

    onMirageClick({
      name: building.name,
      luminosity: building.luminosity,
      stability: building.stability,
    })

    const fragmentCount = 40
    const fragments: ShatterState['fragments'] = []
    const center = new THREE.Vector3(...building.position)

    for (let i = 0; i < fragmentCount; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.3),
        (Math.random() - 0.5) * 2,
      ).normalize().multiplyScalar(2 + Math.random() * 4)

      fragments.push({
        pos: center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 3, (Math.random() - 0.5) * 1.5)),
        vel: dir,
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        rotVel: new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5),
        scale: 0.3 + Math.random() * 0.5,
        geo: Math.random() > 0.5 ? 'box' : 'tetra',
        color: building.emissiveColor,
      })
    }

    setShatters(prev => [...prev, {
      buildingId,
      fragments,
      startTime: clock.elapsedTime,
    }])
  }, [buildings, onMirageClick, clock])

  return (
    <>
      {buildings.map(b => (
        <MirageBuilding
          key={b.id}
          data={b}
          opacity={opacity}
          onShatter={handleShatter}
        />
      ))}
      {shatters.map(s => (
        <ShatterEffect key={s.buildingId} state={s} opacity={opacity} />
      ))}
      <LightDustParticles density={particleDensity} />
    </>
  )
}
