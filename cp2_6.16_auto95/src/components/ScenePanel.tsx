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

function buildGridGeometry(radius: number): Float32Array {
  const positions: number[] = []
  const lonSegments = 24
  const latSegments = 12

  for (let lon = 0; lon < lonSegments; lon++) {
    const theta1 = (lon / lonSegments) * Math.PI * 2
    const theta2 = ((lon + 1) / lonSegments) * Math.PI * 2
    for (let lat = 0; lat <= latSegments; lat++) {
      const phi = (lat / latSegments) * Math.PI - Math.PI / 2
      const x1 = radius * Math.cos(phi) * Math.cos(theta1)
      const y1 = radius * Math.sin(phi)
      const z1 = radius * Math.cos(phi) * Math.sin(theta1)
      const x2 = radius * Math.cos(phi) * Math.cos(theta2)
      const y2 = radius * Math.sin(phi)
      const z2 = radius * Math.cos(phi) * Math.sin(theta2)
      positions.push(x1, y1, z1, x2, y2, z2)
    }
  }

  for (let lat = 0; lat < latSegments; lat++) {
    const phi1 = (lat / latSegments) * Math.PI - Math.PI / 2
    const phi2 = ((lat + 1) / latSegments) * Math.PI - Math.PI / 2
    for (let lon = 0; lon <= lonSegments; lon++) {
      const theta = (lon / lonSegments) * Math.PI * 2
      const x1 = radius * Math.cos(phi1) * Math.cos(theta)
      const y1 = radius * Math.sin(phi1)
      const z1 = radius * Math.cos(phi1) * Math.sin(theta)
      const x2 = radius * Math.cos(phi2) * Math.cos(theta)
      const y2 = radius * Math.sin(phi2)
      const z2 = radius * Math.cos(phi2) * Math.sin(theta)
      positions.push(x1, y1, z1, x2, y2, z2)
    }
  }

  return new Float32Array(positions)
}

function Earth({ children }: EarthProps) {
  const earthRef = useRef<THREE.Group>(null)

  const gridPositions = useMemo(() => {
    return buildGridGeometry(5.01)
  }, [])

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.01 * delta
    }
  })

  return (
    <group ref={earthRef}>
      <mesh>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial
          color="#1a5276"
          transparent
          opacity={0.85}
          side={THREE.BackSide}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial
          color="#1a5276"
          transparent
          opacity={0.4}
          side={THREE.FrontSide}
          roughness={0.8}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={gridPositions.length / 3}
            array={gridPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#2980b9" transparent opacity={0.6} />
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

function createSpriteTexture(color: string): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(0.2, color)
  gradient.addColorStop(0.6, color)
  gradient.addColorStop(0.85, color + '80')
  gradient.addColorStop(1, 'transparent')

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(64, 64, 62, 0, Math.PI * 2)
  ctx.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function Marker({ earthquake, onClick, isSelected }: MarkerProps) {
  const spriteRef = useRef<THREE.Sprite>(null)

  const { color, baseScale, spriteTexture } = useMemo(() => {
    let color: string
    let baseScale: number

    if (earthquake.magnitude >= 6) {
      color = '#ff4444'
      baseScale = 0.2
    } else if (earthquake.magnitude >= 4) {
      color = '#ff8833'
      baseScale = 0.15
    } else {
      color = '#ffdd55'
      baseScale = 0.1
    }

    return { color, baseScale, spriteTexture: createSpriteTexture(color) }
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

  const scale = baseScale * (isSelected ? 1.8 : 1)

  return (
    <sprite
      ref={spriteRef}
      position={position}
      scale={[scale, scale, 1]}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
      }}
      renderOrder={1000}
    >
      <spriteMaterial
        map={spriteTexture}
        transparent
        depthWrite={false}
        sizeAttenuation
        depthTest={true}
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
      <ringGeometry args={[0.9, 1, 64]} />
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

  const isSelected = (eq: Earthquake) => {
    if (!selectedEarthquake) return false
    return (
      selectedEarthquake.longitude === eq.longitude &&
      selectedEarthquake.latitude === eq.latitude &&
      selectedEarthquake.timestamp === eq.timestamp
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0e27' }}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a0e27']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-8, 5, -8]} intensity={0.4} color="#88aaff" />
        <pointLight position={[0, 0, 15]} intensity={0.3} color="#6699ff" />

        <Earth>
          {earthquakes.map((eq, index) => (
            <Marker
              key={`${eq.longitude}-${eq.latitude}-${index}`}
              earthquake={eq}
              onClick={handleMarkerClick(eq)}
              isSelected={isSelected(eq)}
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
          dampingFactor={0.08}
          rotateSpeed={0.8}
          zoomSpeed={0.8}
        />
      </Canvas>
    </div>
  )
}
