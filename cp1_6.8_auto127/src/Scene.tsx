import { useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { StarBackground } from '@/StarBackground'
import { MeteorEngine } from '@/MeteorEngine'
import { ExplosionEffect } from '@/ExplosionEffect'
import { useStore } from '@/store'

export default function Scene() {
  const starBgRef = useRef<StarBackground | null>(null)
  const meteorEngineRef = useRef<MeteorEngine | null>(null)
  const explosionRef = useRef<ExplosionEffect | null>(null)
  const sceneGroupRef = useRef<THREE.Group>(null)
  const controlsRef = useRef<any>(null)

  const { camera, scene, gl } = useThree()
  const { meteorFrequency, trailLifetime, autoRotateSpeed, setSelectedMeteor } = useStore()

  useEffect(() => {
    const starBg = new StarBackground()
    const meteorEngine = new MeteorEngine()
    const explosionEffect = new ExplosionEffect()

    starBgRef.current = starBg
    meteorEngineRef.current = meteorEngine
    explosionRef.current = explosionEffect

    if (sceneGroupRef.current) {
      sceneGroupRef.current.add(starBg.getObject())
      sceneGroupRef.current.add(meteorEngine.getObject())
      sceneGroupRef.current.add(explosionEffect.getObject())
    }

    meteorEngine.setOnMeteorSelected((data) => {
      setSelectedMeteor(data)
      const pos = meteorEngine.getExplosionPosition(data.id)
      if (pos) {
        const color = new THREE.Color(data.color)
        explosionEffect.spawnExplosion(pos, color)
      }
      setTimeout(() => {
        meteorEngine.removeMeteor(data.id)
      }, 200)
    })

    return () => {
      starBg.dispose()
      meteorEngine.dispose()
      explosionEffect.dispose()
    }
  }, [setSelectedMeteor])

  useEffect(() => {
    meteorEngineRef.current?.setFrequency(meteorFrequency)
  }, [meteorFrequency])

  useEffect(() => {
    meteorEngineRef.current?.setTrailLifetime(trailLifetime)
  }, [trailLifetime])

  useEffect(() => {
    starBgRef.current?.setAutoRotateSpeed(autoRotateSpeed)
    if (controlsRef.current) {
      controlsRef.current.autoRotateSpeed = autoRotateSpeed
    }
  }, [autoRotateSpeed])

  const handlePointerDown = useCallback(
    (event: THREE.Event & { point?: THREE.Vector3; nativeEvent?: PointerEvent }) => {
      if (!meteorEngineRef.current) return
      const nativeEvent = (event as any).nativeEvent || (event as any).originalEvent
      if (!nativeEvent) return

      const rect = gl.domElement.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((nativeEvent.clientX - rect.left) / rect.width) * 2 - 1,
        -((nativeEvent.clientY - rect.top) / rect.height) * 2 + 1
      )

      meteorEngineRef.current.handleClick(mouse, camera)
    },
    [camera, gl]
  )

  useFrame((_, delta) => {
    const clampedDelta = Math.min(delta, 0.05)
    const elapsed = performance.now() / 1000

    starBgRef.current?.update(clampedDelta, elapsed)
    meteorEngineRef.current?.update(clampedDelta)
    explosionRef.current?.update(clampedDelta)
  })

  return (
    <>
      <group ref={sceneGroupRef} onPointerDown={handlePointerDown} />
      <OrbitControls
        ref={controlsRef}
        autoRotate
        autoRotateSpeed={autoRotateSpeed}
        enableDamping
        dampingFactor={0.05}
        minDistance={50}
        maxDistance={600}
        enablePan={false}
      />
    </>
  )
}
