import React, { useRef, useMemo } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { NodeData, LinkData, ParticleData } from './dataGenerator'

interface NetworkSceneProps {
  nodes: NodeData[]
  links: LinkData[]
  particles: ParticleData[]
  onNodeHover: (node: NodeData | null, event?: React.MouseEvent) => void
}

function bezierPoint(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  t: number
): THREE.Vector3 {
  const invT = 1 - t
  return new THREE.Vector3(
    invT * invT * p0.x + 2 * invT * t * p1.x + t * t * p2.x,
    invT * invT * p0.y + 2 * invT * t * p1.y + t * t * p2.y,
    invT * invT * p0.z + 2 * invT * t * p1.z + t * t * p2.z
  )
}

function ServerNode({
  node,
  onHover
}: {
  node: NodeData
  onHover: (node: NodeData | null, event?: React.MouseEvent) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = React.useState(false)

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(true)
    const syntheticEvent = { clientX: e.clientX, clientY: e.clientY } as React.MouseEvent
    onHover(node, syntheticEvent)
  }

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(false)
    onHover(null)
  }

  useFrame(() => {
    const targetScale = hovered ? 1.5 : 1
    if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15)
    }
    if (glowRef.current) {
      const glowScale = hovered ? 2.2 : 1.6
      glowRef.current.scale.lerp(new THREE.Vector3(glowScale, glowScale, glowScale), 0.15)
    }
  })

  const displayColor = hovered ? '#fde047' : node.color

  return (
    <group position={node.position}>
      <mesh ref={glowRef} scale={1.6}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshBasicMaterial
          color={displayColor}
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>

      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={hovered ? 1.0 : 0.6}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>

      <Html
        center
        distanceFactor={10}
        position={[0, 1.1, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(30,41,59,0.7)',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            userSelect: 'none'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '2px', fontSize: '12px' }}>
            {node.name}
          </div>
          <div style={{ fontSize: '10px', color: '#86efac' }}>
            ↑ {node.upload.toFixed(0)} KB/s
          </div>
          <div style={{ fontSize: '10px', color: '#93c5fd' }}>
            ↓ {node.download.toFixed(0)} KB/s
          </div>
        </div>
      </Html>
    </group>
  )
}

function ConnectionLine({
  source,
  target
}: {
  source: THREE.Vector3
  target: THREE.Vector3
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const segments = 8
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      pts.push(
        new THREE.Vector3(
          source.x + (target.x - source.x) * t,
          source.y + (target.y - source.y) * t,
          source.z + (target.z - source.z) * t
        )
      )
    }
    return pts
  }, [source, target])

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points)
    return g
  }, [points])

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#64748b" transparent opacity={0.4} linewidth={1} />
    </line>
  )
}

function DataParticle({
  particle,
  nodes
}: {
  particle: ParticleData
  nodes: NodeData[]
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!ref.current || nodes.length === 0) return

    const source = nodes[particle.sourceId]
    const target = nodes[particle.targetId]
    if (!source || !target) return

    const pos = bezierPoint(source.position, particle.controlPoint, target.position, particle.progress)
    ref.current.position.copy(pos)
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshBasicMaterial
        color="#facc15"
        transparent
        opacity={0.9}
        depthWrite={false}
      />
      <pointLight color="#eab308" intensity={0.6} distance={2} />
    </mesh>
  )
}

function FPSTracker() {
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const warnedRef = useRef(false)

  useFrame(() => {
    frameCountRef.current++
    const now = performance.now()
    const elapsed = now - lastTimeRef.current

    if (elapsed >= 1000) {
      const fps = (frameCountRef.current * 1000) / elapsed
      frameCountRef.current = 0
      lastTimeRef.current = now

      if (fps < 45) {
        if (!warnedRef.current) {
          console.warn(`[NetworkScene] FPS is below 45! Current FPS: ${fps.toFixed(1)}`)
          warnedRef.current = true
        }
      } else {
        warnedRef.current = false
      }
    }
  })

  return null
}

export default function NetworkScene({
  nodes,
  links,
  particles,
  onNodeHover
}: NetworkSceneProps) {
  return (
    <group>
      <FPSTracker />

      {links.map((link, idx) => {
        const source = nodes[link.source]
        const target = nodes[link.target]
        if (!source || !target) return null
        return (
          <ConnectionLine
            key={`link-${idx}`}
            source={source.position}
            target={target.position}
          />
        )
      })}

      {nodes.map((node) => (
        <ServerNode key={`node-${node.id}`} node={node} onHover={onNodeHover} />
      ))}

      {particles.map((particle) => (
        <DataParticle
          key={`particle-${particle.id}`}
          particle={particle}
          nodes={nodes}
        />
      ))}
    </group>
  )
}
