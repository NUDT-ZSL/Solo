import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleSceneProps {
  particleCount: number
  speed: number
  direction: number
  size: number
  color: string
}

export default function ParticleScene({
  particleCount,
  speed,
  direction,
  size,
  color,
}: ParticleSceneProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const [isDragging, setIsDragging] = useState(false)
  const rotationRef = useRef({ x: 0, y: 0 })
  const targetRotationRef = useRef({ x: 0, y: 0 })
  const autoReturnRef = useRef(true)
  const { camera, gl } = useThree()

  const effectiveCount = particleCount > 800 ? Math.floor(particleCount / 2) : particleCount

  const { positions, velocities, opacities, originalPositions } = useMemo(() => {
    const positions = new Float32Array(effectiveCount * 3)
    const velocities = new Float32Array(effectiveCount * 3)
    const opacities = new Float32Array(effectiveCount)
    const originalPositions = new Float32Array(effectiveCount * 3)

    const dirRad = (direction * Math.PI) / 180
    const dirX = Math.cos(dirRad)
    const dirY = Math.sin(dirRad)

    for (let i = 0; i < effectiveCount; i++) {
      const i3 = i * 3

      const x = (Math.random() - 0.5) * 20
      const y = (Math.random() - 0.5) * 20
      const z = (Math.random() - 0.5) * 20

      positions[i3] = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z

      originalPositions[i3] = x
      originalPositions[i3 + 1] = y
      originalPositions[i3 + 2] = z

      const randomOffset = 0.3
      const vx = dirX + (Math.random() - 0.5) * randomOffset
      const vy = dirY + (Math.random() - 0.5) * randomOffset
      const vz = (Math.random() - 0.5) * randomOffset

      velocities[i3] = vx
      velocities[i3 + 1] = vy
      velocities[i3 + 2] = vz

      opacities[i] = 0.6 + Math.random() * 0.4
    }

    return { positions, velocities, opacities, originalPositions }
  }, [effectiveCount, direction])

  useEffect(() => {
    const dirRad = (direction * Math.PI) / 180
    const dirX = Math.cos(dirRad)
    const dirY = Math.sin(dirRad)

    for (let i = 0; i < effectiveCount; i++) {
      const i3 = i * 3
      const randomOffset = 0.3
      velocities[i3] = dirX + (Math.random() - 0.5) * randomOffset
      velocities[i3 + 1] = dirY + (Math.random() - 0.5) * randomOffset
      velocities[i3 + 2] = (Math.random() - 0.5) * randomOffset
    }
  }, [direction, effectiveCount, velocities])

  useEffect(() => {
    const canvas = gl.domElement

    const handlePointerDown = () => {
      setIsDragging(true)
      autoReturnRef.current = false
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      autoReturnRef.current = true
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      targetRotationRef.current.y += e.movementX * 0.005
      targetRotationRef.current.x += e.movementY * 0.005
      targetRotationRef.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotationRef.current.x))
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)
    canvas.addEventListener('pointermove', handlePointerMove)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
      canvas.removeEventListener('pointermove', handlePointerMove)
    }
  }, [gl, isDragging])

  useFrame((_, delta) => {
    if (!pointsRef.current) return

    const geometry = pointsRef.current.geometry
    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array

    const speedMultiplier = speed * 0.5

    for (let i = 0; i < effectiveCount; i++) {
      const i3 = i * 3

      posArray[i3] += velocities[i3] * delta * speedMultiplier
      posArray[i3 + 1] += velocities[i3 + 1] * delta * speedMultiplier
      posArray[i3 + 2] += velocities[i3 + 2] * delta * speedMultiplier

      const bounds = 12
      if (posArray[i3] > bounds) posArray[i3] = -bounds
      if (posArray[i3] < -bounds) posArray[i3] = bounds
      if (posArray[i3 + 1] > bounds) posArray[i3 + 1] = -bounds
      if (posArray[i3 + 1] < -bounds) posArray[i3 + 1] = bounds
      if (posArray[i3 + 2] > bounds) posArray[i3 + 2] = -bounds
      if (posArray[i3 + 2] < -bounds) posArray[i3 + 2] = bounds
    }

    posAttr.needsUpdate = true

    if (autoReturnRef.current) {
      targetRotationRef.current.x *= 0.95
      targetRotationRef.current.y *= 0.95
    }

    rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * 0.1
    rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * 0.1

    camera.position.x = Math.sin(rotationRef.current.y) * 15
    camera.position.y = Math.sin(rotationRef.current.x) * 15
    camera.position.z = Math.cos(rotationRef.current.y) * 15
    camera.lookAt(0, 0, 0)
  })

  const particleColor = useMemo(() => new THREE.Color(color), [color])

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={effectiveCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size * 0.1}
        color={particleColor}
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
