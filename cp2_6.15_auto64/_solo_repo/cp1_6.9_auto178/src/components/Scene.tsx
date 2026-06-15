import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  Dataset,
  NodeData,
  FiberData,
  hexToRgb,
  CATEGORY_LABELS,
} from '../utils/dataGenerator'
import {
  InteractionState,
  createInteractionState,
  triggerNodeClick,
  triggerNodeHover,
  getPulseScale,
  getPulseEmissive,
  getFiberWaveOffset,
  getNodeBounceOffset,
  getHoverIntensity,
  getFiberHighlightOpacity,
  cleanupExpiredStates,
} from '../utils/interactionManager'

const SEGMENTS_PER_FIBER = 8
const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 0, 10]

interface SceneProps {
  dataset: Dataset
  onHoverNodeChange: (node: NodeData | null) => void
  resetTrigger: number
}

function hexToThreeColor(hex: string): THREE.Color {
  const [r, g, b] = hexToRgb(hex)
  return new THREE.Color(r / 255, g / 255, b / 255)
}

interface NodeRuntimeState {
  breathPhase: number
  breathSpeed: number
  walkOffset: [number, number, number]
}

function createNodeRuntimeStates(nodes: NodeData[]): Map<number, NodeRuntimeState> {
  const map = new Map<number, NodeRuntimeState>()
  nodes.forEach((node) => {
    map.set(node.id, {
      breathPhase: Math.random() * Math.PI * 2,
      breathSpeed: (Math.random() * 1.5 + 1.5) / 1000,
      walkOffset: [0, 0, 0],
    })
  })
  return map
}

interface NodeMeshProps {
  node: NodeData
  runtimeState: NodeRuntimeState
  interactionState: InteractionState
  currentTimeRef: React.MutableRefObject<number>
  onClick: (e: ThreeEvent<MouseEvent>) => void
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void
  positionRef: React.MutableRefObject<[number, number, number]>
}

function NodeMesh({
  node,
  runtimeState,
  interactionState,
  currentTimeRef,
  onClick,
  onPointerOver,
  onPointerOut,
  positionRef,
}: NodeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const color = useMemo(() => hexToThreeColor(node.color), [node.color])
  const emissiveColor = useMemo(() => hexToThreeColor(node.color), [node.color])

  useFrame(() => {
    const mesh = meshRef.current
    const glow = glowRef.current
    if (!mesh || !glow) return

    const currentTime = currentTimeRef.current

    runtimeState.breathPhase += runtimeState.breathSpeed * 16

    const breathScale = Math.sin(runtimeState.breathPhase) * 0.05
    const pulseScale = getPulseScale(interactionState, node.id, currentTime)
    const totalScale = node.baseRadius * (1 + breathScale) * pulseScale

    mesh.scale.setScalar(totalScale)
    glow.scale.setScalar(totalScale * 1.3)

    const pulseEmissive = getPulseEmissive(interactionState, node.id, currentTime)
    const hoverIntensity = getHoverIntensity(interactionState, node.id, currentTime)

    const material = mesh.material as THREE.MeshPhongMaterial
    material.emissiveIntensity = 0.2 + pulseEmissive + hoverIntensity * 0.5

    const glowMaterial = glow.material as THREE.MeshBasicMaterial
    const hoverScale = 1 + hoverIntensity * 0.5
    glow.scale.setScalar(totalScale * 1.3 * hoverScale)

    if (hoverIntensity > 0.5) {
      glowMaterial.color.setRGB(1, 1, 1)
      glowMaterial.opacity = 0.15 + hoverIntensity * 0.2
    } else {
      glowMaterial.color.copy(emissiveColor)
      glowMaterial.opacity = 0.08 + hoverIntensity * 0.1
    }

    const bounceOffset = getNodeBounceOffset(interactionState, node.id, currentTime)
    const walk = runtimeState.walkOffset
    const newPos: [number, number, number] = [
      node.initialPosition[0] + walk[0] + bounceOffset[0],
      node.initialPosition[1] + walk[1] + bounceOffset[1],
      node.initialPosition[2] + walk[2] + bounceOffset[2],
    ]
    mesh.position.set(newPos[0], newPos[1], newPos[2])
    glow.position.set(newPos[0], newPos[1], newPos[2])
    positionRef.current = newPos
  })

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        position={node.initialPosition}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshPhongMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={0.2}
          shininess={60}
          specular={new THREE.Color(0x333333)}
        />
      </mesh>
      <mesh ref={glowRef} position={node.initialPosition}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={emissiveColor}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

interface FiberLineProps {
  fiber: FiberData
  nodes: NodeData[]
  nodePositionsRef: React.MutableRefObject<Map<number, [number, number, number]>>
  interactionState: InteractionState
  currentTimeRef: React.MutableRefObject<number>
  geometryRef: React.MutableRefObject<THREE.BufferGeometry | null>
  positionsRef: React.MutableRefObject<Float32Array>
}

function FiberLine({
  fiber,
  nodes,
  nodePositionsRef,
  interactionState,
  currentTimeRef,
  geometryRef,
  positionsRef,
}: FiberLineProps) {
  const lineRef = useRef<THREE.Line>(null)
  const nodeA = nodes.find((n) => n.id === fiber.nodeAId)!
  const nodeB = nodes.find((n) => n.id === fiber.nodeBId)!
  const colorA = useMemo(() => hexToThreeColor(fiber.colorA), [fiber.colorA])
  const colorB = useMemo(() => hexToThreeColor(fiber.colorB), [fiber.colorB])

  const colors = useMemo(() => {
    const arr = new Float32Array((SEGMENTS_PER_FIBER + 1) * 3)
    for (let i = 0; i <= SEGMENTS_PER_FIBER; i++) {
      const t = i / SEGMENTS_PER_FIBER
      const r = colorA.r + (colorB.r - colorA.r) * t
      const g = colorA.g + (colorB.g - colorA.g) * t
      const b = colorA.b + (colorB.b - colorA.b) * t
      arr[i * 3] = r
      arr[i * 3 + 1] = g
      arr[i * 3 + 2] = b
    }
    return arr
  }, [colorA, colorB])

  useFrame(() => {
    const line = lineRef.current
    if (!line || !geometryRef.current) return

    const currentTime = currentTimeRef.current
    const posA = nodePositionsRef.current.get(fiber.nodeAId) || nodeA.initialPosition
    const posB = nodePositionsRef.current.get(fiber.nodeBId) || nodeB.initialPosition

    const dx = posB[0] - posA[0]
    const dy = posB[1] - posA[1]
    const dz = posB[2] - posA[2]
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
    const nx = -dy / len
    const ny = dx / len
    const nz = 0

    for (let i = 0; i <= SEGMENTS_PER_FIBER; i++) {
      const t = i / SEGMENTS_PER_FIBER
      const waveOffset = getFiberWaveOffset(interactionState, fiber.id, t, currentTime)

      positionsRef.current[i * 3] = posA[0] + dx * t + nx * waveOffset
      positionsRef.current[i * 3 + 1] = posA[1] + dy * t + ny * waveOffset
      positionsRef.current[i * 3 + 2] = posA[2] + dz * t + nz * waveOffset
    }

    geometryRef.current.attributes.position.needsUpdate = true

    const opacity = getFiberHighlightOpacity(interactionState, fiber.id, fiber, currentTime)
    const material = line.material as THREE.LineBasicMaterial
    material.opacity = opacity
  })

  return (
    <primitive
      object={new THREE.Line()}
      ref={lineRef as React.MutableRefObject<THREE.Line>}
    >
      <bufferGeometry attach="geometry" ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={SEGMENTS_PER_FIBER + 1}
          array={positionsRef.current}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={SEGMENTS_PER_FIBER + 1}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.3} linewidth={1} />
    </primitive>
  )
}

function SceneContent({ dataset, onHoverNodeChange, resetTrigger }: SceneProps) {
  const { nodes, fibers } = dataset

  const currentTimeRef = useRef(0)
  const interactionStateRef = useRef<InteractionState>(
    createInteractionState(nodes, fibers)
  )
  const nodeRuntimeStatesRef = useRef<Map<number, NodeRuntimeState>>(
    createNodeRuntimeStates(nodes)
  )
  const nodePositionsRef = useRef<Map<number, [number, number, number]>>(new Map())
  const controlsRef = useRef<any>(null)
  const [, forceUpdate] = useState(0)

  const fiberGeometriesRef = useRef<Map<string, THREE.BufferGeometry | null>>(new Map())
  const fiberPositionsRef = useRef<Map<string, Float32Array>>(new Map())

  useMemo(() => {
    fiberGeometriesRef.current.clear()
    fiberPositionsRef.current.clear()
    nodes.forEach((node) => {
      nodePositionsRef.current.set(node.id, [...node.initialPosition] as [number, number, number])
    })
    fibers.forEach((fiber) => {
      const positions = new Float32Array((SEGMENTS_PER_FIBER + 1) * 3)
      fiberPositionsRef.current.set(fiber.id, positions)
      fiberGeometriesRef.current.set(fiber.id, null)
    })
  }, [nodes, fibers])

  const handleNodeClick = useCallback(
    (nodeId: number) => (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      triggerNodeClick(interactionStateRef.current, nodeId, nodes, currentTimeRef.current)
    },
    [nodes]
  )

  const handleNodePointerOver = useCallback(
    (node: NodeData) => (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      triggerNodeHover(interactionStateRef.current, node.id, true, currentTimeRef.current)
      onHoverNodeChange(node)
      document.body.style.cursor = 'pointer'
    },
    [onHoverNodeChange]
  )

  const handleNodePointerOut = useCallback(
    (node: NodeData) => (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      triggerNodeHover(interactionStateRef.current, node.id, false, currentTimeRef.current)
      onHoverNodeChange(null)
      document.body.style.cursor = 'default'
    },
    [onHoverNodeChange]
  )

  useEffect(() => {
    nodeRuntimeStatesRef.current.forEach((state) => {
      state.breathPhase = Math.random() * Math.PI * 2
      state.walkOffset = [0, 0, 0]
    })
    interactionStateRef.current = createInteractionState(nodes, fibers)
    nodes.forEach((node) => {
      nodePositionsRef.current.set(node.id, [...node.initialPosition] as [number, number, number])
    })
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
    forceUpdate((n) => n + 1)
  }, [resetTrigger, nodes, fibers])

  useFrame((_, delta) => {
    currentTimeRef.current += delta * 1000

    nodeRuntimeStatesRef.current.forEach((state) => {
      state.walkOffset = [
        state.walkOffset[0] + (Math.random() - 0.5) * 0.002,
        state.walkOffset[1] + (Math.random() - 0.5) * 0.002,
        state.walkOffset[2] + (Math.random() - 0.5) * 0.002,
      ]
      state.walkOffset[0] = Math.max(-0.05, Math.min(0.05, state.walkOffset[0]))
      state.walkOffset[1] = Math.max(-0.05, Math.min(0.05, state.walkOffset[1]))
      state.walkOffset[2] = Math.max(-0.05, Math.min(0.05, state.walkOffset[2]))
    })

    cleanupExpiredStates(interactionStateRef.current, currentTimeRef.current)
  })

  const createPositionRef = (nodeId: number) => {
    return {
      get current(): [number, number, number] {
        return nodePositionsRef.current.get(nodeId) || [0, 0, 0]
      },
      set current(val: [number, number, number]) {
        nodePositionsRef.current.set(nodeId, val)
      },
    } as React.MutableRefObject<[number, number, number]>
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#8888ff" />
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#ffffff" />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={10}
        enablePan={true}
      />

      {fibers.map((fiber) => (
        <FiberLine
          key={fiber.id}
          fiber={fiber}
          nodes={nodes}
          nodePositionsRef={nodePositionsRef as unknown as React.MutableRefObject<
            Map<number, [number, number, number]>
          >}
          interactionState={interactionStateRef.current}
          currentTimeRef={currentTimeRef}
          geometryRef={
            {
              get current() {
                return fiberGeometriesRef.current.get(fiber.id) || null
              },
              set current(val) {
                fiberGeometriesRef.current.set(fiber.id, val)
              },
            } as React.MutableRefObject<THREE.BufferGeometry | null>
          }
          positionsRef={
            {
              get current() {
                return fiberPositionsRef.current.get(fiber.id)!
              },
              set current(_val) {},
            } as React.MutableRefObject<Float32Array>
          }
        />
      ))}

      {nodes.map((node) => (
        <NodeMesh
          key={node.id}
          node={node}
          runtimeState={nodeRuntimeStatesRef.current.get(node.id)!}
          interactionState={interactionStateRef.current}
          currentTimeRef={currentTimeRef}
          onClick={handleNodeClick(node.id)}
          onPointerOver={handleNodePointerOver(node)}
          onPointerOut={handleNodePointerOut(node)}
          positionRef={createPositionRef(node.id)}
        />
      ))}
    </>
  )
}

export function Scene({ dataset, onHoverNodeChange, resetTrigger }: SceneProps) {
  return (
    <Canvas
      camera={{ position: DEFAULT_CAMERA_POSITION, fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: 'linear-gradient(180deg, #0A0A2E 0%, #1A1A4E 100%)' }}
    >
      <SceneContent
        dataset={dataset}
        onHoverNodeChange={onHoverNodeChange}
        resetTrigger={resetTrigger}
      />
    </Canvas>
  )
}

export { CATEGORY_LABELS }
