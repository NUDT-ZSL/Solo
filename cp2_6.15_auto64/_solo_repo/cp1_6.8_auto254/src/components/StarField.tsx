import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import Constellation from './Constellation'
import { createStarTrailCurve } from '@/utils/geometryHelpers'
import { getEmotionColors } from '@/utils/emotionColors'
import { useStore } from '@/store'

function StarTrails() {
  const constellations = useStore((s) => s.constellations)
  const groupRef = useRef<THREE.Group>(null)

  const trails = useMemo(() => {
    const result: { curve: THREE.CatmullRomCurve3; emotion: string }[] = []
    for (let i = 0; i < constellations.length - 1; i++) {
      const from = constellations[i].center
      const to = constellations[i + 1].center
      const curve = createStarTrailCurve(from, to)
      result.push({ curve, emotion: constellations[i].emotion })
    }
    return result
  }, [constellations])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.01
    }
  })

  return (
    <group ref={groupRef}>
      {trails.map((trail, i) => {
        const points = trail.curve.getPoints(50)
        const geom = new THREE.BufferGeometry().setFromPoints(points)
        const colors = getEmotionColors(trail.emotion as any)
        return (
          <line key={`trail-${i}`} geometry={geom}>
            <lineBasicMaterial
              color={colors.line}
              transparent
              opacity={0.3}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </line>
        )
      })}
    </group>
  )
}

function ConstellationsRenderer() {
  const constellations = useStore((s) => s.constellations)
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.005
    }
  })

  return (
    <group ref={groupRef}>
      {constellations.map((c) => (
        <Constellation key={c.id} data={c} />
      ))}
    </group>
  )
}

function BackgroundStars() {
  return (
    <Stars
      radius={80}
      depth={60}
      count={3000}
      factor={4}
      saturation={0.2}
      fade
      speed={0.5}
    />
  )
}

export default function StarField() {
  return (
    <Canvas
      camera={{ position: [0, 8, 20], fov: 60, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 30, 80]} />
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#4466aa" distance={50} />
      <BackgroundStars />
      <ConstellationsRenderer />
      <StarTrails />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        minDistance={5}
        maxDistance={60}
        enablePan
        panSpeed={0.5}
        autoRotate
        autoRotateSpeed={0.15}
      />
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  )
}
