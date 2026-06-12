import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { Stage } from './types'

interface FunnelBarProps {
  position: [number, number, number]
  height: number
  color: THREE.Color
  name: string
  value: number
}

function FunnelBar({ position, height, color, name, value }: FunnelBarProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.y = height / 2
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[1.5, height, 1.5]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.75}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      <group position={[0, height + 0.5, 0]}>
        <Text
          fontSize={0.35}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {`${name}\n${value}`}
        </Text>
      </group>
    </group>
  )
}

function BaseLine({ count }: { count: number }) {
  const totalWidth = count * 1.5 + (count - 1) * 0.5
  const startX = -totalWidth / 2 + 0.75

  return (
    <group position={[0, 0.01, 0]}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[startX + i * 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.8, 32]} />
          <meshBasicMaterial color="#646464" transparent opacity={0.15} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[totalWidth + 2, 4]} />
        <meshBasicMaterial color="#505050" transparent opacity={0.08} />
      </mesh>
    </group>
  )
}

interface SceneContentProps {
  stages: Stage[]
}

function SceneContent({ stages }: SceneContentProps) {
  const colors = useMemo(() => {
    const startColor = new THREE.Color('#3b82f6')
    const endColor = new THREE.Color('#ef4444')
    return stages.map((_, i) => {
      const t = stages.length > 1 ? i / (stages.length - 1) : 0
      return startColor.clone().lerp(endColor, t)
    })
  }, [stages])

  const positions = useMemo(() => {
    const count = stages.length
    const totalWidth = count * 1.5 + (count - 1) * 0.5
    const startX = -totalWidth / 2 + 0.75
    return stages.map((_, i) => [startX + i * 2, 0, 0] as [number, number, number])
  }, [stages])

  const maxValue = useMemo(() => {
    return Math.max(...stages.map(s => s.value), 100)
  }, [stages])

  if (stages.length === 0) {
    return (
      <group>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Text
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          请添加阶段数据
        </Text>
      </group>
    )
  }

  return (
    <group>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} />

      <BaseLine count={stages.length} />

      {stages.map((stage, i) => (
        <FunnelBar
          key={stage.id}
          position={positions[i]}
          height={Math.max((stage.value / maxValue) * 8, 0.3)}
          color={colors[i]}
          name={stage.name}
          value={stage.value}
        />
      ))}
    </group>
  )
}

interface FunnelSceneProps {
  stages: Stage[]
}

function FunnelScene({ stages }: FunnelSceneProps) {
  return (
    <Canvas
      camera={{ position: [8, 6, 10], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      shadows
    >
      <color attach="background" args={['#121212']} />
      <fog attach="fog" args={['#121212', 20, 40]} />

      <SceneContent stages={stages} />

      <OrbitControls
        enableDamping
        dampingFactor={0.15}
        minDistance={0.5}
        maxDistance={5}
        enablePan={false}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
    </Canvas>
  )
}

export default FunnelScene
