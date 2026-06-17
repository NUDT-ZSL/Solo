import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleFieldProps {
  mousePos: { x: number; y: number }
  isMouseDown: boolean
  releaseTime: number
  thrustStrength: number
  particleSize: number
  linkThreshold: number
  viewportSize: { width: number; height: number }
}

const PARTICLE_COUNT = 800
const INITIAL_AREA = 500
const MOUSE_RADIUS = 80
const DAMPING = 0.9
const JITTER = 1.2
const RECOVERY_DURATION = 1000
const MAX_SPEED = 8

const COLOR_SLOW = new THREE.Color('#1565c0')
const COLOR_MID = new THREE.Color('#00bcd4')
const COLOR_FAST = new THREE.Color('#fdd835')

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

function createGlowTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)')
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function ParticleField({
  mousePos,
  isMouseDown,
  releaseTime,
  thrustStrength,
  particleSize,
  linkThreshold,
  viewportSize,
}: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const linesRef = useRef<THREE.LineSegments>(null)
  const glowTexture = useMemo(() => createGlowTexture(), [])

  const data = useRef({
    positions: new Float32Array(PARTICLE_COUNT * 3),
    velocities: new Float32Array(PARTICLE_COUNT * 3),
    baseVelocities: new Float32Array(PARTICLE_COUNT * 3),
    colors: new Float32Array(PARTICLE_COUNT * 3),
    linePositions: new Float32Array(PARTICLE_COUNT * 6 * 3),
    lineColors: new Float32Array(PARTICLE_COUNT * 6 * 3),
  })

  const prevMousePos = useRef({ x: mousePos.x, y: mousePos.y })

  useEffect(() => {
    const { positions, velocities, baseVelocities, colors } = data.current
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * INITIAL_AREA
      positions[i3 + 1] = (Math.random() - 0.5) * INITIAL_AREA
      positions[i3 + 2] = 0

      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 0.5 + 0.2
      velocities[i3] = Math.cos(angle) * speed
      velocities[i3 + 1] = Math.sin(angle) * speed
      velocities[i3 + 2] = 0

      baseVelocities[i3] = Math.cos(angle) * speed
      baseVelocities[i3 + 1] = Math.sin(angle) * speed
      baseVelocities[i3 + 2] = 0

      colors[i3] = COLOR_SLOW.r
      colors[i3 + 1] = COLOR_SLOW.g
      colors[i3 + 2] = COLOR_SLOW.b
    }
  }, [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.033) * 60
    const { positions, velocities, baseVelocities, colors, linePositions, lineColors } = data.current
    const points = pointsRef.current
    const lines = linesRef.current
    if (!points || !lines) return

    const posAttr = points.geometry.attributes.position as THREE.BufferAttribute
    const colAttr = points.geometry.attributes.color as THREE.BufferAttribute

    const currentTime = performance.now()
    const recoveryFactor = isMouseDown
      ? 1
      : Math.max(0, 1 - (currentTime - releaseTime) / RECOVERY_DURATION)

    const halfW = viewportSize.width / 2
    const halfH = viewportSize.height / 2

    const mx = mousePos.x * halfW
    const my = mousePos.y * halfH
    const prevMx = prevMousePos.current.x * halfW
    const prevMy = prevMousePos.current.y * halfH
    const mouseDx = mx - prevMx
    const mouseDy = my - prevMy
    prevMousePos.current = { x: mousePos.x, y: mousePos.y }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3

      let vx = velocities[i3]
      let vy = velocities[i3 + 1]

      vx = baseVelocities[i3] + (vx - baseVelocities[i3]) * recoveryFactor
      vy = baseVelocities[i3 + 1] + (vy - baseVelocities[i3 + 1]) * recoveryFactor

      vx += (Math.random() - 0.5) * JITTER * 0.05 * dt
      vy += (Math.random() - 0.5) * JITTER * 0.05 * dt

      if (isMouseDown || recoveryFactor > 0) {
        const dx = mx - positions[i3]
        const dy = my - positions[i3 + 1]
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MOUSE_RADIUS && dist > 0.1) {
          const force = (1 - dist / MOUSE_RADIUS) * thrustStrength * 0.5 * recoveryFactor
          vx += (dx / dist) * force * dt
          vy += (dy / dist) * force * dt
          vx += mouseDx * 0.1 * force * dt
          vy += mouseDy * 0.1 * force * dt
        }
      }

      vx *= DAMPING
      vy *= DAMPING

      const speed = Math.sqrt(vx * vx + vy * vy)
      if (speed > MAX_SPEED) {
        const ratio = MAX_SPEED / speed
        vx *= ratio
        vy *= ratio
      }

      velocities[i3] = vx
      velocities[i3 + 1] = vy

      positions[i3] += vx * dt
      positions[i3 + 1] += vy * dt

      if (positions[i3] > halfW) positions[i3] = -halfW
      if (positions[i3] < -halfW) positions[i3] = halfW
      if (positions[i3 + 1] > halfH) positions[i3 + 1] = -halfH
      if (positions[i3 + 1] < -halfH) positions[i3 + 1] = halfH

      const speedNorm = Math.min(speed / MAX_SPEED, 1)
      let color: THREE.Color
      if (speedNorm < 0.5) {
        const t = speedNorm * 2
        color = COLOR_SLOW.clone().lerp(COLOR_MID, t)
      } else {
        const t = (speedNorm - 0.5) * 2
        color = COLOR_MID.clone().lerp(COLOR_FAST, t)
      }
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      posAttr.array[i3] = positions[i3]
      posAttr.array[i3 + 1] = positions[i3 + 1]
      posAttr.array[i3 + 2] = positions[i3 + 2]
      colAttr.array[i3] = colors[i3]
      colAttr.array[i3 + 1] = colors[i3 + 1]
      colAttr.array[i3 + 2] = colors[i3 + 2]
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true

    let lineCount = 0
    const maxLines = PARTICLE_COUNT * 3
    const thresholdSq = linkThreshold * linkThreshold
    const [lr, lg, lb] = hexToRgb('rgba(255,255,255,0.1)')

    outer: for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const j3 = j * 3
        const dx = positions[i3] - positions[j3]
        const dy = positions[i3 + 1] - positions[j3 + 1]
        const distSq = dx * dx + dy * dy
        if (distSq < thresholdSq) {
          if (lineCount >= maxLines) break outer
          const l6 = lineCount * 6
          linePositions[l6] = positions[i3]
          linePositions[l6 + 1] = positions[i3 + 1]
          linePositions[l6 + 2] = 0
          linePositions[l6 + 3] = positions[j3]
          linePositions[l6 + 4] = positions[j3 + 1]
          linePositions[l6 + 5] = 0

          const alpha = 1 - Math.sqrt(distSq) / linkThreshold
          lineColors[l6] = lr
          lineColors[l6 + 1] = lg
          lineColors[l6 + 2] = lb
          lineColors[l6 + 3] = lr
          lineColors[l6 + 4] = lg
          lineColors[l6 + 5] = lb
          void alpha
          lineCount++
        }
      }
    }

    const linePosAttr = lines.geometry.attributes.position as THREE.BufferAttribute
    const lineColAttr = lines.geometry.attributes.color as THREE.BufferAttribute
    linePosAttr.needsUpdate = true
    lineColAttr.needsUpdate = true
    lines.geometry.setDrawRange(0, lineCount * 2)

    const pointsMat = points.material as THREE.PointsMaterial
    pointsMat.size = particleSize * 8
    pointsMat.map = glowTexture
    pointsMat.needsUpdate = true
  })

  const pointsGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3))
    geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3))
    return geom
  }, [])

  const linesGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const maxLines = PARTICLE_COUNT * 3
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxLines * 6), 3))
    geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(maxLines * 6), 3))
    return geom
  }, [])

  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [])

  return (
    <group>
      <points ref={pointsRef} geometry={pointsGeometry}>
        <pointsMaterial
          size={particleSize * 8}
          vertexColors
          transparent
          opacity={0.95}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          map={glowTexture}
        />
      </points>
      <lineSegments ref={linesRef} geometry={linesGeometry} material={lineMaterial} />
    </group>
  )
}

export default ParticleField
