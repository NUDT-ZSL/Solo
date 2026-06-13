import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef, useState, useCallback, useEffect, Suspense } from 'react'
import * as THREE from 'three'
import type { Building } from '../types'
import { useCityStore } from '../store/useCityStore'

const sharedCamera: { current: THREE.PerspectiveCamera | null } = { current: null }

interface BuildingMeshProps {
  building: Building
  isSelected: boolean
  onClick: (e: any) => void
  onPointerOver: (e: any) => void
  onPointerOut: () => void
}

function BuildingMesh({ building, isSelected, onClick, onPointerOver, onPointerOut }: BuildingMeshProps) {
  const bodyMeshRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)
  const crownMeshRef = useRef<THREE.Mesh>(null)
  const currentHeight = useRef(building.height)

  useFrame((state, delta) => {
    if (!bodyMeshRef.current) return

    const targetHeight = building.height
    const lerpFactor = Math.min(delta * 3.5, 1)
    currentHeight.current = THREE.MathUtils.lerp(currentHeight.current, targetHeight, lerpFactor)

    const h = currentHeight.current
    bodyMeshRef.current.scale.set(building.width, h, building.depth)
    bodyMeshRef.current.position.y = h / 2

    if (edgesRef.current) {
      edgesRef.current.scale.set(building.width, h, building.depth)
      edgesRef.current.position.y = h / 2
    }

    if (crownMeshRef.current) {
      if (building.hasCrown && h > 2) {
        crownMeshRef.current.scale.set(building.width * 0.85, 5, building.depth * 0.85)
        crownMeshRef.current.position.y = h + 2.5
        crownMeshRef.current.visible = true
      } else {
        crownMeshRef.current.visible = false
      }
    }
  })

  return (
    <group position={[building.x, 0, building.z]}>
      <mesh
        ref={bodyMeshRef}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={building.color} roughness={0.6} metalness={0.2} />
      </mesh>

      {isSelected && (
        <lineSegments ref={edgesRef}>
          <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
          <lineBasicMaterial color="#ffffff" />
        </lineSegments>
      )}

      <mesh ref={crownMeshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
    </group>
  )
}

function Ground() {
  const size = 200
  const divisions = 20

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#e5e5e5" />
      </mesh>
      <gridHelper
        args={[size, divisions, '#a3a3a3', '#d4d4d4']}
        position={[0, 0.01, 0]}
      />
    </group>
  )
}

function SceneInner() {
  const buildings = useCityStore((state) => state.buildings)
  const selectedIds = useCityStore((state) => state.selectedIds)
  const temporarySelectedIds = useCityStore((state) => state.temporarySelectedIds)
  const selectBuilding = useCityStore((state) => state.selectBuilding)
  const { camera, gl } = useThree()

  useEffect(() => {
    sharedCamera.current = camera as THREE.PerspectiveCamera
  }, [camera])

  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    document.body.style.cursor = hoveredId ? 'pointer' : 'auto'
    return () => { document.body.style.cursor = 'auto' }
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

      {buildings.map((building) => {
        const isHighlighted = selectedIds.has(building.id) || temporarySelectedIds.has(building.id)
        return (
          <BuildingMesh
            key={building.id}
            building={building}
            isSelected={isHighlighted}
            onClick={handleBuildingClick(building)}
            onPointerOver={handlePointerOver(building)}
            onPointerOut={handlePointerOut}
          />
        )
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={20}
        maxDistance={300}
        maxPolarAngle={Math.PI / 2.1}
        enablePan={true}
      />
    </>
  )
}

export default function CityScene() {
  const containerRef = useRef<HTMLDivElement>(null)

  const buildings = useCityStore((state) => state.buildings)
  const clearSelection = useCityStore((state) => state.clearSelection)
  const selectBuildings = useCityStore((state) => state.selectBuildings)
  const setTemporarySelected = useCityStore((state) => state.setTemporarySelected)
  const clearTemporarySelected = useCityStore((state) => state.clearTemporarySelected)

  const [isBoxSelecting, setIsBoxSelecting] = useState(false)
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null)
  const [boxEnd, setBoxEnd] = useState<{ x: number; y: number } | null>(null)

  const checkBuildingsInBox = useCallback((left: number, right: number, top: number, bottom: number): string[] => {
    if (!containerRef.current || !sharedCamera.current) return []

    const camera = sharedCamera.current
    const rect = containerRef.current.getBoundingClientRect()
    const result: string[] = []

    for (const building of buildings) {
      const halfW = building.width / 2
      const halfD = building.depth / 2
      const h = Math.max(building.height, 1)

      const corners = [
        new THREE.Vector3(building.x - halfW, 0, building.z - halfD),
        new THREE.Vector3(building.x + halfW, 0, building.z - halfD),
        new THREE.Vector3(building.x - halfW, 0, building.z + halfD),
        new THREE.Vector3(building.x + halfW, 0, building.z + halfD),
        new THREE.Vector3(building.x - halfW, h, building.z - halfD),
        new THREE.Vector3(building.x + halfW, h, building.z - halfD),
        new THREE.Vector3(building.x - halfW, h, building.z + halfD),
        new THREE.Vector3(building.x + halfW, h, building.z + halfD)
      ]

      let minX = Infinity, maxX = -Infinity
      let minY = Infinity, maxY = -Infinity
      let hasVisiblePoint = false

      for (const corner of corners) {
        const projected = corner.clone().project(camera)
        if (projected.z < 1 && projected.z > -1) {
          hasVisiblePoint = true
          const x = (projected.x * 0.5 + 0.5) * rect.width
          const y = (-projected.y * 0.5 + 0.5) * rect.height
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }

      if (hasVisiblePoint &&
          maxX >= left && minX <= right &&
          maxY >= top && minY <= bottom) {
        result.push(building.id)
      }
    }

    return result
  }, [buildings])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return
    if (e.shiftKey && e.button === 0) {
      e.preventDefault()
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setIsBoxSelecting(true)
      setBoxStart({ x, y })
      setBoxEnd({ x, y })
    }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isBoxSelecting || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const curX = e.clientX - rect.left
    const curY = e.clientY - rect.top
    setBoxEnd({ x: curX, y: curY })

    if (boxStart) {
      const left = Math.min(boxStart.x, curX)
      const right = Math.max(boxStart.x, curX)
      const top = Math.min(boxStart.y, curY)
      const bottom = Math.max(boxStart.y, curY)
      const ids = checkBuildingsInBox(left, right, top, bottom)
      setTemporarySelected(ids)
    }
  }, [isBoxSelecting, boxStart, checkBuildingsInBox, setTemporarySelected])

  const handlePointerUp = useCallback(() => {
    if (!isBoxSelecting || !boxStart || !boxEnd) {
      setIsBoxSelecting(false)
      return
    }

    const left = Math.min(boxStart.x, boxEnd.x)
    const right = Math.max(boxStart.x, boxEnd.x)
    const top = Math.min(boxStart.y, boxEnd.y)
    const bottom = Math.max(boxStart.y, boxEnd.y)

    const dx = right - left
    const dy = bottom - top

    if (dx < 5 && dy < 5) {
      clearTemporarySelected()
      setIsBoxSelecting(false)
      setBoxStart(null)
      setBoxEnd(null)
      return
    }

    const ids = checkBuildingsInBox(left, right, top, bottom)
    if (ids.length > 0) {
      selectBuildings(ids)
    } else {
      clearSelection()
    }

    setIsBoxSelecting(false)
    setBoxStart(null)
    setBoxEnd(null)
  }, [isBoxSelecting, boxStart, boxEnd, checkBuildingsInBox, selectBuildings, clearSelection, clearTemporarySelected])

  const handlePointerCancel = useCallback(() => {
    setIsBoxSelecting(false)
    setBoxStart(null)
    setBoxEnd(null)
    clearTemporarySelected()
  }, [clearTemporarySelected])

  const handleContainerClick = useCallback(() => {
    if (!isBoxSelecting) {
      clearSelection()
    }
  }, [clearSelection, isBoxSelecting])

  const selectionBoxVisible = isBoxSelecting && boxStart && boxEnd
  const selectionBoxStyle = selectionBoxVisible ? {
    left: Math.min(boxStart!.x, boxEnd!.x),
    top: Math.min(boxStart!.y, boxEnd!.y),
    width: Math.abs(boxEnd!.x - boxStart!.x),
    height: Math.abs(boxEnd!.y - boxStart!.y),
    display: 'block' as const
  } : {
    display: 'none' as const
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleContainerClick}
    >
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
          <SceneInner />
        </Suspense>
      </Canvas>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        <div
          style={{
            position: 'absolute',
            ...selectionBoxStyle,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            border: '2px solid #2563eb',
            pointerEvents: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>
    </div>
  )
}
