import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
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
  const bodyMeshRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)
  const crownMeshRef = useRef<THREE.Mesh>(null)
  const currentHeight = useRef(building.height)

  useFrame((state, delta) => {
    if (!bodyMeshRef.current) return

    const targetHeight = building.height
    const lerpFactor = Math.min(delta * 4, 1)
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
        crownMeshRef.current.visible = true
        crownMeshRef.current.scale.set(building.width * 0.85, 5, building.depth * 0.85)
        crownMeshRef.current.position.y = h + 2.5
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

      <mesh ref={crownMeshRef} visible={false}>
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
  const gridSize = 10
  const divisions = size / gridSize

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
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

interface SceneContentProps {
  onBoxSelectStart: () => void
  onBoxSelectEnd: () => void
  isBoxSelecting: boolean
  setBoxStart: (p: { x: number; y: number } | null) => void
  setBoxEnd: (p: { x: number; y: number } | null) => void
  containerRef: React.RefObject<HTMLDivElement>
}

function SceneContent({
  onBoxSelectStart,
  onBoxSelectEnd,
  isBoxSelecting,
  setBoxStart,
  setBoxEnd,
  containerRef
}: SceneContentProps) {
  const buildings = useCityStore((state) => state.buildings)
  const selectedIds = useCityStore((state) => state.selectedIds)
  const selectBuilding = useCityStore((state) => state.selectBuilding)
  const selectBuildings = useCityStore((state) => state.selectBuildings)
  const clearSelection = useCityStore((state) => state.clearSelection)
  const { camera, gl } = useThree()
  const orbitRef = useRef<any>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    document.body.style.cursor = hoveredId ? 'pointer' : 'auto'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hoveredId])

  useEffect(() => {
    if (orbitRef.current) {
      orbitRef.current.enabled = !isBoxSelecting
    }
  }, [isBoxSelecting])

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

  const getBuildingScreenBounds = useCallback((building: Building): { minX: number; maxX: number; minY: number; maxY: number } | null => {
    if (!containerRef.current || !camera) return null

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

    const rect = containerRef.current.getBoundingClientRect()
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

    if (!hasVisiblePoint) return null
    return { minX, maxX, minY, maxY }
  }, [camera, containerRef])

  const handlePointerDown = useCallback((e: any) => {
    if (e.shiftKey && e.button === 0) {
      e.stopPropagation()
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      onBoxSelectStart()
      setBoxStart({ x, y })
      setBoxEnd({ x, y })
    }
  }, [onBoxSelectStart, setBoxStart, setBoxEnd, containerRef])

  const handlePointerMove = useCallback((e: any) => {
    if (!isBoxSelecting || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setBoxEnd({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }, [isBoxSelecting, setBoxEnd, containerRef])

  const handlePointerUp = useCallback((e: any) => {
    if (!isBoxSelecting) return

    const boxStart = (e as any)._boxStart
    const boxEnd = (e as any)._boxEnd

    onBoxSelectEnd()
  }, [isBoxSelecting, onBoxSelectEnd])

  const handleCanvasPointerMissed = useCallback((e: any) => {
    if (!e.shiftKey) {
      clearSelection()
    }
  }, [clearSelection])

  useEffect(() => {
    const canvas = gl.domElement
    if (!canvas) return

    const onPointerDown = (e: PointerEvent) => {
      if (e.shiftKey && e.button === 0) {
        e.preventDefault()
        e.stopPropagation()
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const x = e.client