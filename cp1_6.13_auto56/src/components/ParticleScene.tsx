import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleSceneProps {
  particleCount: number
  speed: number
  direction: number
  size: number
  color: string
  onRenderModeChange?: (isSparse: boolean) => void
}

function createParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)')
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)')
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)')
  gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

interface ParticleData {
  positions: Float32Array
  velocities: Float32Array
  opacities: Float32Array
}

function generateParticleData(count: number, direction: number): ParticleData {
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  const opacities = new Float32Array(count)

  const dirRad = (direction * Math.PI) / 180
  const dirX = Math.cos(dirRad)
  const dirY = Math.sin(dirRad)

  for (let i = 0; i < count; i++) {
    const i3 = i * 3

    positions[i3] = (Math.random() - 0.5) * 20
    positions[i3 + 1] = (Math.random() - 0.5) * 20
    positions[i3 + 2] = (Math.random() - 0.5) * 20

    const randomOffset = 0.3
    velocities[i3] = dirX + (Math.random() - 0.5) * randomOffset
    velocities[i3 + 1] = dirY + (Math.random() - 0.5) * randomOffset
    velocities[i3 + 2] = (Math.random() - 0.5) * randomOffset

    opacities[i] = 0.6 + Math.random() * 0.4
  }

  return { positions, velocities, opacities }
}

export default function ParticleScene({
  particleCount,
  speed,
  direction,
  size,
  color,
  onRenderModeChange,
}: ParticleSceneProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera, gl } = useThree()

  const isSparse = particleCount > 800
  const renderCount = isSparse ? Math.floor(particleCount / 2) : particleCount

  const particleTexture = useMemo(() => createParticleTexture(), [])

  const fullDataRef = useRef<ParticleData>(generateParticleData(particleCount, direction))

  const renderPositions = useMemo(() => {
    return fullDataRef.current.positions.slice(0, renderCount * 3)
  }, [renderCount])

  const velocitiesRef = useRef<Float32Array>(fullDataRef.current.velocities)

  useEffect(() => {
    if (onRenderModeChange) {
      onRenderModeChange(isSparse)
    }
  }, [isSparse, onRenderModeChange])

  useEffect(() => {
    const currentFullCount = fullDataRef.current.positions.length / 3
    if (currentFullCount !== particleCount) {
      fullDataRef.current = generateParticleData(particleCount, direction)
    }
  }, [particleCount, direction])

  useEffect(() => {
    const dirRad = (direction * Math.PI) / 180
    const dirX = Math.cos(dirRad)
    const dirY = Math.sin(dirRad)
    const velocities = fullDataRef.current.velocities
    const count = fullDataRef.current.positions.length / 3

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const randomOffset = 0.3
      velocities[i3] = dirX + (Math.random() - 0.5) * randomOffset
      velocities[i3 + 1] = dirY + (Math.random() - 0.5) * randomOffset
      velocities[i3 + 2] = (Math.random() - 0.5) * randomOffset
    }
    velocitiesRef.current = velocities
  }, [direction])

  const rotationRef = useRef({ x: 0, y: 0 })
  const targetRotationRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const returnAnimRef = useRef<number | null>(null)
  const animProgressRef = useRef(0)
  const startRotationRef = useRef({ x: 0, y: 0 })

  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  const startReturnAnimation = () => {
    if (returnAnimRef.current) {
      cancelAnimationFrame(returnAnimRef.current)
    }
    startRotationRef.current = { ...rotationRef.current }
    animProgressRef.current = 0

    const animate = () => {
      animProgressRef.current += 0.025
      if (animProgressRef.current >= 1) {
        animProgressRef.current = 1
        rotationRef.current = { x: 0, y: 0 }
        targetRotationRef.current = { x: 0, y: 0 }
        returnAnimRef.current = null
        return
      }

      const t = easeInOutCubic(animProgressRef.current)
      rotationRef.current.x = lerp(startRotationRef.current.x, 0, t)
      rotationRef.current.y = lerp(startRotationRef.current.y, 0, t)
      targetRotationRef.current.x = rotationRef.current.x
      targetRotationRef.current.y = rotationRef.current.y

      returnAnimRef.current = requestAnimationFrame(animate)
    }

    returnAnimRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    const canvas = gl.domElement

    const handlePointerDown = () => {
      isDraggingRef.current = true
      if (returnAnimRef.current) {
        cancelAnimationFrame(returnAnimRef.current)
        returnAnimRef.current = null
      }
    }

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        startReturnAnimation()
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return
      targetRotationRef.current.y += e.movementX * 0.005
      targetRotationRef.current.x += e.movementY * 0.005
      targetRotationRef.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotationRef.current.x))
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)
    canvas.addEventListener('pointermove', handlePointerMove)

    return () => {
      if (returnAnimRef.current) {
        cancelAnimationFrame(returnAnimRef.current)
      }
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
      canvas.removeEventListener('pointermove', handlePointerMove)
    }
  }, [gl])

  useFrame((_, delta) => {
    if (!pointsRef.current) return

    const geometry = pointsRef.current.geometry
    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const posArray = posAttr.array as Float32Array
    const fullPositions = fullDataRef.current.positions
    const velocities = velocitiesRef.current

    const speedMultiplier = speed * 0.5
    const fullCount = fullPositions.length / 3

    for (let i = 0; i < fullCount; i++) {
      const i3 = i * 3

      fullPositions[i3] += velocities[i3] * delta * speedMultiplier
      fullPositions[i3 + 1] += velocities[i3 + 1] * delta * speedMultiplier
      fullPositions[i3 + 2] += velocities[i3 + 2] * delta * speedMultiplier

      const bounds = 12
      if (fullPositions[i3] > bounds) fullPositions[i3] = -bounds
      if (fullPositions[i3] < -bounds) fullPositions[i3] = bounds
      if (fullPositions[i3 + 1] > bounds) fullPositions[i3 + 1] = -bounds
      if (fullPositions[i3 + 1] < -bounds) fullPositions[i3 + 1] = bounds
      if (fullPositions[i3 + 2] > bounds) fullPositions[i3 + 2] = -bounds
      if (fullPositions[i3 + 2] < -bounds) fullPositions[i3 + 2] = bounds
    }

    for (let i = 0; i < renderCount; i++) {
      const i3 = i * 3
      posArray[i3] = fullPositions[i3]
      posArray[i3 + 1] = fullPositions[i3 + 1]
      posArray[i3 + 2] = fullPositions[i3 + 2]
    }

    posAttr.needsUpdate = true

    if (isDraggingRef.current) {
      rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * 0.15
      rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * 0.15
    }

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
          count={renderCount}
          array={renderPositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size * 0.1}
        color={particleColor}
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={particleTexture}
        alphaTest={0.01}
      />
    </points>
  )
}
