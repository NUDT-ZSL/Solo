import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleFieldProps {
  thrustStrength: number
  particleSize: number
  lineThreshold: number
  isDragging: boolean
  mouseNDC: { x: number; y: number }
  onRelease: () => void
}

const PARTICLE_COUNT = 800
const FIELD_SIZE = 500
const DAMPING = 0.9
const JITTER = 1.2
const RECOVERY_TIME = 1000

const COLOR_STOPS = {
  slow: new THREE.Color('#1565c0'),
  mid: new THREE.Color('#00bcd4'),
  fast: new THREE.Color('#fdd835'),
}

const particleVertexShader = `
  attribute float size;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    vAlpha = 1.0;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    if (dist > 0.5) discard;
    
    float glow = 1.0 - dist * 2.0;
    glow = pow(glow, 1.5);
    
    float outerGlow = smoothstep(0.5, 0.0, dist);
    float alpha = min(glow * 1.2 + outerGlow * 0.6, 1.0);
    
    vec3 finalColor = vColor * (0.8 + glow * 0.5);
    
    gl_FragColor = vec4(finalColor, alpha * vAlpha);
  }
`

const lineVertexShader = `
  attribute float aAlpha;
  varying float vAlpha;

  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const lineFragmentShader = `
  varying float vAlpha;

  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 0.1 * vAlpha);
  }
`

function ParticleField({
  thrustStrength,
  particleSize,
  lineThreshold,
  isDragging,
  mouseNDC,
  onRelease,
}: ParticleFieldProps) {
  const { camera, size } = useThree()
  
  const positionsRef = useRef<Float32Array>()
  const velocitiesRef = useRef<Float32Array>()
  const colorsRef = useRef<Float32Array>()
  const sizesRef = useRef<Float32Array>()
  const releaseTimeRef = useRef<number>(0)
  const wasDraggingRef = useRef(false)

  const pointsGeometryRef = useRef<THREE.BufferGeometry>(null!)
  const linesGeometryRef = useRef<THREE.BufferGeometry>(null!)
  const linePositionsRef = useRef<Float32Array>()
  const lineAlphasRef = useRef<Float32Array>()

  const particleData = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = new Float32Array(PARTICLE_COUNT * 2)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)
    const baseSizes = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * FIELD_SIZE
      positions[i * 3 + 1] = (Math.random() - 0.5) * FIELD_SIZE
      positions[i * 3 + 2] = 0

      velocities[i * 2] = (Math.random() - 0.5) * 0.5
      velocities[i * 2 + 1] = (Math.random() - 0.5) * 0.5

      colors[i * 3] = COLOR_STOPS.slow.r
      colors[i * 3 + 1] = COLOR_STOPS.slow.g
      colors[i * 3 + 2] = COLOR_STOPS.slow.b

      const s = 2 + Math.random() * 2
      sizes[i] = s
      baseSizes[i] = s
    }

    positionsRef.current = positions
    velocitiesRef.current = velocities
    colorsRef.current = colors
    sizesRef.current = sizes

    return { positions, velocities, colors, sizes, baseSizes }
  }, [])

  const pointsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  const linesMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: lineVertexShader,
      fragmentShader: lineFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  useEffect(() => {
    camera.position.z = 500
    camera.lookAt(0, 0, 0)
  }, [camera])

  useFrame((state) => {
    if (!positionsRef.current || !velocitiesRef.current || !colorsRef.current || !sizesRef.current) return

    const positions = positionsRef.current
    const velocities = velocitiesRef.current
    const colors = colorsRef.current
    const sizes = sizesRef.current
    const baseSizes = particleData.baseSizes

    const currentTime = state.clock.elapsedTime * 1000
    const thresholdSq = lineThreshold * lineThreshold
    const thrustRadius = 80
    const thrustRadiusSq = thrustRadius * thrustRadius

    let mouseWorldX = 0
    let mouseWorldY = 0

    if (isDragging) {
      const aspect = size.width / size.height
      mouseWorldX = mouseNDC.x * FIELD_SIZE * 0.5 * aspect
      mouseWorldY = mouseNDC.y * FIELD_SIZE * 0.5
    }

    if (isDragging && !wasDraggingRef.current) {
      releaseTimeRef.current = 0
    }
    if (!isDragging && wasDraggingRef.current) {
      releaseTimeRef.current = currentTime
      onRelease()
    }
    wasDraggingRef.current = isDragging

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const i2 = i * 2

      let vx = velocities[i2]
      let vy = velocities[i2 + 1]

      if (isDragging) {
        const dx = positions[i3] - mouseWorldX
        const dy = positions[i3 + 1] - mouseWorldY
        const distSq = dx * dx + dy * dy

        if (distSq < thrustRadiusSq) {
          const dist = Math.sqrt(distSq)
          const factor = (1 - dist / thrustRadius) * thrustStrength
          
          if (dist > 0.001) {
            vx += (dx / dist) * factor
            vy += (dy / dist) * factor
          }
        }
      } else if (releaseTimeRef.current > 0) {
        const elapsed = currentTime - releaseTimeRef.current
        if (elapsed < RECOVERY_TIME) {
          const t = elapsed / RECOVERY_TIME
          const userInfluence = 1 - t
          const randomInfluence = t

          const randVx = (Math.random() - 0.5) * 0.5
          const randVy = (Math.random() - 0.5) * 0.5

          vx = vx * userInfluence + randVx * randomInfluence
          vy = vy * userInfluence + randVy * randomInfluence
        }
      }

      vx *= DAMPING
      vy *= DAMPING

      vx += (Math.random() - 0.5) * 0.08 * JITTER
      vy += (Math.random() - 0.5) * 0.08 * JITTER

      velocities[i2] = vx
      velocities[i2 + 1] = vy

      positions[i3] += vx
      positions[i3 + 1] += vy

      const halfField = FIELD_SIZE / 2
      if (positions[i3] > halfField) positions[i3] = -halfField
      if (positions[i3] < -halfField) positions[i3] = halfField
      if (positions[i3 + 1] > halfField) positions[i3 + 1] = -halfField
      if (positions[i3 + 1] < -halfField) positions[i3 + 1] = halfField

      const speed = Math.sqrt(vx * vx + vy * vy)
      let color: THREE.Color

      if (speed < 0.5) {
        const t = speed / 0.5
        color = COLOR_STOPS.slow.clone().lerp(COLOR_STOPS.mid, t)
      } else if (speed < 2.0) {
        const t = (speed - 0.5) / 1.5
        color = COLOR_STOPS.mid.clone().lerp(COLOR_STOPS.fast, t)
      } else {
        color = COLOR_STOPS.fast
      }

      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      sizes[i] = baseSizes[i] * (particleSize / 3)
    }

    if (pointsGeometryRef.current) {
      pointsGeometryRef.current.attributes.position.needsUpdate = true
      pointsGeometryRef.current.attributes.color.needsUpdate = true
      pointsGeometryRef.current.attributes.size.needsUpdate = true
    }

    if (linesGeometryRef.current && linePositionsRef.current && lineAlphasRef.current) {
      const linePositions = linePositionsRef.current
      const lineAlphas = lineAlphasRef.current
      let lineIndex = 0

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3
        const xi = positions[i3]
        const yi = positions[i3 + 1]

        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const j3 = j * 3
          const dx = xi - positions[j3]
          const dy = yi - positions[j3 + 1]
          const distSq = dx * dx + dy * dy

          if (distSq < thresholdSq) {
            const alpha = 1 - distSq / thresholdSq

            const lIdx = lineIndex * 3
            linePositions[lIdx] = xi
            linePositions[lIdx + 1] = yi
            linePositions[lIdx + 2] = 0

            linePositions[lIdx + 3] = positions[j3]
            linePositions[lIdx + 4] = positions[j3 + 1]
            linePositions[lIdx + 5] = 0

            lineAlphas[lineIndex * 2] = alpha
            lineAlphas[lineIndex * 2 + 1] = alpha

            lineIndex++

            if (lineIndex * 2 >= 20000) break
          }
        }
        if (lineIndex * 2 >= 20000) break
      }

      const totalVerts = lineIndex * 2
      linesGeometryRef.current.setDrawRange(0, totalVerts)
      linesGeometryRef.current.attributes.position.needsUpdate = true
      linesGeometryRef.current.attributes.aAlpha.needsUpdate = true
    }
  })

  const linesInitData = useMemo(() => {
    const maxLines = 10000
    const linePositions = new Float32Array(maxLines * 6)
    const lineAlphas = new Float32Array(maxLines * 2)
    linePositionsRef.current = linePositions
    lineAlphasRef.current = lineAlphas
    return { linePositions, lineAlphas }
  }, [])

  return (
    <>
      <points geometry={pointsGeometryRef.current} material={pointsMaterial}>
        <bufferGeometry ref={pointsGeometryRef.current}>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={particleData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={PARTICLE_COUNT}
            array={particleData.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={PARTICLE_COUNT}
            array={particleData.sizes}
            itemSize={1}
          />
        </bufferGeometry>
      </points>

      <lineSegments geometry={linesGeometryRef.current} material={linesMaterial}>
        <bufferGeometry ref={linesGeometryRef.current}>
          <bufferAttribute
            attach="attributes-position"
            count={10000 * 2}
            array={linesInitData.linePositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aAlpha"
            count={10000 * 2}
            array={linesInitData.lineAlphas}
            itemSize={1}
          />
        </bufferGeometry>
      </lineSegments>
    </>
  )
}

export default ParticleField
