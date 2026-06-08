import { useRef, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, EffectComposer, Bloom } from '@react-three/drei'
import * as THREE from 'three'
import { AuroraEngine } from './AuroraEngine'
import { SoundComposer } from './SoundComposer'
import { useAuroraStore } from './store'

const soundComposer = new SoundComposer()

function AuroraParticles() {
  const engineRef = useRef<AuroraEngine | null>(null)
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()

  useEffect(() => {
    const engine = new AuroraEngine()
    engineRef.current = engine
    if (groupRef.current) {
      groupRef.current.add(engine.points)
    }
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  useFrame((_, delta) => {
    if (!engineRef.current) return
    const clampedDelta = Math.min(delta, 0.05)
    engineRef.current.update(clampedDelta)
    soundComposer.setVolume(useAuroraStore.getState().volume)
  })

  const handleClick = useCallback((e: THREE.Event & { point?: THREE.Vector3; stopPropagation?: () => void }) => {
    if (!engineRef.current || !camera) return
    e.stopPropagation?.()

    const mouse = new THREE.Vector2()
    const rect = (e as unknown as { object?: unknown }).object ? undefined : undefined

    if (e.point) {
      const idx = Math.floor(Math.random() * engineRef.current.particles.length)
      const nearbyStart = Math.max(0, idx - 20)
      const nearbyEnd = Math.min(engineRef.current.particles.length, idx + 20)
      for (let i = nearbyStart; i < nearbyEnd; i++) {
        engineRef.current.particles[i].triggerFlicker()
      }
      const p = engineRef.current.particles[idx]
      const color = p.getColor((engineRef.current.time * 0.05 + idx / engineRef.current.particles.length) % 1)
      soundComposer.init()
      soundComposer.playAuroraTone(color.r, color.g, color.b, p.data.position.x)
    }
  }, [camera])

  return (
    <group ref={groupRef} onClick={handleClick as never} />
  )
}

function CameraController() {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const cameraResetTrigger = useAuroraStore((s) => s.cameraResetTrigger)

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }, [cameraResetTrigger])

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={80}
      enablePan={false}
    />
  )
}

export function AuroraScene() {
  return (
    <Canvas
      camera={{ position: [0, 5, 30], fov: 60, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false }}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    >
      <color attach="background" args={['#0a0e27']} />
      <fog attach="fog" args={['#0a0e27', 40, 100]} />
      <AuroraParticles />
      <CameraController />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.5}
        />
      </EffectComposer>
    </Canvas>
  )
}
