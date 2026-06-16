import { useRef, useMemo, useCallback } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Earthquake } from '@/hooks/useEarthquakeData'

export interface Ripple {
  id: string
  longitude: number
  latitude: number
  startTime: number
}

interface EarthProps {
  children?: React.ReactNode
}

function Earth({ children }: EarthProps) {
  const earthRef = useRef<THREE.Group>(null)
  const sphereRef = useRef<THREE.Mesh>(null)

  const { positions } = useMemo(() => {
    const positions: number[] = []
    const lonSegments = 36
    const latSegments = 18
    const radius = 5.01

    for (let lon = 0; lon <= lonSegments; lon++) {
      const theta = (lon / lonSegments) * Math.PI * 2
      for (let lat = 0; lat <= latSegments; lat++) {
        const phi = (lat / latSegments) * Math.PI - Math.PI / 2
        const x = radius * Math.cos(phi) * Math.cos(theta)
        const y = radius * Math.sin(phi)
        const z = radius * Math.cos(phi) * Math.sin(theta)
        positions.push(x, y, z)
      }
    }

    return { positions: new Float32Array(positions) }
  }, [])

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.01 * delta
    }
  })

  return (
    <group ref={earthRef}>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial
          color="#1a5276"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#2980b9" transparent opacity={0.5} />
      </lineSegments>
      {children}
    </group>
  )
}

interface MarkerProps {
  earthquake: Earthquake
  onClick: (e: ThreeEvent<MouseEvent>) => void
  isSelected: boolean
}

function Marker({ earthquake, onClick, isSelected }: MarkerProps) {
  const spriteRef = useRef<THREE.Sprite>(null)

  const { color, scale, spriteTexture } = useMemo(() => {
    let color: string
    let scale: number

    if (earthquake.magnitude >= 6) {
      color = '#ff4444'
      scale = 0.2
    } else if (earthquake.magnitude >= 4) {
      color = '#ff8833'
      scale = 0.15
    } else {
      color = '#ffdd55'
      scale = 0.1
    }

    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, color)
    gradient.addColorStop(0.7, color)
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(32, 32, 32, 0, Math.PI * 2)
    ctx.fill()

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    return { color, scale, spriteTexture: texture }
  }, [earthquake.magnitude])

  const position = useMemo(() => {
    const radius = 5.05
    const lonRad = (earthquake.longitude * Math.PI) / 180
    const latRad = (earthquake.latitude * Math.PI) / 180
    const x = radius * Math.cos(latRad) * Math.cos(lonRad)
    const y = radius * Math.sin(latRad)
    const z = radius * Math.cos(latRad) * Math.sin(lonRad)
    return [x, y, z] as [number, number, number]
  }, [earthquake.longitude, earthquake.latitude])

  return (
    <sprite
      ref={spriteRef}
      position={position}
      scale={[scale * (isSelected ? 1.5 : 1), scale * (isSelected ? 1.5 : 1), 1]}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
      }}
    >
      <spriteMaterial
        map={spriteTexture}
        transparent
        depthWrite={false}
        sizeAttenuation
      />
    </sprite>
  )
}

interface RippleEffectProps {
  ripple: Ripple
  onComplete: (id: string) => void
}

function RippleEffect({ ripple, onComplete }: RippleEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const startTime = useRef(ripple.startTime)
  const duration = 1500

  const position = useMemo(() => {
    const radius = 5.02
    const lonRad = (ripple.longitude * Math.PI) / 180
    const latRad = (ripple.latitude * Math.PI) / 180
    const x = radius * Math.cos(latRad) * Math.cos(lonRad)
    const y = radius * Math.sin(latRad)
    const z = radius * Math.cos(latRad) * Math.sin(lonRad)
    return [x, y, z] as [number, number, number]
  }, [ripple.longitude, ripple.latitude])

  useFrame(() => {
    const elapsed = performance.now() - startTime.current
    const progress = Math.min(elapsed / duration, 1)

    if (meshRef.current) {
      const currentRadius = 0.5 + progress * 1.5
      const currentOpacity = 0.8 * (1 - progress)

      meshRef.current.scale.setScalar(currentRadius)
      ;(meshRef.current.material as THREE.MeshBasicMaterial).opacity = currentOpacity
    }

    if (progress >= 1) {
      onComplete(ripple.id)
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <ringGeometry args={[0.95, 1, 64]} />
      <meshBasicMaterial
        color="#ff6644"
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

interface ScenePanelProps {
  earthquakes: Earthquake[]
  selectedEarthquake: Earthquake | null
  ripples: Ripple[]
  onMarkerClick: (earthquake: Earthquake) => void
  onRippleComplete: (id: string) => void
}

export function ScenePanel({
  earthquakes,
  selectedEarthquake,
  ripples,
  onMarkerClick,
  onRippleComplete
}: ScenePanelProps) {
  const handleMarkerClick = useCallback(
    (earthquake: Earthquake) => (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onMarkerClick(earthquake)
    },
    [onMarkerClick]
  )

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0e27' }}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0a0e27']} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[-10, -10, -10]} intensity={0.3} />

        <Earth>
          {earthquakes.map((eq, index) => (
            <Marker
              key={`${eq.longitude}-${eq.latitude}-${index}`}
              earthquake={eq}
              onClick={handleMarkerClick(eq)}
              isSelected={
                selectedEarthquake !== null &&
                selectedEarthquake.longitude === eq.longitude &&
                selectedEarthquake.latitude === eq.latitude &&
                selectedEarthquake.timestamp === eq.timestamp
              }
            />
          ))}

          {ripples.map((ripple) => (
            <RippleEffect
              key={ripple.id}
              ripple={ripple}
              onComplete={onRippleComplete}
            />
          ))}
        </Earth>

        <OrbitControls
          enablePan={false}
          minDistance={8}
          maxDistance={20}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={(Math.PI * 5) / 6}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  )
}
