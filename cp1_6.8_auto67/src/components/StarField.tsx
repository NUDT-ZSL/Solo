import { useRef, useMemo, useCallback, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Capsule } from '../../shared/types'
import { TimeCapsuleEngine } from '../utils/TimeCapsuleEngine'

interface FloatingCubeProps {
  capsule: Capsule
  onHover: (capsule: Capsule | null, point?: THREE.Vector3) => void
  onClick: (capsule: Capsule) => void
}

function FloatingCube({ capsule, onHover, onClick }: FloatingCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const scaleTarget = useRef(1)
  const currentScale = useRef(1)
  const basePosition = useMemo(
    () => new THREE.Vector3(capsule.position.x, capsule.position.y, capsule.position.z),
    [capsule.position]
  )
  const offset = useMemo(() => Math.random() * Math.PI * 2, [])

  const color = useMemo(() => new THREE.Color(capsule.color), [capsule.color])

  const emissiveIntensity = hovered ? 1.5 : 0.6

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime

    meshRef.current.rotation.x += capsule.rotationSpeed.x
    meshRef.current.rotation.y += capsule.rotationSpeed.y
    meshRef.current.rotation.z += capsule.rotationSpeed.z

    meshRef.current.position.x = basePosition.x + Math.sin(t * 0.15 + offset) * 0.5
    meshRef.current.position.y = basePosition.y + Math.cos(t * 0.12 + offset) * 0.4
    meshRef.current.position.z = basePosition.z + Math.sin(t * 0.1 + offset * 0.7) * 0.3

    scaleTarget.current = hovered ? 1.2 : 1
    currentScale.current += (scaleTarget.current - currentScale.current) * 0.1
    meshRef.current.scale.setScalar(currentScale.current)

    if (glowRef.current) {
      glowRef.current.position.copy(meshRef.current.position)
      glowRef.current.rotation.copy(meshRef.current.rotation)
      glowRef.current.scale.setScalar(currentScale.current * 1.35)
    }
  })

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
    onHover(capsule, e.point)
  }, [capsule, onHover])

  const handlePointerOut = useCallback(() => {
    setHovered(false)
    document.body.style.cursor = 'default'
    onHover(null)
  }, [onHover])

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onClick(capsule)
  }, [capsule, onClick])

  return (
    <group>
      <mesh
        ref={meshRef}
        position={basePosition.toArray()}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={0.75}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
      <mesh ref={glowRef} position={basePosition.toArray()}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={hovered ? 0.18 : 0.08}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

function ParticleField() {
  const count = 500
  const meshRef = useRef<THREE.Points>(null)

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50
      const c = new THREE.Color()
      c.setHSL(0.6 + Math.random() * 0.2, 0.6, 0.4 + Math.random() * 0.3)
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return [pos, col]
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    const posArr = meshRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      posArr[i * 3 + 1] += Math.sin(t * 0.05 + i) * 0.002
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

function SceneContent({
  capsules,
  onHover,
  onClick,
}: {
  capsules: Capsule[]
  onHover: (capsule: Capsule | null, point?: THREE.Vector3) => void
  onClick: (capsule: Capsule) => void
}) {
  const { camera } = useThree()

  useMemo(() => {
    camera.position.set(0, 0, 20)
  }, [camera])

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={[-10, -5, -10]} intensity={0.2} color="#6b5ce7" />
      <fog attach="fog" args={['#0a0a2e', 15, 45]} />
      <ParticleField />
      {capsules.map(capsule => (
        <FloatingCube
          key={capsule.id}
          capsule={capsule}
          onHover={onHover}
          onClick={onClick}
        />
      ))}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={8}
        maxDistance={35}
        maxPolarAngle={Math.PI * 0.85}
        minPolarAngle={Math.PI * 0.15}
        autoRotate
        autoRotateSpeed={0.15}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  )
}

interface StarFieldProps {
  capsules: Capsule[]
  onCapsuleClick: (capsule: Capsule) => void
}

export default function StarField({ capsules, onCapsuleClick }: StarFieldProps) {
  const [hoveredCapsule, setHoveredCapsule] = useState<Capsule | null>(null)
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | undefined>()

  const handleHover = useCallback((capsule: Capsule | null, point?: THREE.Vector3) => {
    setHoveredCapsule(capsule)
    setHoverPoint(point)
  }, [])

  const handleClick = useCallback((capsule: Capsule) => {
    onCapsuleClick(capsule)
  }, [onCapsuleClick])

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0a2e')
        }}
      >
        <SceneContent
          capsules={capsules}
          onHover={handleHover}
          onClick={handleClick}
        />
      </Canvas>

      {hoveredCapsule && hoverPoint && (
        <div
          className="pointer-events-none fixed z-30 px-3 py-1.5 rounded-lg text-xs text-white/90 whitespace-nowrap"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            left: `${(hoverPoint.x / 20 + 0.5) * window.innerWidth}px`,
            top: `${(-hoverPoint.y / 20 + 0.5) * window.innerHeight}px`,
            transform: 'translate(-50%, -120%)',
          }}
        >
          {TimeCapsuleEngine.getSummary(hoveredCapsule)}
        </div>
      )}
    </div>
  )
}
