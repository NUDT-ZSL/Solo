import * as THREE from 'three'
import { useRef, useMemo, useState, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'

export interface DataPoint {
  id: number
  branchLevel: number
  branchAngle: number
  leafSize: number
}

interface BranchNode {
  id: number
  level: number
  start: THREE.Vector3
  end: THREE.Vector3
  radius: number
  length: number
  rotation: number
  parentId: number | null
}

interface LeafData {
  id: number
  position: THREE.Vector3
  size: number
  hue: number
  dataPoint: DataPoint
  branchEnd: THREE.Vector3
  branchAngle: number
}

interface ActiveRipple {
  id: number
  position: THREE.Vector3
  startTime: number
  color: THREE.Color
}

interface RetractingLeaf {
  id: number
  leaf: LeafData
  startTime: number
  startPos: THREE.Vector3
  endPos: THREE.Vector3
}

interface LightPoint {
  id: number
  position: THREE.Vector3
  startTime: number
  startColor: THREE.Color
  endColor: THREE.Color
}

const GROWTH_DURATION = 8.0
const RETRACT_DURATION = 2.0
const RIPPLE_DURATION = 1.0
const LIGHT_DURATION = 1.0
const TRUNK_BROWN = new THREE.Color(0x8B5A2B)
const DARK_BROWN = new THREE.Color(0x4A2F17)

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function generateDataPoints(): DataPoint[] {
  const points: DataPoint[] = []
  for (let i = 0; i < 50; i++) {
    points.push({
      id: i,
      branchLevel: Math.floor(Math.random() * 6),
      branchAngle: Math.random() * 360,
      leafSize: 1 + Math.random() * 9
    })
  }
  points.sort((a, b) => a.branchLevel - b.branchLevel)
  return points
}

function buildTreeStructure(dataPoints: DataPoint[]): {
  branches: BranchNode[]
  leaves: LeafData[]
  totalPolygons: (leafSegments: number) => number
} {
  const branches: BranchNode[] = []
  const leaves: LeafData[] = []

  const trunkHeight = 2.5
  const trunkStart = new THREE.Vector3(0, -1.5, 0)
  const trunkEnd = new THREE.Vector3(0, trunkHeight - 1.5, 0)

  branches.push({
    id: 0,
    level: 0,
    start: trunkStart.clone(),
    end: trunkEnd.clone(),
    radius: 0.12,
    length: trunkHeight,
    rotation: 0,
    parentId: null
  })

  const levelEndpoints: Map<number, THREE.Vector3[]> = new Map()
  levelEndpoints.set(0, [trunkEnd.clone()])
  const levelBranches: Map<number, number[]> = new Map()
  levelBranches.set(0, [0])

  let branchIdCounter = 1

  for (let level = 1; level <= 5; level++) {
    const prevEndpoints = levelEndpoints.get(level - 1) || []
    const prevBranchIds = levelBranches.get(level - 1) || []
    const currentEndpoints: THREE.Vector3[] = []
    const currentBranchIds: number[] = []

    const levelPoints = dataPoints.filter(p => p.branchLevel === level)
    const numBranches = Math.max(2, Math.ceil(levelPoints.length / 3) + prevEndpoints.length)

    for (let pe = 0; pe < prevEndpoints.length; pe++) {
      const parentEnd = prevEndpoints[pe]
      const parentBranchId = prevBranchIds[pe]
      const branchesPerParent = Math.ceil(numBranches / prevEndpoints.length)

      for (let b = 0; b < branchesPerParent; b++) {
        const baseAngle = (pe * branchesPerParent + b) * (360 / numBranches)
        const jitterAngle = (Math.random() - 0.5) * 40
        const angle = baseAngle + jitterAngle
        const angleRad = (angle * Math.PI) / 180
        const pitchAngleRad = ((25 + level * 8 + Math.random() * 15) * Math.PI) / 180

        const branchLength = (1.2 - level * 0.15) * (0.8 + Math.random() * 0.4)
        const dx = Math.cos(angleRad) * Math.sin(pitchAngleRad) * branchLength
        const dy = Math.cos(pitchAngleRad) * branchLength
        const dz = Math.sin(angleRad) * Math.sin(pitchAngleRad) * branchLength

        const endPos = new THREE.Vector3(
          parentEnd.x + dx,
          parentEnd.y + dy,
          parentEnd.z + dz
        )

        const branchRadius = 0.06 * (6 - level) * 0.55

        const branch: BranchNode = {
          id: branchIdCounter++,
          level,
          start: parentEnd.clone(),
          end: endPos,
          radius: branchRadius,
          length: branchLength,
          rotation: angle,
          parentId: parentBranchId
        }
        branches.push(branch)
        currentEndpoints.push(endPos)
        currentBranchIds.push(branch.id)
      }
    }

    levelEndpoints.set(level, currentEndpoints)
    levelBranches.set(level, currentBranchIds)
  }

  for (let i = 0; i < dataPoints.length; i++) {
    const dp = dataPoints[i]
    const level = dp.branchLevel
    const endpoints = levelEndpoints.get(level) || levelEndpoints.get(Math.max(0, level - 1)) || [trunkEnd]
    const epIndex = i % endpoints.length
    const attachPoint = endpoints[epIndex]

    const leafAngleRad = (dp.branchAngle * Math.PI) / 180
    const leafDist = 0.15 + dp.leafSize * 0.03
    const leafPitch = ((30 + Math.random() * 40) * Math.PI) / 180

    const leafPos = new THREE.Vector3(
      attachPoint.x + Math.cos(leafAngleRad) * Math.sin(leafPitch) * leafDist,
      attachPoint.y + Math.cos(leafPitch) * leafDist,
      attachPoint.z + Math.sin(leafAngleRad) * Math.sin(leafPitch) * leafDist
    )

    leaves.push({
      id: i,
      position: leafPos,
      size: 0.04 + (dp.leafSize / 10) * 0.18,
      hue: dp.branchAngle / 360,
      dataPoint: dp,
      branchEnd: attachPoint.clone(),
      branchAngle: dp.branchAngle
    })
  }

  const totalPolygons = (leafSegments: number) => {
    let count = 0
    for (const b of branches) {
      count += 8 * 2 * 2
    }
    count += leaves.length * leafSegments
    return count
  }

  return { branches, leaves, totalPolygons }
}

export interface TreeSystemProps {
  leafSegments: number
  onPolygonCount: (count: number) => void
}

export function TreeSystem({ leafSegments, onPolygonCount }: TreeSystemProps) {
  const groupRef = useRef<THREE.Group>(null)
  const leavesGroupRef = useRef<THREE.Group>(null)
  const growthProgress = useRef(0)
  const growthStartRef = useRef<number | null>(null)
  const meshRefs = useRef<Map<number, THREE.Mesh>>(new Map())
  const origColorsRef = useRef<Map<number, THREE.Color>>(new Map())

  const [ripples, setRipples] = useState<ActiveRipple[]>([])
  const [retracting, setRetracting] = useState<RetractingLeaf[]>([])
  const [lightPoints, setLightPoints] = useState<LightPoint[]>([])
  const [rippleIdCounter, setRippleIdCounter] = useState(0)
  const [lightIdCounter, setLightIdCounter] = useState(0)
  const [retractIdCounter, setRetractIdCounter] = useState(0)

  const { branches, leaves, totalPolygons } = useMemo(() => {
    const dp = generateDataPoints()
    return buildTreeStructure(dp)
  }, [])

  useEffect(() => {
    onPolygonCount(totalPolygons(leafSegments))
  }, [leafSegments, totalPolygons, onPolygonCount])

  const handleLeafClick = useCallback((leaf: LeafData, event: any) => {
    event.stopPropagation()
    const now = performance.now() / 1000

    const mesh = meshRefs.current.get(leaf.id)
    if (mesh) {
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (mat && origColorsRef.current.has(leaf.id)) {
        const orig = origColorsRef.current.get(leaf.id)!
        mat.color.copy(orig.clone().multiplyScalar(0.6))
        setTimeout(() => {
          if (mat) mat.color.copy(orig)
        }, 300)
      }
    }

    const leafColor = new THREE.Color().setHSL(leaf.hue, 0.75, 0.55)
    setRipples(prev => [...prev, {
      id: rippleIdCounter,
      position: leaf.position.clone(),
      startTime: now,
      color: leafColor.clone()
    }])
    setRippleIdCounter(c => c + 1)

    setRetracting(prev => [...prev, {
      id: retractIdCounter,
      leaf,
      startTime: now,
      startPos: leaf.position.clone(),
      endPos: new THREE.Vector3(0, -1.4, 0)
    }])
    setRetractIdCounter(c => c + 1)

    const startColor = leafColor.clone()
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        setLightPoints(prev => [...prev, {
          id: lightIdCounter + i,
          position: leaf.position.clone(),
          startTime: performance.now() / 1000,
          startColor: startColor.clone(),
          endColor: TRUNK_BROWN.clone()
        }])
      }, i * 80)
    }
    setLightIdCounter(c => c + 12)
  }, [rippleIdCounter, retractIdCounter, lightIdCounter])

  useFrame((state) => {
    const now = performance.now() / 1000

    if (growthStartRef.current === null) {
      growthStartRef.current = now
    }
    const elapsed = now - growthStartRef.current
    growthProgress.current = Math.min(1, easeInOutCubic(Math.min(1, elapsed / GROWTH_DURATION)))

    if (groupRef.current) {
      groupRef.current.scale.setScalar(growthProgress.current)
    }

    setRipples(prev => prev.filter(r => now - r.startTime < RIPPLE_DURATION))
    setRetracting(prev => prev.filter(r => now - r.startTime < RETRACT_DURATION))
    setLightPoints(prev => prev.filter(l => now - l.startTime < LIGHT_DURATION))
  })

  const renderBranch = (branch: BranchNode) => {
    const direction = new THREE.Vector3().subVectors(branch.end, branch.start)
    const length = direction.length()
    const midPoint = new THREE.Vector3().addVectors(branch.start, branch.end).multiplyScalar(0.5)
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    )
    const t = branch.level / 5
    const color = TRUNK_BROWN.clone().lerp(DARK_BROWN, t)

    return (
      <mesh
        key={`branch-${branch.id}`}
        position={midPoint}
        quaternion={quaternion}
      >
        <cylinderGeometry args={[branch.radius * 0.7, branch.radius, length, 8]} />
        <meshStandardMaterial
          color={color}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
    )
  }

  const renderLeaf = (leaf: LeafData) => {
    const color = new THREE.Color().setHSL(leaf.hue, 0.78, 0.58)
    origColorsRef.current.set(leaf.id, color.clone())

    const angleRad = (leaf.branchAngle * Math.PI) / 180
    const quaternion = new THREE.Quaternion()
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angleRad)
    quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0), Math.PI * 0.2
    ))

    return (
      <mesh
        key={`leaf-${leaf.id}`}
        position={leaf.position}
        quaternion={quaternion}
        ref={(el) => { if (el) meshRefs.current.set(leaf.id, el) }}
        onClick={(e) => handleLeafClick(leaf, e)}
        onPointerOver={(e) => { document.body.style.cursor = 'pointer' }}
        onPointerOut={(e) => { document.body.style.cursor = 'grab' }}
      >
        <circleGeometry args={[leaf.size, leafSegments]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.1}
          side={THREE.DoubleSide}
          transparent
          opacity={0.95}
        />
      </mesh>
    )
  }

  return (
    <group ref={groupRef}>
      <group>
        {branches.map(b => renderBranch(b))}
      </group>
      <group ref={leavesGroupRef}>
        {leaves.map(l => renderLeaf(l))}
      </group>

      {ripples.map(r => (
        <Ripple key={`ripple-${r.id}`} ripple={r} />
      ))}

      {retracting.map(rt => (
        <RetractingLeafMesh key={`retract-${rt.id}`} retract={rt} />
      ))}

      {lightPoints.map(lp => (
        <LightParticle key={`light-${lp.id}`} light={lp} />
      ))}

      <mesh position={[0, -1.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshStandardMaterial
          color={0x1a0f08}
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>
    </group>
  )
}

function Ripple({ ripple }: { ripple: ActiveRipple }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    const now = performance.now() / 1000
    const progress = Math.min(1, (now - ripple.startTime) / RIPPLE_DURATION)
    const radius = progress * 3
    const scale = radius / 0.05
    meshRef.current.scale.setScalar(scale)
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.6 * (1 - progress)
  })

  const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)

  return (
    <mesh
      ref={meshRef}
      position={ripple.position}
      quaternion={quaternion}
      renderOrder={1000}
    >
      <ringGeometry args={[0.95, 1, 64]} />
      <meshBasicMaterial
        color={0xFFD700}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function RetractingLeafMesh({ retract }: { retract: RetractingLeaf }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const startColor = useMemo(() =>
    new THREE.Color().setHSL(retract.leaf.hue, 0.78, 0.58), [retract])

  useFrame((state) => {
    if (!meshRef.current) return
    const now = performance.now() / 1000
    const rawProgress = Math.min(1, (now - retract.startTime) / RETRACT_DURATION)
    const progress = easeInOutCubic(rawProgress)

    const t = progress
    const totalAngle = Math.PI * 5 * (1 - t)
    const radius = (1 - t) * 1.2

    const startToEnd = new THREE.Vector3().subVectors(retract.endPos, retract.startPos)
    const basePos = retract.startPos.clone().add(startToEnd.clone().multiplyScalar(t))

    const perp1 = new THREE.Vector3(1, 0, 0)
    const perp2 = new THREE.Vector3(0, 0, 1)

    const offset = new THREE.Vector3(
      perp1.x * Math.cos(totalAngle + retract.leaf.id) * radius +
      perp2.x * Math.sin(totalAngle + retract.leaf.id) * radius,
      Math.sin(totalAngle * 1.3) * radius * 0.3,
      perp1.z * Math.cos(totalAngle + retract.leaf.id) * radius +
      perp2.z * Math.sin(totalAngle + retract.leaf.id) * radius
    )

    meshRef.current.position.copy(basePos.add(offset))
    meshRef.current.rotation.z += 0.3
    meshRef.current.rotation.x += 0.2

    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    const shrink = 1 - progress * 0.7
    meshRef.current.scale.setScalar(shrink)
    mat.opacity = 1 - progress * 0.6
    mat.color.copy(startColor.clone().lerp(TRUNK_BROWN, progress * 0.5))
  })

  return (
    <mesh ref={meshRef} renderOrder={999}>
      <circleGeometry args={[retract.leaf.size, 24]} />
      <meshStandardMaterial
        color={startColor}
        side={THREE.DoubleSide}
        transparent
        opacity={1}
        emissive={startColor}
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}

function LightParticle({ light }: { light: LightPoint }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const startPosRef = useRef<THREE.Vector3 | null>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    const now = performance.now() / 1000
    const rawProgress = Math.min(1, (now - light.startTime) / LIGHT_DURATION)
    const progress = easeInOutCubic(rawProgress)

    if (!startPosRef.current) {
      startPosRef.current = light.position.clone()
    }

    const endPos = new THREE.Vector3(0, -1.4, 0)
    const toEnd = new THREE.Vector3().subVectors(endPos, startPosRef.current)
    const spiral = Math.sin(progress * Math.PI * 4) * (1 - progress) * 0.3
    const pos = startPosRef.current.clone().add(toEnd.clone().multiplyScalar(progress))
    pos.x += Math.cos(progress * Math.PI * 6) * spiral
    pos.z += Math.sin(progress * Math.PI * 6) * spiral

    meshRef.current.position.copy(pos)

    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    const currentColor = light.startColor.clone().lerp(light.endColor, progress)
    mat.color.copy(currentColor)
    mat.opacity = (1 - progress) * 0.9
    const scale = 0.15 * (1 - progress * 0.5)
    meshRef.current.scale.setScalar(scale)
  })

  return (
    <mesh ref={meshRef} renderOrder={1001}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial
        color={light.startColor}
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
