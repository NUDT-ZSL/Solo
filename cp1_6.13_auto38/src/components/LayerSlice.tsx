import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Layer } from '@/types'

interface LayerSliceProps {
  layer: Layer
  isSelected: boolean
  onClick: () => void
  visible: boolean
  targetY: number
}

export function LayerSlice({ layer, isSelected, onClick, visible, targetY }: LayerSliceProps) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const currentY = useRef(targetY)
  const currentScaleY = useRef(1)
  const currentOpacity = useRef(0.7)

  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    const offsets = [
      [0, 0], [6, -3], [-4, 7], [5, -2], [-7, 4],
      [3, -5], [-5, 8], [7, -4], [-3, 6], [4, -7],
      [-6, 3], [8, -6], [-2, 5], [5, 8], [-8, -3],
      [6, 4], [-4, -6], [3, 7], [-7, -5], [9, -2]
    ]

    const halfSize = 90
    const vertices: [number, number][] = [
      [-halfSize, -halfSize],
      [-halfSize + 30, -halfSize],
      [0, -halfSize],
      [halfSize - 30, -halfSize],
      [halfSize, -halfSize],
      [halfSize, -halfSize + 30],
      [halfSize, 0],
      [halfSize, halfSize - 30],
      [halfSize, halfSize],
      [halfSize - 30, halfSize],
      [0, halfSize],
      [-halfSize + 30, halfSize],
      [-halfSize, halfSize],
      [-halfSize, halfSize - 30],
      [-halfSize, 0],
      [-halfSize, -halfSize + 30],
    ]

    const startVert = vertices[0]
    const startOff = offsets[0]
    shape.moveTo(startVert[0] + startOff[0], startVert[1] + startOff[1])

    for (let i = 1; i < vertices.length; i++) {
      const v = vertices[i]
      const o = offsets[i % offsets.length]
      shape.lineTo(v[0] + o[0], v[1] + o[1])
    }

    shape.lineTo(startVert[0] + startOff[0], startVert[1] + startOff[1])

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: layer.thickness / 50,
      bevelEnabled: true,
      bevelThickness: 0.5,
      bevelSize: 0.5,
      bevelSegments: 2,
    }

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geo.center()
    return geo
  }, [layer.thickness])

  const baseColor = useMemo(() => {
    const c = new THREE.Color(layer.color)
    if (isSelected) {
      c.offsetHSL(0, 0.2, 0)
    }
    return c
  }, [layer.color, isSelected])

  const targetOpacity = isSelected ? 0.85 : 0.6
  const targetScaleY = visible ? 1 : 0
  const actualTargetY = isSelected ? targetY + 8 : targetY

  useFrame(() => {
    if (!groupRef.current || !materialRef.current) return

    currentY.current += (actualTargetY - currentY.current) * 0.1
    groupRef.current.position.y = currentY.current

    currentScaleY.current += (targetScaleY - currentScaleY.current) * 0.1
    groupRef.current.scale.y = currentScaleY.current

    currentOpacity.current += (visible ? targetOpacity : 0 - currentOpacity.current) * 0.1
    materialRef.current.opacity = currentOpacity.current

    const c = new THREE.Color(layer.color)
    if (isSelected) {
      c.offsetHSL(0, 0.2, 0)
    }
    materialRef.current.color.copy(c)
  })

  const edges = useMemo(() => {
    return new THREE.EdgesGeometry(geometry, 15)
  }, [geometry])

  return (
    <group ref={groupRef}>
      <mesh
        geometry={geometry}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
        onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'auto' }}
        onClick={(e) => { e.stopPropagation(); onClick() }}
      >
        <meshStandardMaterial
          ref={materialRef}
          color={baseColor}
          transparent
          opacity={0.7}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>
      {isSelected && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="white" linewidth={1} />
        </lineSegments>
      )}
    </group>
  )
}
