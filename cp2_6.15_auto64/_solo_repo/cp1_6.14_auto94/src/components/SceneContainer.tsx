import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Plant, Season } from '../plantData'
import PlantInfoTooltip from './PlantInfoTooltip'

interface PlacedPlant {
  plant: Plant
  instanceId: string
  position: [number, number, number]
}

interface SceneContainerProps {
  selectedPlants: PlacedPlant[]
  season: Season
}

const MAX_PLANTS = 30

function PlantModel({
  placed,
  season,
  onHover
}: {
  placed: PlacedPlant
  season: Season
  onHover: (p: PlacedPlant | null) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const currentHeight = placed.plant.seasonalHeight[season]
  const currentColor = placed.plant.seasonalColor[season]
  const trunkHeight = currentHeight * 0.4
  const canopyHeight = currentHeight * 0.6
  const canopyRadius = placed.plant.canopyRadius
  const glowRadius = canopyRadius * 1.2

  useFrame(() => {
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = hovered ? 0.5 : 0
    }
  })

  const handlePointerOver = useCallback((e: any) => {
    e.stopPropagation()
    setHovered(true)
    onHover(placed)
  }, [placed, onHover])

  const handlePointerOut = useCallback((e: any) => {
    e.stopPropagation()
    setHovered(false)
    onHover(null)
  }, [onHover])

  return (
    <group
      ref={groupRef}
      position={placed.position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <mesh position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[placed.plant.trunkRadius, placed.plant.trunkRadius * 1.3, trunkHeight, 8]} />
        <meshStandardMaterial color="#5d4037" roughness={0.9} />
      </mesh>
      <mesh position={[0, trunkHeight + canopyHeight * 0.35, 0]}>
        <coneGeometry args={[canopyRadius, canopyHeight * 0.55, 8]} />
        <meshStandardMaterial color={currentColor} roughness={0.7} />
      </mesh>
      <mesh position={[0, trunkHeight + canopyHeight * 0.75, 0]}>
        <coneGeometry args={[canopyRadius * 0.75, canopyHeight * 0.45, 8]} />
        <meshStandardMaterial color={currentColor} roughness={0.7} />
      </mesh>
      <mesh
        ref={glowRef}
        position={[0, trunkHeight + canopyHeight * 0.5, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[canopyRadius * 0.9, glowRadius, 32]} />
        <meshBasicMaterial color="#00b894" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function CameraController() {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const distance = 14
    const angle = Math.PI / 4
    camera.position.set(
      distance * Math.cos(angle) * Math.cos(0),
      distance * Math.sin(angle),
      distance * Math.cos(angle) * Math.sin(0)
    )
    camera.lookAt(0, 2, 0)
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 2, 0)
      controlsRef.current.update()
    }
  }, [camera])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        const distance = 14
        const angle = Math.PI / 4
        camera.position.set(
          distance * Math.cos(angle) * Math.cos(0),
          distance * Math.sin(angle),
          distance * Math.cos(angle) * Math.sin(0)
        )
        camera.lookAt(0, 2, 0)
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 2, 0)
          controlsRef.current.update()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      minDistance={3}
      maxDistance={20}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      enableDamping={true}
      dampingFactor={0.1}
      target={[0, 2, 0]}
    />
  )
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#7cb342" roughness={1} />
    </mesh>
  )
}

function SkyGradient() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.0}
        castShadow
      />
      <hemisphereLight
        args={['#87ceeb', '#7cb342', 0.4]}
      />
    </>
  )
}

const SceneContainer: React.FC<SceneContainerProps> = ({ selectedPlants, season }) => {
  const [hoveredPlant, setHoveredPlant] = useState<PlacedPlant | null>(null)

  const displayPlants = selectedPlants.slice(-MAX_PLANTS)

  return (
    <div style={styles.wrapper}>
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 100 }}
        style={{ background: 'linear-gradient(to bottom, #87ceeb, #f0f4f0)' }}
        onPointerMissed={() => setHoveredPlant(null)}
      >
        <SkyGradient />
        <Ground />
        {displayPlants.map((placed) => (
          <PlantModel
            key={placed.instanceId}
            placed={placed}
            season={season}
            onHover={setHoveredPlant}
          />
        ))}
        <CameraController />
      </Canvas>
      {hoveredPlant && (
        <PlantInfoTooltip
          plant={hoveredPlant.plant}
          season={season}
        />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    flex: 1,
    height: '100%',
    position: 'relative',
    overflow: 'hidden'
  }
}

export default SceneContainer
export type { PlacedPlant }
