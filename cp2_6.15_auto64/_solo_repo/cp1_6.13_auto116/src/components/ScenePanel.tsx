import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import { v4 as uuidv4 } from 'uuid'
import type { Layer, Marker, FossilData, RippleEffect } from '../types'
import { useStore } from '../store'

interface StratumProps {
  layer: Layer
  index: number
  isHighlighted: boolean
  depositProgress: number
  showFossils: boolean
  fossils: FossilData[]
  onClick: (e: any) => void
}

const elasticOut = (t: number): number => {
  const p = 0.3
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1
}

function Fossil({
  fossil,
  opacity,
  layer,
}: {
  fossil: FossilData
  opacity: number
  layer: Layer
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.2 * delta
    }
  })

  const geometry = useMemo(() => {
    if (fossil.type === 'ammonite') {
      return new THREE.TorusGeometry(0.05, 0.02, 8, 16)
    }
    return new THREE.SphereGeometry(0.05, 12, 8).scale(1.5, 0.6, 1)
  }, [fossil.type])

  const yOffset = fossil.position.y - layer.position - layer.thickness / 2

  return (
    <mesh
      ref={meshRef}
      position={[fossil.position.x, yOffset, fossil.position.z]}
    >
      <primitive object={geometry} />
      <meshStandardMaterial
        color="#fbbf24"
        transparent
        opacity={opacity}
        metalness={0.3}
        roughness={0.5}
      />
    </mesh>
  )
}

function Stratum({
  layer,
  index,
  isHighlighted,
  depositProgress,
  showFossils,
  fossils,
  onClick,
}: StratumProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const layerFossils = useMemo(
    () => fossils.filter((f) => f.layerId === layer.id),
    [fossils, layer.id]
  )

  const opacity = useMemo(() => {
    if (depositProgress === -1) return 1
    if (index <= depositProgress) return 1
    if (index === Math.floor(depositProgress) + 1) {
      const progress = depositProgress - Math.floor(depositProgress)
      return Math.max(0, Math.min(1, progress))
    }
    return 0
  }, [depositProgress, index])

  const emissiveIntensity = useMemo(() => {
    if (isHighlighted) return 0.3
    if (hovered) return 0.1
    return 0
  }, [isHighlighted, hovered])

  const yPos = layer.position + layer.thickness / 2

  const handleClick = useCallback(
    (e: any) => {
      e.stopPropagation()
      e.object.userData.layer = layer
      onClick(e)
    },
    [layer, onClick]
  )

  return (
    <group position={[0, yPos, 0]}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        userData={{ layerId: layer.id }}
      >
        <boxGeometry args={[10, layer.thickness, 8]} />
        <meshStandardMaterial
          color={layer.color}
          transparent
          opacity={opacity}
          emissive={layer.color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry
          args={[new THREE.BoxGeometry(10, layer.thickness, 8)]}
        />
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={opacity > 0 ? 0.4 : 0}
        />
      </lineSegments>
      {showFossils &&
        layerFossils.map((fossil) => (
          <Fossil
            key={fossil.id}
            fossil={fossil}
            opacity={opacity}
            layer={layer}
          />
        ))}
    </group>
  )
}

function Ripple({
  ripple,
  onComplete,
}: {
  ripple: RippleEffect
  onComplete: (id: string) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const startTime = useRef<number>(Date.now())
  const completed = useRef(false)

  useFrame(() => {
    if (!meshRef.current || completed.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const duration = 0.5

    if (elapsed >= duration) {
      completed.current = true
      onComplete(ripple.id)
      return
    }

    const t = elapsed / duration
    const radius = 0 + t * (1 - 0)
    const opacity = 0.6 + t * (0 - 0.6)

    meshRef.current.scale.setScalar(Math.max(0.001, radius))
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = Math.max(0, opacity)
  })

  return (
    <mesh
      ref={meshRef}
      position={[ripple.position.x, ripple.position.y + 0.02, ripple.position.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={0.001}
    >
      <ringGeometry args={[0.95, 1, 48]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function MarkerPin({ marker, isNew }: { marker: Marker; isNew?: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const progressRef = useRef(isNew ? 0 : 1)
  const startTimeRef = useRef<number>(Date.now())
  const hasAnimatedRef = useRef(!isNew)
  const [yOffset, setYOffset] = useState(isNew ? 0 : 0.3)

  useFrame(() => {
    if (hasAnimatedRef.current) return

    const elapsed = Date.now() - startTimeRef.current
    const duration = 200
    const t = Math.min(elapsed / duration, 1)
    const elasticT = elasticOut(t)
    progressRef.current = elasticT
    setYOffset(elasticT * 0.3)

    if (t >= 1) {
      hasAnimatedRef.current = true
    }
  })

  return (
    <group
      ref={groupRef}
      position={[marker.position.x, marker.position.y, marker.position.z]}
    >
      {yOffset > 0.001 && (
        <>
          <mesh position={[0, yOffset / 2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, yOffset, 8]} />
            <meshStandardMaterial
              color="#94a3b8"
              metalness={0.5}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, yOffset + 0.03, 0]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#ef4444"
              emissiveIntensity={0.2}
            />
          </mesh>
          <Text
            position={[0, yOffset + 0.15, 0]}
            fontSize={0.12}
            color="#ffffff"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.01}
            outlineColor="#000000"
          >
            {marker.label}
          </Text>
        </>
      )}
    </group>
  )
}

function SceneContent() {
  const { camera } = useThree()
  const {
    layers,
    markers,
    eraSliderValue,
    showFossils,
    fossils,
    isDepositing,
    depositProgress,
    ripples,
    selectLayer,
    addRipple,
    removeRipple,
    setNewMarkerPosition,
    setDepositProgress,
    resetDeposition,
    setFossils,
  } = useStore()

  const controlsRef = useRef<any>(null)
  const [newMarkerIds, setNewMarkerIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    camera.position.set(12, 6, 12)
    camera.lookAt(0, 3, 0)
  }, [camera])

  useEffect(() => {
    if (!isDepositing) return

    const totalLayers = layers.length
    let currentProgress = -1
    const interval = setInterval(() => {
      currentProgress += 0.05
      if (currentProgress >= totalLayers) {
        clearInterval(interval)
        resetDeposition()
        return
      }
      setDepositProgress(currentProgress)
    }, 25)

    return () => clearInterval(interval)
  }, [isDepositing, layers.length, setDepositProgress, resetDeposition])

  const handleLayerClick = useCallback(
    (e: any) => {
      const layer = e.object.userData.layer as Layer
      const layerId = e.object.userData.layerId
      const layerData = layers.find((l) => l.id === layerId)
      if (!layerData) return

      const ripple: RippleEffect = {
        id: uuidv4(),
        position: { x: e.point.x, y: e.point.y, z: e.point.z },
        layerId,
      }
      addRipple(ripple)

      if (e.event.ctrlKey || e.event.metaKey) {
        setNewMarkerPosition({
          x: e.point.x,
          y: e.point.y,
          z: e.point.z,
          layerId,
        })
      } else {
        selectLayer(layerData, { x: e.clientX, y: e.clientY })
      }
    },
    [layers, addRipple, setNewMarkerPosition, selectLayer]
  )

  const handleRippleComplete = useCallback(
    (id: string) => {
      removeRipple(id)
    },
    [removeRipple]
  )

  const highlightedLayerId = useMemo(() => {
    if (eraSliderValue <= 0) return null
    const sortedLayers = [...layers].sort((a, b) => a.position - b.position)
    if (sortedLayers.length === 0) return null
    const index = Math.min(
      Math.floor(eraSliderValue * sortedLayers.length),
      sortedLayers.length - 1
    )
    return sortedLayers[index]?.id || null
  }, [eraSliderValue, layers])

  useEffect(() => {
    const newFossils: FossilData[] = []
    layers.forEach((layer) => {
      const fossilCount = layer.fossils.length
      for (let i = 0; i < fossilCount; i++) {
        newFossils.push({
          id: uuidv4(),
          type: Math.random() > 0.5 ? 'ammonite' : 'trilobite',
          position: {
            x: (Math.random() - 0.5) * 8,
            y:
              layer.position +
              layer.thickness / 2 +
              (Math.random() - 0.5) * layer.thickness * 0.8,
            z: (Math.random() - 0.5) * 6,
          },
          layerId: layer.id,
        })
      }
    })
    setFossils(newFossils)
  }, [layers, setFossils])

  useEffect(() => {
    markers.forEach((m) => {
      setNewMarkerIds((prev) => {
        if (!prev.has(m.id)) {
          return new Set(prev).add(m.id)
        }
        return prev
      })
    })
  }, [markers])

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        castShadow
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />

      <gridHelper
        args={[20, 20, '#334155', '#1e293b']}
        position={[0, -0.1, 0]}
      />

      {layers.map((layer, index) => (
        <Stratum
          key={layer.id}
          layer={layer}
          index={index}
          isHighlighted={layer.id === highlightedLayerId}
          depositProgress={depositProgress}
          showFossils={showFossils}
          fossils={fossils}
          onClick={handleLayerClick}
        />
      ))}

      {ripples.map((ripple) => (
        <Ripple
          key={ripple.id}
          ripple={ripple}
          onComplete={handleRippleComplete}
        />
      ))}

      {markers.map((marker) => (
        <MarkerPin
          key={marker.id}
          marker={marker}
          isNew={newMarkerIds.has(marker.id)}
        />
      ))}

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 3, 0]}
      />
    </>
  )
}

export default function ScenePanel() {
  return (
    <div className="flex-1 relative bg-[#0f0f0f] overflow-hidden">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [12, 6, 12], fov: 50 }}
        onPointerMissed={() => useStore.getState().selectLayer(null)}
      >
        <color attach="background" args={['#0f0f0f']} />
        <fog attach="fog" args={['#0f0f0f', 15, 35]} />
        <SceneContent />
      </Canvas>
    </div>
  )
}
