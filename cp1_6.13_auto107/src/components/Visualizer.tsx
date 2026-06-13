import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleData {
  basePos: THREE.Vector3
  angle: number
  radius: number
}

interface VisualizerProps {
  freqData: { low: number; mid: number; high: number }
}

const ParticleSystem: React.FC<VisualizerProps> = ({ freqData }) => {
  const pointsRef = useRef<THREE.Points>(null)
  const linesRef = useRef<THREE.LineSegments>(null)
  const groupRef = useRef<THREE.Group>(null)
  const rotationSpeed = useRef(0)

  const PARTICLE_COUNT = 700
  const LINE_DISTANCE = 2.5

  const { positions, colors, particleData, linePositions, lineColors } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const particleData: ParticleData[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 0.5 + Math.random() * 5
      const z = (Math.random() - 0.5) * 0.3

      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.sin(angle) * radius
      positions[i * 3 + 2] = z

      colors[i * 3] = 0.55
      colors[i * 3 + 1] = 0.36
      colors[i * 3 + 2] = 0.96

      particleData.push({
        basePos: new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], z),
        angle,
        radius,
      })
    }

    const linePositions = new Float32Array(PARTICLE_COUNT * 6)
    const lineColors = new Float32Array(PARTICLE_COUNT * 6)

    return { positions, colors, particleData, linePositions, lineColors }
  }, [])

  useFrame((_, delta) => {
    if (!pointsRef.current || !groupRef.current) return

    const low = freqData.low
    const mid = freqData.mid
    const high = freqData.high

    rotationSpeed.current += (high * 0.8 + 0.05) * delta
    groupRef.current.rotation.z = rotationSpeed.current

    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = pointsRef.current.geometry.getAttribute('color') as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array
    const colArr = colAttr.array as Float32Array

    const zSpread = low * 6
    const midColor = new THREE.Color().setHSL(0.7 - mid * 0.15, 0.85, 0.4 + mid * 0.3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particleData[i]
      const noise = (Math.sin(p.angle * 3 + rotationSpeed.current * 2) * 0.5 + 0.5)
      posArr[i * 3] = p.basePos.x
      posArr[i * 3 + 1] = p.basePos.y
      posArr[i * 3 + 2] = p.basePos.z + noise * zSpread

      const cT = Math.min(1, mid * 1.2 + noise * 0.3)
      colArr[i * 3] = 0.55 + (midColor.r - 0.55) * cT
      colArr[i * 3 + 1] = 0.36 + (midColor.g - 0.36) * cT
      colArr[i * 3 + 2] = 0.96 + (midColor.b - 0.96) * cT
    }
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true

    if (linesRef.current) {
      const linePosAttr = linesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      const lineColAttr = linesRef.current.geometry.getAttribute('color') as THREE.BufferAttribute
      const lposArr = linePosAttr.array as Float32Array
      const lcolArr = lineColAttr.array as Float32Array

      let lineIdx = 0
      const maxLines = PARTICLE_COUNT

      outer: for (let i = 0; i < PARTICLE_COUNT && lineIdx < maxLines; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT && lineIdx < maxLines; j++) {
          const dx = posArr[i * 3] - posArr[j * 3]
          const dy = posArr[i * 3 + 1] - posArr[j * 3 + 1]
          const dz = posArr[i * 3 + 2] - posArr[j * 3 + 2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (dist < LINE_DISTANCE) {
            const alpha = Math.max(0, 1 - dist / LINE_DISTANCE) * 0.5

            lposArr[lineIdx * 6] = posArr[i * 3]
            lposArr[lineIdx * 6 + 1] = posArr[i * 3 + 1]
            lposArr[lineIdx * 6 + 2] = posArr[i * 3 + 2]
            lposArr[lineIdx * 6 + 3] = posArr[j * 3]
            lposArr[lineIdx * 6 + 4] = posArr[j * 3 + 1]
            lposArr[lineIdx * 6 + 5] = posArr[j * 3 + 2]

            lcolArr[lineIdx * 6] = 0.65
            lcolArr[lineIdx * 6 + 1] = 0.45
            lcolArr[lineIdx * 6 + 2] = 1.0
            lcolArr[lineIdx * 6 + 3] = alpha * 0.65
            lcolArr[lineIdx * 6 + 4] = alpha * 0.45
            lcolArr[lineIdx * 6 + 5] = alpha * 1.0

            lineIdx++
            if (lineIdx >= maxLines) break outer
          }
        }
      }

      for (let k = lineIdx * 6; k < lposArr.length; k++) {
        lposArr[k] = 0
      }

      linePosAttr.needsUpdate = true
      lineColAttr.needsUpdate = true
      linesRef.current.geometry.setDrawRange(0, lineIdx * 2)
    }
  })

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          vertexColors
          transparent
          opacity={0.95}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[lineColors, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}

const Visualizer: React.FC<VisualizerProps> = ({ freqData }) => {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.4} />
        <ParticleSystem freqData={freqData} />
      </Canvas>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(15, 23, 42, 0.6) 100%)',
        }}
      />
    </div>
  )
}

export default Visualizer
