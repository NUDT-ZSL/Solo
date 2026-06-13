import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Edges } from '@react-three/drei'
import { useRef, useState, useCallback, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import type { Building } from '../types'
import { useCityStore } from '../store/useCityStore'

interface BuildingMeshProps {
  building: Building
  isSelected: boolean
  onClick: (e: any) => void
  onPointerOver: (e: any) => void
  onPointerOut: () => void
}

function BuildingMesh({ building, isSelected, onClick, onPointerOver, onPointerOut }: BuildingMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)

  useFrame((state, delta) => {
    if (meshRef.current) {
      const targetY = building.height / 2
      const currentY = meshRef.current.position.y
      meshRef.current.position.y = THREE.MathUtils.lerp(currentY, targetY, delta * 5)
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, building.height / 5, delta * 5)
    }
  })

  return (
    <group position={[building.x, 0, building.z]}>
      <mesh
        ref={meshRef}
        position={[0, 2.5, 0]}
        scale={[building.width / 10, 1, building.depth / 10]}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <boxGeometry args={[10, 5, 10]} />
        <meshStandardMaterial color={building.color} roughness={0.7} metalness={0.1} />
        {isSelected && (
          <Edges ref={edgesRef} threshold={15} color="#ffffff" lineWidth={2} />
        )}
      </mesh>
      {building.hasCrown && building.height > 5 && (
        <mesh
          position={[0, building.height + 2.5, 0]}
          scale={[building.width / 12, 1, building.depth / 12]}
        >
          <boxGeometry args={[10, 5, 10]} />
          <meshPhysicalMaterial
            color="#ffffff"
            transparent
            opacity={0.3}
            roughness={0.1}
            metalness={0.9}
            transmission={0.5}
            thickness={0.5}
          />
        </mesh>
      )}
    </group>
  )
}

function Ground() {
  const size = 200
  const gridSize = 10
  const divisions = size / gridSize

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[size, size, divisions, divisions]} />
        <meshStandardMaterial color="#e5e5e5" />
      </mesh>
      <gridHelper
        args={[size, divisions, '#a3a3a3', '#d4d4d4']}
        position={[0, 0.01, 0]}
      />
    </group>
  )
}

interface SelectionBoxProps {
  startPoint: { x: number; y: number } | null
  endPoint: { x: number; y: number } | null
  visible: boolean
}

function SelectionBox({ startPoint, endPoint, visible }: SelectionBoxProps) {
  if (!visible || !startPoint || !endPoint) return null

  const left = Math.min(startPoint.x, endPoint.x)
  const top = Math.min(startPoint.y, endPoint.y)
  const width = Math.abs(endPoint.x - startPoint.x)
  const height = Math.abs(endPoint.y - startPoint.y)

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        border: '2px solid #2563eb',
        pointerEvents: 'none',
        zIndex: 100
      }}
    />
  )
}

interface SceneContentProps {
  containerRef: React.RefObject<HTMLDivElement>
}

function SceneContent({ containerRef }: SceneContentProps) {
  const { camera, gl, scene } = useThree()
  const buildings = useCityStore((state) => state.buildings)
  const selectedIds = useCityStore((state) => state.selectedIds)
  const selectBuilding = useCityStore((state) => state.selectBuilding)
  const selectBuildings = useCityStore((state) => state.selectBuildings)
  const clearSelection = useCityStore((state) => state.clearSelection)
  const isTransitioning = useCityStore((state) => state.isTransitioning)
  const setTransitioning = useCityStore((state) => state.setTransitioning)
  const animateBuildings = useCityStore((state) => state.animateBuildings)

  const [isBoxSelecting, setIsBoxSelecting] = useState(false)
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null)
  const [boxEnd, setBoxEnd] = useState<{ x: number; y: number } | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        animateBuildings()
        setTimeout(() => setTransitioning(false), 1000)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isTransitioning, animateBuildings, setTransitioning])

  useEffect(() => {
    document.body.style.cursor = hoveredId ? 'pointer' : 'auto'
  }, [hoveredId])

  const handleBuildingClick = useCallback((building: Building) => (e: any) => {
    e.stopPropagation()
    selectBuilding(building.id, e.shiftKey)
  }, [selectBuilding])

  const handlePointerOver = useCallback((building: Building) => (e: any) => {
    e.stopPropagation()
    setHoveredId(building.id)
  }, [])

  const handlePointerOut = useCallback(() => {
    setHoveredId(null)
  }, [])

  const handlePointerDown = useCallback((e: any) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    if (e.shiftKey && e.button === 0) {
      setIsBoxSelecting(true)
      setBoxStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      setBoxEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }, [containerRef])

  const handlePointerMove = useCallback((e: any) => {
    if (!isBoxSelecting || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setBoxEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }, [isBoxSelecting, containerRef])

  const handlePointerUp = useCallback((e: any) => {
    if (!isBoxSelecting || !containerRef.current || !boxStart || !boxEnd) {
      setIsBoxSelecting(false)
      return
    }

    const rect = containerRef.current.getBoundingClientRect()
    const left = Math.min(boxStart.x, boxEnd.x)
    const right = Math.max(boxStart.x, boxEnd.x)
    const top = Math.min(boxStart.y, boxEnd.y)
    const bottom = Math.max(boxStart.y, boxEnd.y)

    const selectedBuildingIds: string[] = []

    for (const building of buildings) {
      const screenPos = new THREE.Vector3(building.x, building.height / 2, building.z)
      screenPos.project(camera)

      const x = (screenPos.x * 0.5 + 0.5) * rect.width
      const y = (-screenPos.y * 0.5 + 0.5) * rect.height

      if (x >= left && x <= right && y >= top && y <= bottom) {
        if (screenPos.z < 1) {
          selectedBuildingIds.push(building.id)
        }
      }
    }

    if (selectedBuildingIds.length > 0) {
      selectBuildings(selectedBuildingIds)
    }

    setIsBoxSelecting(false)
    setBoxStart(null)
    setBoxEnd(null)
  }, [isBoxSelecting, boxStart, boxEnd, buildings, camera, selectBuildings, containerRef])

  const handleCanvasClick = useCallback(() => {
    if (!isBoxSelecting) {
      clearSelection()
    }
  }, [clearSelection, isBoxSelecting])

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[100, 100, 50]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-50, 50, -50]} intensity={0.3} />

      <Ground />

      {buildings.map((building) => (
        <BuildingMesh
          key={building.id}
          building={building}
          isSelected={selectedIds.has(building.id)}
          onClick={handleBuildingClick(building)}
          onPointerOver={handlePointerOver(building)}
          onPointerOut={handlePointerOut}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={20}
        maxDistance={300}
        maxPolarAngle={Math.PI / 2.1}
      />

      <SelectionBox
        startPoint={boxStart}
        endPoint={boxEnd}
        visible={isBoxSelecting}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: isBoxSelecting ? 'none' : 'auto'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleCanvasClick}
      />
    </>
  )
}

export default function CityScene() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [120, 80, 120], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        }}
      >
        <color attach="background" args={['#f0f4f8']} />
        <fog attach="fog" args={['#f0f4f8', 150, 400]} />
        <Suspense fallback={null}>
          <SceneContent containerRef={containerRef} />
        </Suspense>
      </Canvas>
    </div>
  )
}
