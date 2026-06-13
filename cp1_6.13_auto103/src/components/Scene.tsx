import { useRef, useMemo, useEffect, useState } from 'react'
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
}

function ListenerSphere() {
  const meshRef = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15
    }
  })
  return (
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
  )
}

interface SourceSphereProps {
  source: SoundSource
  onMove: (id: string, position: { x: number; y: number; z: number }) => void
  onRemove: (id: string) => void
}

function SourceSphere({ source, onMove, onRemove }: SourceSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [scale, setScale] = useState(0)
  const [glow, setGlow] = useState(1.5)
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const offset = useRef(new THREE.Vector3())
  const { camera, gl } = useThree()

  useEffect(() => {
    const start = performance.now()
    const duration = 300
    const animate = () => {
      const elapsed = performance.now() - start
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setScale(eased * 0.2)
      setGlow(1.5 * (1 - t) + 0.5 * t)
      if (t < 1) requestAnimationFrame(animate)
      else setGlow(0.5)
    }
    animate()
  }, [])

  useEffect(() => {
    if (source.volume < 0) {
      const start = performance.now()
      const duration = 200
      const animate = () => {
        const elapsed = performance.now() - start
        const t = Math.min(elapsed / duration, 1)
        setScale(0.2 * (1 - t))
        if (t < 1) requestAnimationFrame(animate)
        else onRemove(source.id)
      }
      animate()
    }
  }, [source.volume, source.id, onRemove])

  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    setIsDragging(true)
    const intersectPoint = e.point.clone()
    const planeIntersect = new THREE.Vector3()
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(e.uv, camera)
    raycaster.ray.intersectPlane(dragPlane.current, planeIntersect)
    if (meshRef.current) {
      offset.current.copy(planeIntersect).sub(meshRef.current.position)
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: any) => {
    if (!isDragging || !meshRef.current) return
    e.stopPropagation()
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(e.uv, camera)
    const intersectPoint = new THREE.Vector3()
    if (raycaster.ray.intersectPlane(dragPlane.current, intersectPoint)) {
      const newPos = intersectPoint.sub(offset.current)
      newPos.y = 0.2
      meshRef.current.position.copy(newPos)
      onMove(source.id, { x: newPos.x, y: newPos.y, z: newPos.z })
    }
  }

  const handlePointerUp = (e: any) => {
    e.stopPropagation()
    setIsDragging(false)
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const distance = Math.sqrt(
    Math.pow(source.position.x, 2) +
      Math.pow(source.position.y, 2) +
      Math.pow(source.position.z, 2)
  )
  const lineOpacity = Math.max(0.1, 0.3 - (distance / 30) * 0.2)

  const linePoints = useMemo(
    () => [
      [source.position.x, source.position.y, source.position.z] as [number, number, number],
      [0, 0, 0] as [number, number, number],
    ],
    [source.position.x, source.position.y, source.position.z]
  )

  return (
    <group position={[source.position.x, source.position.y, source.position.z]}>
      <mesh
        ref={meshRef}
        scale={[scale / 0.2, scale / 0.2, scale / 0.2]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshStandardMaterial
          color={source.color}
          emissive={source.color}
          emissiveIntensity={glow}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>
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
    </group>
  )
}

interface ClickPlaneProps {
  onAddSource: (position: { x: number; y: number; z: number }) => void
}

function ClickPlane({ onAddSource }: ClickPlaneProps) {
  const handleClick = (e: any) => {
    e.stopPropagation()
    const point = e.point
    onAddSource({ x: point.x, y: 0.2, z: point.z })
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} onClick={handleClick}>
      <planeGeometry args={[40, 40]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

function SceneContent({ sources, onAddSource, onMoveSource, onRemoveSource }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <pointLight position={[0, 5, 0]} intensity={0.4} color="#6366f1" />

      <gridHelper
        args={[40, 40, '#334155', '#334155']}
        position={[0, 0, 0]}
      />

      <ListenerSphere />

      {sources.map((source) => (
        <SourceSphere
          key={source.id}
          source={source}
          onMove={onMoveSource}
          onRemove={onRemoveSource}
        />
      ))}

      <ClickPlane onAddSource={onAddSource} />

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

export default function Scene({ sources, onAddSource, onMoveSource, onRemoveSource }: SceneProps) {
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
      />
    </Canvas>
  )
}
