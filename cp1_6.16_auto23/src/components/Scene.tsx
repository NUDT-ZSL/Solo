import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import useWeatherStore from '@/store/weatherStore'

function WeatherParticles() {
  const pointsRef = useRef<THREE.Points>(null)
  const envParams = useWeatherStore((s) => s.environmentParams)
  const particles = envParams.particles

  const maxCount = 5000
  const positions = useMemo(() => new Float32Array(maxCount * 3), [])
  const velocities = useMemo(() => new Float32Array(maxCount * 3), [])
  const sizes = useMemo(() => new Float32Array(maxCount), [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [positions, sizes])

  const material = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      color: particles?.color ?? '#ffffff',
      transparent: true,
      opacity: particles?.opacity ?? 0.3,
      size: particles?.size ?? 2,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return mat
  }, [])

  useFrame((_, delta) => {
    if (!pointsRef.current || !particles) return
    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const sizeAttr = geometry.attributes.size as THREE.BufferAttribute

    const count = Math.min(particles.count, maxCount)
    const speed = particles.speed
    const size = particles.size
    const isRain = particles.length !== undefined && !particles.rotate
    const isSnow = particles.rotate === true

    for (let i = 0; i < maxCount; i++) {
      if (i < count) {
        let x = posAttr.getX(i)
        let y = posAttr.getY(i)
        let z = posAttr.getZ(i)

        if (x === 0 && y === 0 && z === 0) {
          x = (Math.random() - 0.5) * 40
          y = Math.random() * 25
          z = (Math.random() - 0.5) * 40
        }

        y -= speed * delta * (isRain ? 8 : isSnow ? 2 : 1)
        x += Math.sin(Date.now() * 0.001 + i) * delta * (isSnow ? 0.3 : 0.05)

        if (y < -2) {
          y = 20 + Math.random() * 5
          x = (Math.random() - 0.5) * 40
          z = (Math.random() - 0.5) * 40
        }

        posAttr.setXYZ(i, x, y, z)

        if (isRain) {
          sizeAttr.setX(i, size * 3)
        } else if (isSnow) {
          sizeAttr.setX(i, size + Math.sin(Date.now() * 0.002 + i) * 2)
        } else {
          sizeAttr.setX(i, size)
        }
      } else {
        posAttr.setXYZ(i, 0, -100, 0)
        sizeAttr.setX(i, 0)
      }
    }

    posAttr.needsUpdate = true
    sizeAttr.needsUpdate = true

    material.color.set(particles.color)
    material.opacity = particles.opacity
    material.size = 1
    material.needsUpdate = true
  })

  return <points ref={pointsRef} geometry={geometry} material={material} />
}

function MetalBall() {
  const meshRef = useRef<THREE.Mesh>(null)
  const envParams = useWeatherStore((s) => s.environmentParams)
  const waterDrop = envParams.objectResponse.metalWaterDrop
  const uvOffset = useRef(0)

  const baseMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.9,
      roughness: 0.1,
      envMapIntensity: 1.0,
    })
  }, [])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    if (waterDrop) {
      uvOffset.current += delta * 0.5
      const offset = Math.sin(uvOffset.current) * 0.05
      meshRef.current.material = baseMaterial.clone()
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      mat.roughness = 0.1 + Math.abs(offset) * 3
      mat.metalness = 0.9 - Math.abs(offset)
      mat.color.setRGB(0.8 + offset, 0.8 + offset, 0.85 + offset)
    } else {
      meshRef.current.material = baseMaterial
    }
  })

  return (
    <mesh ref={meshRef} position={[-2, 0.5, 0]} material={baseMaterial} castShadow>
      <sphereGeometry args={[0.5, 32, 32]} />
    </mesh>
  )
}

function WoodBlock() {
  const meshRef = useRef<THREE.Mesh>(null)
  const envParams = useWeatherStore((s) => s.environmentParams)
  const shouldShake = envParams.objectResponse.woodShake
  const shakeTimer = useRef(0)

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0x8B6914,
      roughness: 0.8,
      metalness: 0.0,
    })
  }, [])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    if (shouldShake) {
      shakeTimer.current += delta
      if (shakeTimer.current >= 0.05) {
        shakeTimer.current = 0
        meshRef.current.position.x = 2 + (Math.random() - 0.5) * 0.1
        meshRef.current.position.z = (Math.random() - 0.5) * 0.1
      }
    } else {
      meshRef.current.position.x = 2
      meshRef.current.position.z = 0
    }
  })

  return (
    <mesh ref={meshRef} position={[2, 0.4, 0]} material={material} castShadow>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
    </mesh>
  )
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color={0x2a3a2a} roughness={0.9} />
    </mesh>
  )
}

function SceneLights() {
  const dirLightRef = useRef<THREE.DirectionalLight>(null)
  const envParams = useWeatherStore((s) => s.environmentParams)

  useFrame(() => {
    if (!dirLightRef.current) return
    const { light } = envParams
    dirLightRef.current.intensity = light.directionalIntensity
    dirLightRef.current.color.set(light.directionalColor)
    dirLightRef.current.position.set(...light.direction)
  })

  return (
    <>
      <directionalLight
        ref={dirLightRef}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <ambientLight intensity={envParams.light.ambientIntensity} color={0xffffff} />
    </>
  )
}

function SceneFog() {
  const envParams = useWeatherStore((s) => s.environmentParams)

  useFrame(({ scene }) => {
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = envParams.fogDensity
      scene.fog.color.set(envParams.fogColor)
    } else {
      scene.fog = new THREE.FogExp2(envParams.fogColor, envParams.fogDensity)
    }
    ;(scene as any).background = new THREE.Color(envParams.skyColor)
  })

  return null
}

function LightningFlash() {
  const flashRef = useRef<THREE.Mesh>(null)
  const envParams = useWeatherStore((s) => s.environmentParams)
  const flashEnabled = envParams.flashEnabled
  const nextFlash = useRef(Math.random() * 5000 + 1000)
  const elapsed = useRef(0)
  const [flashing, setFlashing] = useState(false)

  useFrame((_, delta) => {
    if (!flashEnabled) {
      setFlashing(false)
      elapsed.current = 0
      nextFlash.current = Math.random() * 5000 + 1000
      return
    }

    elapsed.current += delta * 1000
    if (elapsed.current >= nextFlash.current) {
      setFlashing(true)
      elapsed.current = 0
      nextFlash.current = Math.random() * 5000 + 1000
      setTimeout(() => setFlashing(false), 150)
    }
  })

  if (!flashing) return null

  return (
    <mesh position={[0, 10, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial color={0xffffff} transparent opacity={0.7} side={THREE.DoubleSide} depthTest={false} />
    </mesh>
  )
}

function SceneContent() {
  return (
    <>
      <SceneFog />
      <SceneLights />
      <WeatherParticles />
      <Ground />
      <MetalBall />
      <WoodBlock />
      <LightningFlash />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}

export default function Scene() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [8, 6, 8], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.0
        }}
      >
        <SceneContent />
      </Canvas>
    </div>
  )
}
