import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface CuttingEvent {
  position: THREE.Vector3
  normal: THREE.Vector3
  innerColor: THREE.Color
  timestamp: number
}

interface RockModelProps {
  onCutting?: (event: CuttingEvent) => void
  resetTrigger?: number
}

const SURFACE_LAYERS = [
  { color: new THREE.Color('#ff9966'), depth: 0 },
  { color: new THREE.Color('#cc6644'), depth: 0.3 },
  { color: new THREE.Color('#884466'), depth: 0.6 },
  { color: new THREE.Color('#553388'), depth: 0.9 },
  { color: new THREE.Color('#3322aa'), depth: 1.2 },
]

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().copy(a).lerp(b, t)
}

function getLayerColor(depth: number): THREE.Color {
  if (depth <= 0) return SURFACE_LAYERS[0].color.clone()
  for (let i = 0; i < SURFACE_LAYERS.length - 1; i++) {
    const cur = SURFACE_LAYERS[i]
    const next = SURFACE_LAYERS[i + 1]
    if (depth >= cur.depth && depth < next.depth) {
      const t = (depth - cur.depth) / (next.depth - cur.depth)
      return lerpColor(cur.color, next.color, t)
    }
  }
  return SURFACE_LAYERS[SURFACE_LAYERS.length - 1].color.clone()
}

function pseudoNoise(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return n - Math.floor(n)
}

function fbm(x: number, y: number, z: number): number {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let maxValue = 0
  for (let i = 0; i < 4; i++) {
    value += amplitude * (pseudoNoise(x * frequency, y * frequency, z * frequency) * 2 - 1)
    maxValue += amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return value / maxValue
}

export default function RockModel({ onCutting, resetTrigger }: RockModelProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera, gl, scene } = useThree()
  const isDragging = useRef(false)
  const originalPositions = useRef<Float32Array | null>(null)
  const originalNormals = useRef<Float32Array | null>(null)
  const depthBuffer = useRef<Float32Array | null>(null)
  const baseColors = useRef<Float32Array | null>(null)
  const [hovered, setHovered] = useState(false)

  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(4, 4)
    const pos = geo.attributes.position
    const count = pos.count

    const originalPos = new Float32Array(count * 3)
    const depthArr = new Float32Array(count)
    const colorsArr = new Float32Array(count * 3)
    const normalsArr = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const ox = pos.getX(i)
      const oy = pos.getY(i)
      const oz = pos.getZ(i)

      const len = Math.sqrt(ox * ox + oy * oy + oz * oz)
      const nx = ox / len
      const ny = oy / len
      const nz = oz / len

      const noise1 = fbm(nx * 1.5, ny * 1.5, nz * 1.5)
      const noise2 = fbm(nx * 3, ny * 3, nz * 3)
      const deform = 1 + noise1 * 0.35 + noise2 * 0.12

      const rx = nx * deform * 4
      const ry = ny * deform * 4
      const rz = nz * deform * 4

      originalPos[i3] = rx
      originalPos[i3 + 1] = ry
      originalPos[i3 + 2] = rz

      depthArr[i] = 0

      const surfaceColor = SURFACE_LAYERS[0].color
      const colorVar = 0.9 + Math.abs(noise2) * 0.2
      colorsArr[i3] = Math.min(1, surfaceColor.r * colorVar)
      colorsArr[i3 + 1] = Math.min(1, surfaceColor.g * colorVar)
      colorsArr[i3 + 2] = Math.min(1, surfaceColor.b * colorVar)

      normalsArr[i3] = nx
      normalsArr[i3 + 1] = ny
      normalsArr[i3 + 2] = nz
    }

    const posAttr = new THREE.BufferAttribute(originalPos.slice(), 3)
    geo.setAttribute('position', posAttr)
    geo.setAttribute('color', new THREE.BufferAttribute(colorsArr, 3))
    geo.computeVertexNormals()

    const newNormals = geo.attributes.normal.array as Float32Array
    for (let i = 0; i < count * 3; i++) {
      normalsArr[i] = newNormals[i]
    }

    originalPositions.current = originalPos
    originalNormals.current = normalsArr
    depthBuffer.current = depthArr
    baseColors.current = colorsArr.slice()

    return geo
  }, [])

  useEffect(() => {
    if (!meshRef.current || !originalPositions.current || !depthBuffer.current) return
    const pos = geometry.attributes.position.array as Float32Array
    const colors = geometry.attributes.color.array as Float32Array
    const count = pos.length / 3

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      pos[i3] = originalPositions.current[i3]
      pos[i3 + 1] = originalPositions.current[i3 + 1]
      pos[i3 + 2] = originalPositions.current[i3 + 2]
      depthBuffer.current[i] = 0
      colors[i3] = baseColors.current![i3]
      colors[i3 + 1] = baseColors.current![i3 + 1]
      colors[i3 + 2] = baseColors.current![i3 + 2]
    }

    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.attributes.normal.needsUpdate = true
  }, [resetTrigger, geometry])

  const applyCut = (worldPoint: THREE.Vector3) => {
    if (!meshRef.current || !originalPositions.current || !originalNormals.current || !depthBuffer.current) return

    const mesh = meshRef.current
    const posAttr = geometry.attributes.position
    const posArr = posAttr.array as Float32Array
    const colors = geometry.attributes.color.array as Float32Array
    const normals = originalNormals.current
    const depths = depthBuffer.current
    const count = posAttr.count

    const localPoint = worldPoint.clone()
    mesh.worldToLocal(localPoint)

    const CUT_RADIUS = 1.5
    const CUT_DEPTH = 0.5
    const MAX_LAYER_DEPTH = 0.9

    let cutOccurred = false
    let cutColor = SURFACE_LAYERS[1].color.clone()

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const vx = posArr[i3]
      const vy = posArr[i3 + 1]
      const vz = posArr[i3 + 2]

      const dx = vx - localPoint.x
      const dy = vy - localPoint.y
      const dz = vz - localPoint.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dist < CUT_RADIUS) {
        const gaussian = Math.exp(-(dist * dist) / (0.5 * CUT_RADIUS * CUT_RADIUS))
        const falloff = Math.max(0, Math.min(1, gaussian))
        const depthAdd = CUT_DEPTH * falloff

        const nx = normals[i3]
        const ny = normals[i3 + 1]
        const nz = normals[i3 + 2]

        depths[i] = Math.min(MAX_LAYER_DEPTH, depths[i] + depthAdd)

        const d = depths[i]
        const newColor = getLayerColor(d)

        const op = originalPositions.current[i3]
        const opy = originalPositions.current[i3 + 1]
        const opz = originalPositions.current[i3 + 2]

        posArr[i3] = op - nx * d
        posArr[i3 + 1] = opy - ny * d
        posArr[i3 + 2] = opz - nz * d

        colors[i3] = newColor.r
        colors[i3 + 1] = newColor.g
        colors[i3 + 2] = newColor.b

        if (falloff > 0.5) {
          cutOccurred = true
          cutColor = newColor
        }
      }
    }

    posAttr.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.attributes.normal.needsUpdate = true

    if (cutOccurred && onCutting) {
      const normal = new THREE.Vector3()
      const localNormal = new THREE.Vector3()
      let idx = 0
      let minDist = Infinity
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        const vx = posArr[i3]
        const vy = posArr[i3 + 1]
        const vz = posArr[i3 + 2]
        const dx = vx - localPoint.x
        const dy = vy - localPoint.y
        const dz = vz - localPoint.z
        const dist = dx * dx + dy * dy + dz * dz
        if (dist < minDist) {
          minDist = dist
          idx = i
        }
      }
      localNormal.set(
        geometry.attributes.normal.getX(idx),
        geometry.attributes.normal.getY(idx),
        geometry.attributes.normal.getZ(idx),
      )
      mesh.localToWorld(localNormal)
      normal.copy(localNormal).normalize()

      const worldPos = localPoint.clone()
      mesh.localToWorld(worldPos)

      onCutting({
        position: worldPos,
        normal: normal,
        innerColor: cutColor,
        timestamp: performance.now(),
      })
    }
  }

  const handlePointerDown = (e: any) => {
    if (e.button !== 0) return
    e.stopPropagation()
    isDragging.current = true
    setHovered(true)
    const point = e.point as THREE.Vector3
    applyCut(point)
  }

  const handlePointerMove = (e: any) => {
    e.stopPropagation()
    if (isDragging.current) {
      const point = e.point as THREE.Vector3
      applyCut(point)
    }
  }

  const handlePointerUp = () => {
    isDragging.current = false
    setHovered(false)
  }

  const handlePointerEnter = () => {
    setHovered(true)
  }

  const handlePointerLeave = () => {
    setHovered(false)
    isDragging.current = false
  }

  useFrame((_, delta) => {
    if (meshRef.current && !isDragging.current) {
      meshRef.current.rotation.y += delta * 0.03
    }
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        vertexColors
        metalness={0.35}
        roughness={0.55}
        envMapIntensity={0.8}
        flatShading={false}
      />
    </mesh>
  )
}
