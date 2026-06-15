import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useTrailStore } from '../store/trailStore'
import { projectTrailToScene } from '../parser/terrainLoader'
import type { TerrainData, TrailPoint } from '../store/trailStore'

interface TerrainMeshProps {
  terrainData: TerrainData
}

function TerrainMesh({ terrainData }: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const { geometry, colors } = useMemo(() => {
    const { vertices, width, height, minEle, maxEle } = terrainData
    const geo = new THREE.PlaneGeometry(20, 20, width - 1, height - 1)
    geo.rotateX(-Math.PI / 2)

    const positions = geo.attributes.position
    const colorArray = new Float32Array(positions.count * 3)

    const eleRange = maxEle - minEle || 1

    for (let i = 0; i < positions.count; i++) {
      const vertex = vertices[i]
      if (vertex) {
        const normalizedEle = (vertex.z - minEle) / eleRange
        const scaledZ = normalizedEle * 5

        positions.setZ(i, scaledZ)

        const lowColor = new THREE.Color('#4caf50')
        const highColor = new THREE.Color('#8d6e63')
        const color = lowColor.clone().lerp(highColor, normalizedEle)

        colorArray[i * 3] = color.r
        colorArray[i * 3 + 1] = color.g
        colorArray[i * 3 + 2] = color.b
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3))
    geo.computeVertexNormals()

    return { geometry: geo, colors: colorArray }
  }, [terrainData])

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
}

interface TrailLineProps {
  trailPoints: TrailPoint[]
  terrainData: TerrainData
}

function TrailLine({ trailPoints, terrainData }: TrailLineProps) {
  const lineRef = useRef<THREE.Line>(null)

  const geometry = useMemo(() => {
    const scenePoints = projectTrailToScene(trailPoints, terrainData)
    const positions = new Float32Array(scenePoints.length * 3)
    const colors = new Float32Array(scenePoints.length * 3)

    for (let i = 0; i < scenePoints.length; i++) {
      positions[i * 3] = scenePoints[i].x
      positions[i * 3 + 1] = scenePoints[i].z + 0.05
      positions[i * 3 + 2] = scenePoints[i].y

      const t = i / (scenePoints.length - 1 || 1)
      const startColor = new THREE.Color('#00e676')
      const endColor = new THREE.Color('#00bcd4')
      const color = startColor.clone().lerp(endColor, t)

      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return geo
  }, [trailPoints, terrainData])

  return (
    <group>
      <line ref={lineRef} geometry={geometry}>
        <lineBasicMaterial vertexColors linewidth={2} />
      </line>
      <line geometry={geometry} position={[0, 0.02, 0]}>
        <lineBasicMaterial vertexColors transparent opacity={0.3} />
      </line>
    </group>
  )
}

interface PlaybackMarkerProps {
  trailPoints: TrailPoint[]
  terrainData: TerrainData
  currentIndex: number
}

function PlaybackMarker({ trailPoints, terrainData, currentIndex }: PlaybackMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const targetPos = useRef(new THREE.Vector3())
  const currentPos = useRef(new THREE.Vector3())

  const scenePoints = useMemo(
    () => projectTrailToScene(trailPoints, terrainData),
    [trailPoints, terrainData]
  )

  useFrame((_, delta) => {
    if (scenePoints.length === 0 || !meshRef.current) return

    const idx = Math.min(Math.max(currentIndex, 0), scenePoints.length - 1)
    const pt = scenePoints[idx]

    targetPos.current.set(pt.x, pt.z + 0.15, pt.y)
    currentPos.current.lerp(targetPos.current, Math.min(delta * 10, 1))

    meshRef.current.position.copy(currentPos.current)
    if (glowRef.current) {
      glowRef.current.position.copy(currentPos.current)
    }
  })

  return (
    <group>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#00e676" transparent opacity={0.3} />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color="#00e676"
          emissive="#00e676"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  )
}

interface SceneContentProps {
  loaded: boolean
}

function SceneContent({ loaded }: SceneContentProps) {
  const trailPoints = useTrailStore((s) => s.trailPoints)
  const terrainData = useTrailStore((s) => s.terrainData)
  const currentIndex = useTrailStore((s) => s.currentIndex)

  if (!loaded || !terrainData || trailPoints.length === 0) {
    return null
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight args={['#87ceeb', '#4caf50', 0.3]} />

      <TerrainMesh terrainData={terrainData} />
      <TrailLine trailPoints={trailPoints} terrainData={terrainData} />
      <PlaybackMarker
        trailPoints={trailPoints}
        terrainData={terrainData}
        currentIndex={currentIndex}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
      />

      <fog attach="fog" args={['#1a237e', 20, 50]} />
    </>
  )
}

export default function TerrainScene() {
  const loaded = useTrailStore((s) => s.loaded)

  return (
    <Canvas
      camera={{ position: [15, 15, 15], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ background: 'linear-gradient(180deg, #1a237e 0%, #0d1452 100%)' }}
    >
      <SceneContent loaded={loaded} />
    </Canvas>
  )
}
