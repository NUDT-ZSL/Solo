import * as THREE from 'three'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'

const PARTICLE_COUNT = 200
const COLORS = [0x88CCFF, 0xCC88FF]

export interface ParticlesProps {
  bounds?: number
}

export function Particles({ bounds = 15 }: ParticlesProps) {
  const meshRef = useRef<THREE.Points>(null)
  const phaseRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT))
  const periodRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT))
  const baseYRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT))

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const col = new Float32Array(PARTICLE_COUNT * 3)
    const tmpColor = new THREE.Color()

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      pos[i3] = (Math.random() - 0.5) * bounds * 2
      pos[i3 + 1] = (Math.random() - 0.3) * bounds * 1.5
      pos[i3 + 2] = (Math.random() - 0.5) * bounds * 2

      baseYRef.current[i] = pos[i3 + 1]
      phaseRef.current[i] = Math.random() * Math.PI * 2
      periodRef.current[i] = 3 + Math.random() * 2

      tmpColor.setHex(COLORS[Math.floor(Math.random() * COLORS.length)])
      col[i3] = tmpColor.r
      col[i3 + 1] = tmpColor.g
      col[i3 + 2] = tmpColor.b
    }
    return [pos, col]
  }, [bounds])

  useFrame((state) => {
    if (!meshRef.current) return
    const posAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array
    const t = state.clock.getElapsedTime()

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const phase = phaseRef.current[i]
      const period = periodRef.current[i]
      const baseY = baseYRef.current[i]
      posArray[i3 + 1] = baseY + Math.sin((t / period) * Math.PI * 2 + phase) * 0.5
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
