import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleFieldProps {
  mouseX: number
  mouseY: number
  isDragging: boolean
  forceStrength: number
  particleSize: number
  linkThreshold: number
}

const PARTICLE_COUNT = 800
const FIELD_SIZE = 500
const FORCE_RADIUS = 80
const DAMPING = 0.9
const JITTER = 1.2
const RECOVERY_TIME = 1.0

const colorSlow = new THREE.Color('#1565c0')
const colorMid = new THREE.Color('#00bcd4')
const colorFast = new THREE.Color('#fdd835')

function getColorFromSpeed(speed: number): THREE.Color {
  const maxSpeed = 8
  const t = Math.min(speed / maxSpeed, 1)
  if (t < 0.5) {
    const nt = t / 0.5
    return colorSlow.clone().lerp(colorMid, nt)
  } else {
    const nt = (t - 0.5) / 0.5
    return colorMid.clone().lerp(colorFast, nt)
  }
}

const vertexShader = `
  attribute float size;
  attribute vec3 customColor;
  varying vec3 vColor;
  uniform float uDpr;
  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uDpr;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying vec3 vColor;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    float glow = smoothstep(0.5, 0.0, dist);
    vec3 color = vColor * (0.6 + glow * 0.8);
    gl_FragColor = vec4(color, alpha);
  }
`

const lineVertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const lineFragmentShader = `
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 0.1);
  }
`

const ParticleField: React.FC<ParticleFieldProps> = ({
  mouseX,
  mouseY,
  isDragging,
  forceStrength,
  particleSize,
  linkThreshold,
}) => {
  const pointsRef = useRef<THREE.Points>(null)
  const linesRef = useRef<THREE.LineSegments>(null)
  const { gl } = useThree()

  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), [])
  const velocities = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), [])
  const colors = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), [])
  const sizes = useMemo(() => new Float32Array(PARTICLE_COUNT), [])
  const linePositions = useMemo(
    () => new Float32Array(PARTICLE_COUNT * 6 * 3),
    []
  )

  const recoveryFactorRef = useRef(0)
  const wasDraggingRef = useRef(false)
  const recoveryTimerRef = useRef(0)

  useEffect(() => {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * FIELD_SIZE
      positions[i3 + 1] = (Math.random() - 0.5) * FIELD_SIZE
      positions[i3 + 2] = 0

      velocities[i3] = (Math.random() - 0.5) * 0.5
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.5
      velocities[i3 + 2] = 0

      const color = getColorFromSpeed(0.5)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      sizes[i] = 2 + Math.random() * 2
    }
  }, [positions, velocities, colors, sizes])

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05)
    const halfField = FIELD_SIZE / 2

    const mouseWorldX = mouseX
    const mouseWorldY = mouseY

    if (isDragging && !wasDraggingRef.current) {
      recoveryTimerRef.current = 0
      recoveryFactorRef.current = 1
    } else if (!isDragging && wasDraggingRef.current) {
      recoveryTimerRef.current = 0
    }
    wasDraggingRef.current = isDragging

    if (isDragging) {
      recoveryFactorRef.current = 1
    } else {
      recoveryTimerRef.current += d
      if (recoveryTimerRef.current < RECOVERY_TIME) {
        recoveryFactorRef.current =
          1 - recoveryTimerRef.current / RECOVERY_TIME
      } else {
        recoveryFactorRef.current = 0
      }
    }

    const rf = recoveryFactorRef.current

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      let vx = velocities[i3]
      let vy = velocities[i3 + 1]

      if (isDragging || rf > 0) {
        const px = positions[i3]
        const py = positions[i3 + 1]
        const dx = mouseWorldX - px
        const dy = mouseWorldY - py
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < FORCE_RADIUS && dist > 0.1) {
          const forceMag =
            ((1 - dist / FORCE_RADIUS) * forceStrength * 60 * d * rf) / dist
          vx += dx * forceMag
          vy += dy * forceMag
        }
      }

      vx += (Math.random() - 0.5) * JITTER * d
      vy += (Math.random() - 0.5) * JITTER * d

      vx *= Math.pow(DAMPING, d * 60)
      vy *= Math.pow(DAMPING, d * 60)

      velocities[i3] = vx
      velocities[i3 + 1] = vy

      positions[i3] += vx * d * 60
      positions[i3 + 1] += vy * d * 60

      if (positions[i3] > halfField) positions[i3] -= FIELD_SIZE
      if (positions[i3] < -halfField) positions[i3] += FIELD_SIZE
      if (positions[i3 + 1] > halfField) positions[i3 + 1] -= FIELD_SIZE
      if (positions[i3 + 1] < -halfField) positions[i3 + 1] += FIELD_SIZE

      const speed = Math.sqrt(vx * vx + vy * vy)
      const color = getColorFromSpeed(speed)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      sizes[i] = particleSize * (0.8 + Math.random() * 0.4)
    }

    let lineCount = 0
    const maxLines = PARTICLE_COUNT * 3

    for (let i = 0; i < PARTICLE_COUNT && lineCount < maxLines; i++) {
      const i3 = i * 3
      const x1 = positions[i3]
      const y1 = positions[i3 + 1]

      for (let j = i + 1; j < PARTICLE_COUNT && lineCount < maxLines; j++) {
        const j3 = j * 3
        const x2 = positions[j3]
        const y2 = positions[j3 + 1]

        const ddx = x2 - x1
        const ddy = y2 - y1
        const distSq = ddx * ddx + ddy * ddy

        if (distSq < linkThreshold * linkThreshold) {
          const idx = lineCount * 6
          linePositions[idx] = x1
          linePositions[idx + 1] = y1
          linePositions[idx + 2] = 0
          linePositions[idx + 3] = x2
          linePositions[idx + 4] = y2
          linePositions[idx + 5] = 0
          lineCount++
        }
      }
    }

    if (pointsRef.current) {
      const geo = pointsRef.current.geometry
      const posAttr = geo.attributes.position as THREE.BufferAttribute
      const colAttr = geo.attributes.customColor as THREE.BufferAttribute
      const sizeAttr = geo.attributes.size as THREE.BufferAttribute
      posAttr.needsUpdate = true
      colAttr.needsUpdate = true
      sizeAttr.needsUpdate = true
    }

    if (linesRef.current) {
      const geo = linesRef.current.geometry
      const posAttr = geo.attributes.position as THREE.BufferAttribute
      geo.setDrawRange(0, lineCount * 2)
      posAttr.needsUpdate = true
    }
  })

  const pointsGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('customColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [positions, colors, sizes])

  const linesGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    geo.setDrawRange(0, 0)
    return geo
  }, [linePositions])

  const pointsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uDpr: { value: gl.getPixelRatio() },
      },
    })
  }, [gl])

  const linesMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: lineVertexShader,
      fragmentShader: lineFragmentShader,
      transparent: true,
      depthWrite: false,
    })
  }, [])

  return (
    <group>
      <points ref={pointsRef} geometry={pointsGeometry} material={pointsMaterial} />
      <lineSegments ref={linesRef} geometry={linesGeometry} material={linesMaterial} />
    </group>
  )
}

export default ParticleField
