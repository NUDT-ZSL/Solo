import { useMemo, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
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
  const wireframeRef = useRef<THREE.LineSegments>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const wireframeMatRef = useRef<THREE.LineBasicMaterial>(null)

  const { geometry, wireframeGeometry } = useMemo(() => {
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

    const edges = new THREE.EdgesGeometry(geo)

    return { geometry: geo, wireframeGeometry: edges }
  }, [terrainData])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (t < 1.5 && meshRef.current && wireframeRef.current) {
      const progress = Math.min(1, t / 1.5)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const scale = 0.1 + easeProgress * 0.9
      const rotation = easeProgress * Math.PI * 2

      meshRef.current.scale.setScalar(scale)
      meshRef.current.rotation.y = rotation
      wireframeRef.current.scale.setScalar(scale)
      wireframeRef.current.rotation.y = rotation

      if (materialRef.current) {
        materialRef.current.opacity = Math.max(0, (t - 1) / 0.5)
        materialRef.current.transparent = true
      }
      if (wireframeMatRef.current) {
        wireframeMatRef.current.opacity = Math.max(0, 1 - (t - 1) / 0.5)
        wireframeMatRef.current.transparent = true
      }
    } else if (t >= 1.5) {
      if (meshRef.current) {
        meshRef.current.scale.setScalar(1)
        meshRef.current.rotation.y = 0
      }
      if (wireframeRef.current) {
        wireframeRef.current.scale.setScalar(1)
        wireframeRef.current.rotation.y = 0
      }
      if (materialRef.current) {
        materialRef.current.opacity = 1
        materialRef.current.transparent = false
      }
      if (wireframeMatRef.current) {
        wireframeMatRef.current.opacity = 0
        wireframeMatRef.current.transparent = true
      }
    }
  })

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          ref={materialRef}
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.8}
          metalness={0.1}
          transparent
          opacity={0}
        />
      </mesh>
      <lineSegments ref={wireframeRef} geometry={wireframeGeometry}>
        <lineBasicMaterial
          ref={wireframeMatRef}
          color="#00e676"
          transparent
          opacity={1}
        />
      </lineSegments>
    </group>
  )
}

interface TrailLineProps {
  trailPoints: TrailPoint[]
  terrainData: TerrainData
}

function TrailLine({ trailPoints, terrainData }: TrailLineProps) {
  const scenePoints = useMemo(
    () => projectTrailToScene(trailPoints, terrainData),
    [trailPoints, terrainData]
  )

  const points3D = useMemo(() => {
    return scenePoints.map((p) => new THREE.Vector3(p.x, p.z + 0.05, p.y))
  }, [scenePoints])

  const lineObject = useMemo(() => {
    const positions = new Float32Array(points3D.length * 3)
    const colors = new Float32Array(points3D.length * 3)

    for (let i = 0; i < points3D.length; i++) {
      positions[i * 3] = points3D[i].x
      positions[i * 3 + 1] = points3D[i].y
      positions[i * 3 + 2] = points3D[i].z

      const t = i / (points3D.length - 1 || 1)
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

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
      transparent: true,
      opacity: 1,
    })

    return new THREE.Line(geo, mat)
  }, [points3D])

  const glowLineObject = useMemo(() => {
    const positions = new Float32Array(points3D.length * 3)
    const colors = new Float32Array(points3D.length * 3)

    for (let i = 0; i < points3D.length; i++) {
      positions[i * 3] = points3D[i].x
      positions[i * 3 + 1] = points3D[i].y + 0.02
      positions[i * 3 + 2] = points3D[i].z

      const t = i / (points3D.length - 1 || 1)
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

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 4,
      transparent: true,
      opacity: 0.3,
    })

    return new THREE.Line(geo, mat)
  }, [points3D])

  return (
    <group>
      <primitive object={glowLineObject} />
      <primitive object={lineObject} />
    </group>
  )
}

interface PlaybackMarkerProps {
  trailPoints: TrailPoint[]
  terrainData: TerrainData
  currentIndex: number
}

function PlaybackMarker({ trailPoints, terrainData, currentIndex }: PlaybackMarkerProps) {
  const markerGroup = useRef<THREE.Group>(null)
  const targetPos = useRef(new THREE.Vector3())
  const currentPos = useRef(new THREE.Vector3())
  const smoothIndex = useRef(currentIndex)

  const scenePoints = useMemo(
    () => projectTrailToScene(trailPoints, terrainData),
    [trailPoints, terrainData]
  )

  useEffect(() => {
    smoothIndex.current = currentIndex
  }, [currentIndex])

  useFrame((state, delta) => {
    if (scenePoints.length === 0 || !markerGroup.current) return

    smoothIndex.current += (currentIndex - smoothIndex.current) * Math.min(1, delta / 0.3)

    const floatIdx = smoothIndex.current
    const idx0 = Math.floor(Math.max(0, floatIdx))
    const idx1 = Math.ceil(Math.min(scenePoints.length - 1, floatIdx))
    const t = floatIdx - idx0

    const p0 = scenePoints[Math.max(0, Math.min(idx0, scenePoints.length - 1))]
    const p1 = scenePoints[Math.max(0, Math.min(idx1, scenePoints.length - 1))]

    const x = p0.x + (p1.x - p0.x) * t
    const z = p0.z + (p1.z - p0.z) * t
    const y = p0.y + (p1.y - p0.y) * t

    targetPos.current.set(x, z + 0.15, y)
    currentPos.current.lerp(targetPos.current, Math.min(1, delta / 0.3))
    markerGroup.current.position.copy(currentPos.current)
  })

  if (scenePoints.length === 0) return null

  return (
    <group ref={markerGroup}>
      <mesh>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshBasicMaterial color="#00e676" transparent opacity={0.15} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshBasicMaterial color="#00bcd4" transparent opacity={0.3} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.1, 24, 24]} />
        <meshStandardMaterial
          color="#00e676"
          emissive="#00e676"
          emissiveIntensity={2}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
      <pointLight color="#00e676" intensity={0.8} distance={2} />
    </group>
  )
}

interface CameraSetupProps {
  loaded: boolean
}

function CameraSetup({ loaded }: CameraSetupProps) {
  const { camera } = useThree()
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (loaded && !hasAnimated.current) {
      hasAnimated.current = true
      const startPos = new THREE.Vector3(0, 2, 0.1)
      const endPos = new THREE.Vector3(15, 15, 15)
      const start = performance.now()
      const duration = 1500

      const anim = () => {
        const t = Math.min(1, (performance.now() - start) / duration)
        const ease = 1 - Math.pow(1 - t, 3)
        camera.position.lerpVectors(startPos, endPos, ease)
        camera.lookAt(0, 0, 0)
        if (t < 1) requestAnimationFrame(anim)
      }
      requestAnimationFrame(anim)
    }
  }, [loaded, camera])

  return null
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
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <hemisphereLight args={['#87ceeb', '#4caf50', 0.4]} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00bcd4" />

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
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0, 0]}
      />

      <CameraSetup loaded={loaded} />

      <fog attach="fog" args={['#1a237e', 25, 60]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0d1452" />
      </mesh>
    </>
  )
}

export default function TerrainScene() {
  const loaded = useTrailStore((s) => s.loaded)

  return (
    <Canvas
      shadows
      camera={{ position: [0, 2, 0.1], fov: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        background: 'linear-gradient(180deg, #1a237e 0%, #0d1452 60%, #050826 100%)',
      }}
    >
      <SceneContent loaded={loaded} />
    </Canvas>
  )
}
