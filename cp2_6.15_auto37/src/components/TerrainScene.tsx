import { useMemo, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line as ThreeLine } from '@react-three/drei'
import * as THREE from 'three'
import { useTrailStore } from '../store/trailStore'
import { projectTrailToScene } from '../parser/terrainLoader'
import type { TerrainData, TrailPoint } from '../store/trailStore'

interface TerrainMeshProps {
  terrainData: TerrainData
  showSkeleton: boolean
}

function TerrainMesh({ terrainData, showSkeleton }: TerrainMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const wireframeRef = useRef<THREE.LineSegments>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const wireframeMatRef = useRef<THREE.LineBasicMaterial>(null)
  const [skeletonProgress, setSkeletonProgress] = useState(0)
  const [fadeProgress, setFadeProgress] = useState(0)

  useEffect(() => {
    if (showSkeleton) {
      setSkeletonProgress(0)
      setFadeProgress(0)
      const start = performance.now()
      const anim = () => {
        const t = (performance.now() - start) / 1500
        if (t < 1) {
          setSkeletonProgress(t)
          requestAnimationFrame(anim)
        } else {
          setSkeletonProgress(1)
          const fadeStart = performance.now()
          const fadeAnim = () => {
            const ft = (performance.now() - fadeStart) / 500
            if (ft < 1) {
              setFadeProgress(ft)
              requestAnimationFrame(fadeAnim)
            } else {
              setFadeProgress(1)
            }
          }
          requestAnimationFrame(fadeAnim)
        }
      }
      requestAnimationFrame(anim)
    }
  }, [showSkeleton, terrainData])

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

  useFrame(() => {
    if (meshRef.current) {
      const scale = showSkeleton ? 0.1 + skeletonProgress * 0.9 : 1
      const rotation = showSkeleton ? skeletonProgress * Math.PI * 2 : 0
      meshRef.current.scale.setScalar(scale)
      meshRef.current.rotation.y = rotation
    }
    if (wireframeRef.current) {
      const scale = showSkeleton ? 0.1 + skeletonProgress * 0.9 : 1
      const rotation = showSkeleton ? skeletonProgress * Math.PI * 2 : 0
      wireframeRef.current.scale.setScalar(scale)
      wireframeRef.current.rotation.y = rotation
    }
    if (materialRef.current) {
      materialRef.current.opacity = fadeProgress
      materialRef.current.transparent = fadeProgress < 1
    }
    if (wireframeMatRef.current) {
      const targetOpacity = showSkeleton ? (1 - fadeProgress) : 0
      wireframeMatRef.current.opacity = Math.max(0, targetOpacity)
      wireframeMatRef.current.transparent = true
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

  const colors = useMemo(() => {
    return scenePoints.map((_, i) => {
      const t = i / (scenePoints.length - 1 || 1)
      const startColor = new THREE.Color('#00e676')
      const endColor = new THREE.Color('#00bcd4')
      return startColor.clone().lerp(endColor, t)
    })
  }, [scenePoints])

  const lineGeometry = useMemo(() => {
    const positions = new Float32Array(points3D.length * 3)
    const vertexColors = new Float32Array(points3D.length * 3)

    for (let i = 0; i < points3D.length; i++) {
      positions[i * 3] = points3D[i].x
      positions[i * 3 + 1] = points3D[i].y
      positions[i * 3 + 2] = points3D[i].z

      const color = colors[i]
      vertexColors[i * 3] = color.r
      vertexColors[i * 3 + 1] = color.g
      vertexColors[i * 3 + 2] = color.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3))
    return geo
  }, [points3D, colors])

  const mainLine = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
      transparent: true,
      opacity: 1,
    })
    return new THREE.Line(lineGeometry, mat)
  }, [lineGeometry])

  const glowLine = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 4,
      transparent: true,
      opacity: 0.25,
    })
    const line = new THREE.Line(lineGeometry, mat)
    line.position.y = 0.05
    return line
  }, [lineGeometry])

  return (
    <group>
      <primitive object={glowLine} />
      <primitive object={mainLine} />
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
  const haloRef = useRef<THREE.Mesh>(null)
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
    if (scenePoints.length === 0) return

    smoothIndex.current += (currentIndex - smoothIndex.current) * Math.min(1, delta / 0.3)

    const idx = Math.min(Math.max(Math.round(smoothIndex.current), 0), scenePoints.length - 1)
    const pt = scenePoints[idx]

    targetPos.current.set(pt.x, pt.z + 0.15, pt.y)
    currentPos.current.lerp(targetPos.current, Math.min(delta / 0.3, 1))

    if (meshRef.current) {
      meshRef.current.position.copy(currentPos.current)
      meshRef.current.rotation.y += delta * 2
    }
    if (glowRef.current) {
      glowRef.current.position.copy(currentPos.current)
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15
      glowRef.current.scale.setScalar(pulse)
    }
    if (haloRef.current) {
      haloRef.current.position.copy(currentPos.current)
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.25
      haloRef.current.scale.setScalar(pulse)
      const mat = haloRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.3 * (1 - Math.abs(Math.sin(state.clock.elapsedTime * 2)) * 0.5)
    }
  })

  if (scenePoints.length === 0) return null

  return (
    <group>
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#00bcd4" transparent opacity={0.3} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#00e676" transparent opacity={0.4} />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color="#00e676"
          emissive="#00e676"
          emissiveIntensity={1.2}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>
    </group>
  )
}

interface CameraAnimatorProps {
  loaded: boolean
}

function CameraAnimator({ loaded }: CameraAnimatorProps) {
  const { camera } = useThree()
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (loaded && !hasAnimated.current) {
      hasAnimated.current = true
      const startPos = camera.position.clone()
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
  const controlsRef = useRef<any>(null)

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

      <TerrainMesh terrainData={terrainData} showSkeleton={loaded} />
      <TrailLine trailPoints={trailPoints} terrainData={terrainData} />
      <PlaybackMarker
        trailPoints={trailPoints}
        terrainData={terrainData}
        currentIndex={currentIndex}
      />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0, 0]}
      />

      <CameraAnimator loaded={loaded} />

      <fog attach="fog" args={['#1a237e', 25, 60]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
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
      camera={{ position: [0, 0, 1], fov: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ background: 'linear-gradient(180deg, #1a237e 0%, #0d1452 60%, #050826 100%)' }}
    >
      <SceneContent loaded={loaded} />
    </Canvas>
  )
}
