import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleFieldProps {
  mousePos: { x: number; y: number }
  isMouseDown: boolean
  thrustStrength: number
  particleSize: number
  lineThreshold: number
}

const PARTICLE_COUNT = 800
const FIELD_SIZE = 500
const MOUSE_RADIUS = 80
const DAMPING = 0.9
const JITTER = 1.2

const lerpColor = (color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color => {
  return new THREE.Color().lerpColors(color1, color2, t)
}

const getColorBySpeed = (speed: number): THREE.Color => {
  const colorSlow = new THREE.Color('#1565c0')
  const colorMid = new THREE.Color('#00bcd4')
  const colorFast = new THREE.Color('#fdd835')

  const normalizedSpeed = Math.min(speed / 4, 1)

  if (normalizedSpeed < 0.5) {
    return lerpColor(colorSlow, colorMid, normalizedSpeed * 2)
  } else {
    return lerpColor(colorMid, colorFast, (normalizedSpeed - 0.5) * 2)
  }
}

const particleVertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const particleFragmentShader = `
  varying vec3 vColor;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    float alpha = smoothstep(0.5, 0.3, dist) * 0.9 + glow * 0.4;
    gl_FragColor = vec4(vColor, alpha);
  }
`

const linesVertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const linesFragmentShader = `
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 0.1);
  }
`

const ParticleField: React.FC<ParticleFieldProps> = ({
  mousePos,
  isMouseDown,
  thrustStrength,
  particleSize,
  lineThreshold,
}) => {
  const { camera } = useThree()

  const pointsRef = useRef<THREE.Points>(null)
  const linesRef = useRef<THREE.LineSegments>(null)

  const positionsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3))
  const velocitiesRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 2))
  const baseVelocitiesRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 2))
  const recoveryProgressRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT))
  const mouseReleasedAtRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT).fill(-1))

  const linePositionsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6))

  const { positions, colors, sizes, linePositions } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * FIELD_SIZE
      const y = (Math.random() - 0.5) * FIELD_SIZE
      const z = 0

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      positionsRef.current[i * 3] = x
      positionsRef.current[i * 3 + 1] = y
      positionsRef.current[i * 3 + 2] = z

      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 0.3 + 0.1
      const vx = Math.cos(angle) * speed
      const vy = Math.sin(angle) * speed

      velocitiesRef.current[i * 2] = vx
      velocitiesRef.current[i * 2 + 1] = vy
      baseVelocitiesRef.current[i * 2] = vx
      baseVelocitiesRef.current[i * 2 + 1] = vy

      const initialColor = getColorBySpeed(0.2)
      colors[i * 3] = initialColor.r
      colors[i * 3 + 1] = initialColor.g
      colors[i * 3 + 2] = initialColor.b

      sizes[i] = particleSize
    }

    const linePositions = new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6)

    return { positions, colors, sizes, linePositions }
  }, [])

  useEffect(() => {
    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry
      const sizeAttr = geometry.getAttribute('aSize') as THREE.BufferAttribute
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        sizeAttr.array[i] = particleSize + Math.random() * 2
      }
      sizeAttr.needsUpdate = true
    }
  }, [particleSize])

  const prevMouseDownRef = useRef(false)
  const currentTimeRef = useRef(0)

  useFrame((state, delta) => {
    currentTimeRef.current += delta

    if (!prevMouseDownRef.current && isMouseDown) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        mouseReleasedAtRef.current[i] = -1
      }
    }
    if (prevMouseDownRef.current && !isMouseDown) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        mouseReleasedAtRef.current[i] = currentTimeRef.current
        recoveryProgressRef.current[i] = 0
      }
    }
    prevMouseDownRef.current = isMouseDown

    const camZ = (camera as THREE.PerspectiveCamera).position.z
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const halfHeight = Math.tan(fov / 2) * camZ
    const halfWidth = halfHeight * (window.innerWidth / window.innerHeight)

    const mouseWorldX = mousePos.x * halfWidth
    const mouseWorldY = mousePos.y * halfHeight

    let lineIndex = 0
    const thresholdSq = lineThreshold * lineThreshold

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const i2 = i * 2

      const px = positionsRef.current[i3]
      const py = positionsRef.current[i3 + 1]

      if (isMouseDown) {
        const dx = mouseWorldX - px
        const dy = mouseWorldY - py
        const distSq = dx * dx + dy * dy
        const dist = Math.sqrt(distSq)

        if (dist < MOUSE_RADIUS && dist > 0.01) {
          const falloff = 1 - dist / MOUSE_RADIUS
          const force = thrustStrength * falloff
          velocitiesRef.current[i2] += (dx / dist) * force * delta * 60
          velocitiesRef.current[i2 + 1] += (dy / dist) * force * delta * 60
        }
      }

      if (mouseReleasedAtRef.current[i] > 0) {
        const elapsed = currentTimeRef.current - mouseReleasedAtRef.current[i]
        const progress = Math.min(elapsed / 1.0, 1)
        const easeProgress = progress * progress * (3 - 2 * progress)

        velocitiesRef.current[i2] =
          velocitiesRef.current[i2] * (1 - easeProgress) + baseVelocitiesRef.current[i2] * easeProgress
        velocitiesRef.current[i2 + 1] =
          velocitiesRef.current[i2 + 1] * (1 - easeProgress) + baseVelocitiesRef.current[i2 + 1] * easeProgress
      }

      if (!isMouseDown && mouseReleasedAtRef.current[i] < 0) {
        if (Math.random() < 0.02) {
          const angle = Math.random() * Math.PI * 2
          const speed = Math.random() * 0.3 + 0.1
          baseVelocitiesRef.current[i2] = Math.cos(angle) * speed
          baseVelocitiesRef.current[i2 + 1] = Math.sin(angle) * speed
        }
        velocitiesRef.current[i2] = baseVelocitiesRef.current[i2]
        velocitiesRef.current[i2 + 1] = baseVelocitiesRef.current[i2 + 1]
      }

      velocitiesRef.current[i2] += (Math.random() - 0.5) * JITTER * delta * 2
      velocitiesRef.current[i2 + 1] += (Math.random() - 0.5) * JITTER * delta * 2

      velocitiesRef.current[i2] *= DAMPING
      velocitiesRef.current[i2 + 1] *= DAMPING

      positionsRef.current[i3] += velocitiesRef.current[i2]
      positionsRef.current[i3 + 1] += velocitiesRef.current[i2 + 1]

      const halfField = FIELD_SIZE / 2
      if (positionsRef.current[i3] > halfField) positionsRef.current[i3] = -halfField
      if (positionsRef.current[i3] < -halfField) positionsRef.current[i3] = halfField
      if (positionsRef.current[i3 + 1] > halfField) positionsRef.current[i3 + 1] = -halfField
      if (positionsRef.current[i3 + 1] < -halfField) positionsRef.current[i3 + 1] = halfField

      const speed = Math.sqrt(
        velocitiesRef.current[i2] * velocitiesRef.current[i2] +
        velocitiesRef.current[i2 + 1] * velocitiesRef.current[i2 + 1]
      )
      const color = getColorBySpeed(speed)

      if (pointsRef.current) {
        const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
        const colorAttr = pointsRef.current.geometry.getAttribute('aColor') as THREE.BufferAttribute

        posAttr.array[i3] = positionsRef.current[i3]
        posAttr.array[i3 + 1] = positionsRef.current[i3 + 1]
        posAttr.array[i3 + 2] = 0

        colorAttr.array[i3] = color.r
        colorAttr.array[i3 + 1] = color.g
        colorAttr.array[i3 + 2] = color.b
      }

      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const j3 = j * 3
        const dx = positionsRef.current[i3] - positionsRef.current[j3]
        const dy = positionsRef.current[i3 + 1] - positionsRef.current[j3 + 1]
        const distSq = dx * dx + dy * dy

        if (distSq < thresholdSq) {
          linePositionsRef.current[lineIndex++] = positionsRef.current[i3]
          linePositionsRef.current[lineIndex++] = positionsRef.current[i3 + 1]
          linePositionsRef.current[lineIndex++] = 0
          linePositionsRef.current[lineIndex++] = positionsRef.current[j3]
          linePositionsRef.current[lineIndex++] = positionsRef.current[j3 + 1]
          linePositionsRef.current[lineIndex++] = 0
        }
      }
    }

    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      const colorAttr = pointsRef.current.geometry.getAttribute('aColor') as THREE.BufferAttribute
      posAttr.needsUpdate = true
      colorAttr.needsUpdate = true
    }

    if (linesRef.current) {
      const linePosAttr = linesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute

      for (let k = lineIndex; k < linePosAttr.array.length; k++) {
        linePosAttr.array[k] = 0
      }

      linePosAttr.array.set(linePositionsRef.current.subarray(0, lineIndex))
      linePosAttr.needsUpdate = true
      linesRef.current.geometry.setDrawRange(0, lineIndex / 3)
    }
  })

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aColor"
            count={PARTICLE_COUNT}
            array={colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aSize"
            count={PARTICLE_COUNT}
            array={sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={particleVertexShader}
          fragmentShader={particleFragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT * PARTICLE_COUNT * 2}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={linesVertexShader}
          fragmentShader={linesFragmentShader}
          transparent
          depthWrite={false}
        />
      </lineSegments>
    </>
  )
}

export default ParticleField
