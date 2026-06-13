import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'

export interface SoundSource {
  id: string
  position: { x: number; y: number; z: number }
  color: string
  volume: number
}

interface SceneProps {
  sources: SoundSource[]
  onAddSource: (position: { x: number; y: number; z: number }) => void
  onMoveSource: (id: string, position: { x: number; y: number; z: number }) => void
  onRemoveSource: (id: string) => void
  deletingIds: string[]
}

function ListenerSphere() {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15
    }
    if (glowRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05
      glowRef.current.scale.set(s, s, s)
    }
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color="#6366f1"
          transparent
          opacity={0.4}
          emissive="#6366f1"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

interface SourceSphereProps {
  source: SoundSource
  isDeleting: boolean
  onMove: (id: string, position: { x: number; y: number; z: number }) => void
  onDeleteComplete: (id: string) => void
}

function SourceSphere({ source, isDeleting, onMove, onDeleteComplete }: SourceSphereProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const [isDragging, setIsDragging] = useState(false)
  const scaleRef = useRef(0)
  const glowIntensityRef = useRef(1.5)
  const animDoneRef = useRef(false)
  const deletingRef = useRef(false)
  const [renderKey, setRenderKey] = useState(0)

  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.2))
  const intersectionPoint = useRef(new THREE.Vector3())
  const dragOffset = useRef(new THREE.Vector3())
  const { camera } = useThree()

  useEffect(() => {
    scaleRef.current = 0
    glowIntensityRef.current = 1.5
    animDoneRef.current = false
    deletingRef.current = false
    const start = performance.now()
    let rafId: number

    const animate = () => {
      const elapsed = performance.now() - start
      const t = Math.min(elapsed / 300, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      scaleRef.current = eased * 0.2
      glowIntensityRef.current = 1.5 * (1 - t) + 0.4 * t

      if (t >= 1) {
        scaleRef.current = 0.2
        glowIntensityRef.current = 0.4
        animDoneRef.current = true
        setRenderKey((k) => k + 1)
      } else {
        rafId = requestAnimationFrame(animate)
      }
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [source.id])

  useEffect(() => {
    if (isDeleting && !deletingRef.current) {
      deletingRef.current = true
      const start = performance.now()
      let rafId: number
      const animate = () => {
        const elapsed = performance.now() - start
        const t = Math.min(elapsed / 200, 1)
        const eased = t * t
        scaleRef.current = 0.2 * (1 - eased)
        if (t >= 1) {
          scaleRef.current = 0
          onDeleteComplete(source.id)
        } else {
          rafId = requestAnimationFrame(animate)
        }
      }
      rafId = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(rafId)
    }
  }, [isDeleting, source.id, onDeleteComplete])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scaleRef.current / 0.2)
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(scaleRef.current / 0.2)
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = glowIntensityRef.current * 0.5
    }
  })

  const handlePointerDown = useCallback((e: THREE.Event & { stopPropagation: () => void; point: THREE.Vector3; pointerId: number; target: HTMLElement; unprojectedPoint: THREE.Vector3; ray: THREE.Ray }) => {
    if (isDeleting) return
    e.stopPropagation()
    setIsDragging(true)
    const planeIntersect = new THREE.Vector3()
    e.ray.intersectPlane(dragPlane.current, planeIntersect)
    if (groupRef.current) {
      const srcPos = new THREE.Vector3(source.position.x, source.position.y, source.position.z)
      dragOffset.current.copy(planeIntersect).sub(srcPos)
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [isDeleting, source.position])

  const handlePointerMove = useCallback((e: THREE.Event & { stopPropagation: () => void; ray: THREE.Ray; pointerId: number; target: HTMLElement }) => {
    if (!isDragging || isDeleting) return
    e.stopPropagation()
    const planeIntersect = new THREE.Vector3()
    e.ray.intersectPlane(dragPlane.current, planeIntersect)
    const newPos = planeIntersect.sub(dragOffset.current)
    newPos.y = 0.2
    if (groupRef.current) {
      groupRef.current.position.copy(newPos)
    }
    onMove(source.id, { x: newPos.x, y: 0.2, z: newPos.z })
  }, [isDragging, isDeleting, source.id, onMove])

  const handlePointerUp = useCallback((e: THREE.Event & { stopPropagation: () => void; pointerId: number; target: HTMLElement }) => {
    e.stopPropagation()
    setIsDragging(false)
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }, [])

  const distance = Math.sqrt(
    source.position.x * source.position.x +
    source.position.y * source.position.y +
    source.position.z * source.position.z
  )
  const lineOpacity = Math.max(0.1, 0.3 - (distance / 30) * 0.2)

  const linePoints = useMemo(
    () => [
      new THREE.Vector3(source.position.x, source.position.y, source.position.z),
      new THREE.Vector3(0, 0, 0),
    ],
    [source.position.x, source.position.y, source.position.z]
  )

  const pos = [source.position.x, source.position.y, source.position.z] as [number, number, number]

  return (
    <>
      <group ref={groupRef} position={pos}>
        <mesh
          ref={meshRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <sphereGeometry args={[0.2, 24, 24]} />
          <meshStandardMaterial
            color={source.color}
            emissive={source.color}
            emissiveIntensity={0.4}
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.28, 24, 24]} />
          <meshBasicMaterial
            color={source.color}
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      </group>
      <Line
        points={linePoints}
        color="#a78bfa"
        transparent
        opacity={lineOpacity}
        dashed
        dashSize={3}
        gapSize={3}
        lineWidth={1}
      />
    </>
  )
}

interface ClickPlaneProps {
  onAddSource: (position: { x: number; y: number; z: number }) => void
  sourcesCount: number
}

function ClickPlane({ onAddSource, sourcesCount }: ClickPlaneProps) {
  const handleClick = useCallback((e: THREE.Event & { stopPropagation: () => void; point: THREE.Vector3 }) => {
    e.stopPropagation()
    if (sourcesCount >= 50) return
    const point = e.point
    onAddSource({ x: point.x, y: 0.2, z: point.z })
  }, [onAddSource, sourcesCount])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} onClick={handleClick}>
      <planeGeometry args={[40, 40]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

function SceneContent({ sources, onAddSource, onMoveSource, onRemoveSource, deletingIds }: SceneProps) {
  const handleDeleteComplete = useCallback((id: string) => {
    onRemoveSource(id)
  }, [onRemoveSource])

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <pointLight position={[0, 5, 0]} intensity={0.4} color="#6366f1" />

      <gridHelper args={[40, 40, '#334155', '#1e293b']} position={[0, 0, 0]} />

      <ListenerSphere />

      {sources.map((source) => (
        <SourceSphere
          key={source.id}
          source={source}
          isDeleting={deletingIds.includes(source.id)}
          onMove={onMoveSource}
          onDeleteComplete={handleDeleteComplete}
        />
      ))}

      <ClickPlane onAddSource={onAddSource} sourcesCount={sources.length} />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={40}
        target={[0, 0, 0]}
      />
    </>
  )
}

export default function Scene({ sources, onAddSource, onMoveSource, onRemoveSource, deletingIds }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [10, 8, 10], fov: 50, near: 0.1, far: 1000 }}
      style={{ background: '#0f172a', width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <SceneContent
        sources={sources}
        onAddSource={onAddSource}
        onMoveSource={onMoveSource}
        onRemoveSource={onRemoveSource}
        deletingIds={deletingIds}
      />
    </Canvas>
  )
}
