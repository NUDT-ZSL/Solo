import { useRef, useMemo, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore, getCurrentTheme, COLOR_THEMES } from '@/store'
import { applyRippleForce } from '@/components/rippleEffect'

const SPREAD = 20
const DAMPING = 0.97
const TIDAL_RANGE = 8

const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPosition.z);
    gl_PointSize = max(gl_PointSize, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vAlpha = smoothstep(0.0, 2.0, aSize);
  }
`

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float glow = 1.0 - dist * 2.0;
    glow = pow(glow, 1.5);
    gl_FragColor = vec4(vColor, glow * vAlpha * 0.9);
  }
`

interface ParticleData {
  positions: Float32Array
  velocities: Float32Array
  originalPositions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  phases: Float32Array
  count: number
}

function createParticleData(count: number, theme: ReturnType<typeof getCurrentTheme>): ParticleData {
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  const originalPositions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)

  const c1 = new THREE.Color(theme.particle1)
  const c2 = new THREE.Color(theme.particle2)
  const tempColor = new THREE.Color()

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const x = (Math.random() - 0.5) * SPREAD * 2
    const z = (Math.random() - 0.5) * SPREAD * 2
    const y = (Math.random() - 0.5) * 0.5

    positions[i3] = x
    positions[i3 + 1] = y
    positions[i3 + 2] = z

    originalPositions[i3] = x
    originalPositions[i3 + 1] = y
    originalPositions[i3 + 2] = z

    velocities[i3] = 0
    velocities[i3 + 1] = 0
    velocities[i3 + 2] = 0

    const t = Math.random()
    tempColor.copy(c1).lerp(c2, t)
    colors[i3] = tempColor.r
    colors[i3 + 1] = tempColor.g
    colors[i3 + 2] = tempColor.b

    sizes[i] = 0.8 + Math.random() * 1.5
    phases[i] = Math.random() * Math.PI * 2
  }

  return { positions, velocities, originalPositions, colors, sizes, phases, count }
}

export default function ParticleOcean() {
  const pointsRef = useRef<THREE.Points>(null)
  const dataRef = useRef<ParticleData | null>(null)
  const mouseRef = useRef({ x: 0, z: 0, active: false })
  const timeRef = useRef(0)
  const { gl } = useThree()

  const particleDensity = useSceneStore((s) => s.particleDensity)
  const tidalStrength = useSceneStore((s) => s.tidalStrength)
  const colorTheme = useSceneStore((s) => s.colorTheme)
  const ripples = useSceneStore((s) => s.ripples)
  const addRipple = useSceneStore((s) => s.addRipple)

  const theme = useMemo(() => {
    return COLOR_THEMES.find((t) => t.name === colorTheme) || COLOR_THEMES[0]
  }, [colorTheme])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const data = createParticleData(particleDensity, theme)
    dataRef.current = data

    geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    geo.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1))

    return geo
  }, [particleDensity])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useEffect(() => {
    if (!dataRef.current) return
    const data = dataRef.current
    const c1 = new THREE.Color(theme.particle1)
    const c2 = new THREE.Color(theme.particle2)
    const tempColor = new THREE.Color()

    for (let i = 0; i < data.count; i++) {
      const t = Math.random()
      tempColor.copy(c1).lerp(c2, t)
      data.colors[i * 3] = tempColor.r
      data.colors[i * 3 + 1] = tempColor.g
      data.colors[i * 3 + 2] = tempColor.b
    }

    const colorAttr = geometry.getAttribute('aColor') as THREE.BufferAttribute
    if (colorAttr) {
      colorAttr.needsUpdate = true
    }
  }, [theme, geometry])

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1

      const camera = (gl as any).properties?.get?.()?.camera
      void camera

      const x = ndcX * TIDAL_RANGE
      const z = ndcY * TIDAL_RANGE

      mouseRef.current = { x, z, active: true }
    },
    [gl]
  )

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1

      const x = ndcX * TIDAL_RANGE
      const z = ndcY * TIDAL_RANGE

      addRipple(x, z)
    },
    [gl, addRipple]
  )

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('click', handleClick)
    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('click', handleClick)
    }
  }, [gl, handlePointerMove, handleClick])

  useFrame((state, delta) => {
    if (!pointsRef.current || !dataRef.current) return

    const dt = Math.min(delta, 0.05)
    timeRef.current += dt
    const time = timeRef.current
    const data = dataRef.current
    const { positions, velocities, originalPositions, count } = data
    const mouse = mouseRef.current
    const forceVec = { x: 0, z: 0 }

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const px = positions[i3]
      const pz = positions[i3 + 2]

      const waveY =
        Math.sin(originalPositions[i3] * 0.3 + time * 0.5 + data.phases[i]) * 0.3 +
        Math.cos(originalPositions[i3 + 2] * 0.4 + time * 0.3) * 0.2

      positions[i3 + 1] += (waveY - positions[i3 + 1]) * 0.02

      if (mouse.active) {
        const dx = mouse.x - px
        const dz = mouse.z - pz
        const distSq = dx * dx + dz * dz
        const dist = Math.sqrt(distSq + 0.01)

        if (dist < TIDAL_RANGE) {
          const falloff = 1.0 - dist / TIDAL_RANGE
          const radialStrength = falloff * falloff * tidalStrength * 2.0

          velocities[i3] += (dx / dist) * radialStrength * dt * 3.0
          velocities[i3 + 2] += (dz / dist) * radialStrength * dt * 3.0

          const tangentX = -dz / dist
          const tangentZ = dx / dist
          const swirlStrength = falloff * tidalStrength * 1.5

          velocities[i3] += tangentX * swirlStrength * dt * 2.0
          velocities[i3 + 2] += tangentZ * swirlStrength * dt * 2.0
        }
      }

      if (ripples.length > 0) {
        applyRippleForce(px, pz, ripples, dt, forceVec)
        velocities[i3] += forceVec.x * dt
        velocities[i3 + 2] += forceVec.z * dt
      }

      velocities[i3] *= DAMPING
      velocities[i3 + 1] *= DAMPING
      velocities[i3 + 2] *= DAMPING

      const returnForceX = (originalPositions[i3] - px) * 0.01
      const returnForceZ = (originalPositions[i3 + 2] - pz) * 0.01
      velocities[i3] += returnForceX
      velocities[i3 + 2] += returnForceZ

      positions[i3] += velocities[i3]
      positions[i3 + 1] += velocities[i3 + 1]
      positions[i3 + 2] += velocities[i3 + 2]
    }

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    if (posAttr) {
      posAttr.needsUpdate = true
    }

    pointsRef.current.geometry.computeBoundingSphere()

    void state
  })

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  )
}
