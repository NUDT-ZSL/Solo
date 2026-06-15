import React, { useRef, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { audioProcessor } from './audioProcessor'

export type ColorTheme = 'gradient' | 'solid' | 'rainbow'
export type BackgroundPreset = '#000011' | '#1a0033' | '#001f3f'

export interface ParticleParams {
  particleSize: number
  particleSpeed: number
  colorTheme: ColorTheme
  solidColor: string
  background: BackgroundPreset
}

interface ParticleSystemProps {
  params: ParticleParams
  spectrumCallback?: (spectrum: Float32Array) => void
}

const PARTICLE_COUNT = 100000
const SHELL_RADIUS = 5

const LOW_MIN = 2.0
const LOW_MAX = 4.0
const MID_BASE = 5.0
const HIGH_MIN = 5.0
const HIGH_MAX = 8.0

const PARTICLES_PER_GROUP = Math.floor(PARTICLE_COUNT / 3)
const GROUP_LOW_END = PARTICLES_PER_GROUP
const GROUP_MID_END = PARTICLES_PER_GROUP * 2

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return [r, g, b]
}

function ParticleSystem({ params, spectrumCallback }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const velocitiesRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3))
  const phiThetaRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 2))
  const particleGroupRef = useRef<Uint8Array>(new Uint8Array(PARTICLE_COUNT))
  const targetRadiiRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT))
  const timeRef = useRef(0)
  const smoothedEnergiesRef = useRef({ low: 0, mid: 0, high: 0 })
  const frameCountRef = useRef(0)

  const materialRef = useRef<THREE.PointsMaterial | null>(null)
  const three = useThree()

  const geometry = useMemo(() => {
    const posArr = new Float32Array(PARTICLE_COUNT * 3)
    const colArr = new Float32Array(PARTICLE_COUNT * 3)
    const phiTheta = phiThetaRef.current
    const groups = particleGroupRef.current
    const targetRadii = targetRadiiRef.current

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.random() * Math.PI * 2
      const cosTheta = Math.random() * 2 - 1
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta)
      const theta = Math.acos(cosTheta)

      phiTheta[i * 2] = phi
      phiTheta[i * 2 + 1] = theta

      let group: number
      if (i < GROUP_LOW_END) {
        group = 0
      } else if (i < GROUP_MID_END) {
        group = 1
      } else {
        group = 2
      }
      groups[i] = group

      let radius = SHELL_RADIUS
      if (group === 0) {
        radius = LOW_MIN + Math.random() * (LOW_MAX - LOW_MIN)
      } else if (group === 1) {
        radius = MID_BASE
      } else {
        radius = HIGH_MIN + Math.random() * (HIGH_MAX - HIGH_MIN)
      }
      targetRadii[i] = radius

      const x = radius * sinTheta * Math.cos(phi)
      const y = radius * sinTheta * Math.sin(phi)
      const z = radius * cosTheta

      posArr[i * 3] = x
      posArr[i * 3 + 1] = y
      posArr[i * 3 + 2] = z

      colArr[i * 3] = 0.5
      colArr[i * 3 + 1] = 1
      colArr[i * 3 + 2] = 1
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3))

    return geo
  }, [])

  const solidColorRgb = useMemo(() => {
    const c = new THREE.Color(params.solidColor)
    return [c.r, c.g, c.b]
  }, [params.solidColor])

  const computeSpectrumEnergies = useCallback((): { low: number; mid: number; high: number } => {
    const energies = audioProcessor.getLowMidHighEnergies()
    const alpha = 0.85
    const smoothed = smoothedEnergiesRef.current
    smoothed.low = smoothed.low * alpha + energies.low * (1 - alpha)
    smoothed.mid = smoothed.mid * alpha + energies.mid * (1 - alpha)
    smoothed.high = smoothed.high * alpha + energies.high * (1 - alpha)
    return smoothed
  }, [])

  useFrame((_, delta) => {
    if (!pointsRef.current) return

    frameCountRef.current++
    timeRef.current += delta

    const mesh = pointsRef.current
    const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = mesh.geometry.getAttribute('color') as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array
    const colArr = colAttr.array as Float32Array
    const velocities = velocitiesRef.current
    const phiTheta = phiThetaRef.current
    const groups = particleGroupRef.current
    const targetRadii = targetRadiiRef.current

    const energies = computeSpectrumEnergies()
    const lowE = Math.max(0, Math.min(1, energies.low * 1.5))
    const midE = Math.max(0, Math.min(1, energies.mid * 1.5))
    const highE = Math.max(0, Math.min(1, energies.high * 1.5))

    if (spectrumCallback && (frameCountRef.current % 2 === 0)) {
      const spec = audioProcessor.getSharedSpectrum()
      if (spec) spectrumCallback(spec)
    }

    const speed = params.particleSpeed
    const damping = 0.98
    const t = timeRef.current

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const i2 = i * 2
      const group = groups[i]
      const phi = phiTheta[i2]
      const theta = phiTheta[i2 + 1]

      let targetRadius: number
      let ringInfluence = 0

      if (group === 0) {
        targetRadius = LOW_MIN + lowE * (LOW_MAX - LOW_MIN)
        targetRadii[i] = targetRadius
      } else if (group === 1) {
        ringInfluence = midE * 0.8
        const ringRadius = MID_BASE + Math.sin(t * 2 + i * 0.0005) * ringInfluence * 1.5
        targetRadius = ringRadius
        targetRadii[i] = targetRadius
      } else {
        targetRadius = HIGH_MIN + highE * (HIGH_MAX - HIGH_MIN)
        targetRadii[i] = targetRadius
      }

      const sinTheta = Math.sin(theta)
      const baseX = targetRadius * sinTheta * Math.cos(phi)
      const baseY = targetRadius * sinTheta * Math.sin(phi)
      const baseZ = targetRadius * Math.cos(theta)

      let tx = baseX
      let ty = baseY
      let tz = baseZ

      if (group === 1 && ringInfluence > 0.1) {
        const ringAngle = t * 3 + i * 0.001
        const ringOffset = ringInfluence * 2
        tx += Math.cos(ringAngle) * ringOffset * Math.sin(theta)
        ty += Math.sin(ringAngle) * ringOffset * Math.sin(theta)
        tz += Math.sin(ringAngle * 0.7) * ringOffset * 0.5
      }

      if (group === 0) {
        const pulse = 1 + lowE * 0.3 * Math.sin(t * 4 + i * 0.002)
        tx *= pulse
        ty *= pulse
        tz *= pulse
      }

      if (group === 2) {
        const spread = 1 + highE * 0.5 * Math.sin(t * 5 + i * 0.003)
        tx *= spread
        ty *= spread
        tz *= spread
      }

      const randX = (Math.random() - 0.5) * 0.1 * speed
      const randY = (Math.random() - 0.5) * 0.1 * speed
      const randZ = (Math.random() - 0.5) * 0.1 * speed

      const forceX = (tx - posArr[i3]) * 0.05 * speed + randX
      const forceY = (ty - posArr[i3 + 1]) * 0.05 * speed + randY
      const forceZ = (tz - posArr[i3 + 2]) * 0.05 * speed + randZ

      velocities[i3] = (velocities[i3] + forceX) * damping
      velocities[i3 + 1] = (velocities[i3 + 1] + forceY) * damping
      velocities[i3 + 2] = (velocities[i3 + 2] + forceZ) * damping

      posArr[i3] += velocities[i3]
      posArr[i3 + 1] += velocities[i3 + 1]
      posArr[i3 + 2] += velocities[i3 + 2]

      const groupEnergy = group === 0 ? lowE : (group === 1 ? midE : highE)
      const intensity = 0.5 + groupEnergy * 0.5

      if (params.colorTheme === 'gradient') {
        const tNorm = (theta / Math.PI)
        const r = 0.5 + tNorm * 0.5
        const g = 1 - tNorm * 0.5
        const b = 1

        colArr[i3] = r * intensity
        colArr[i3 + 1] = g * intensity
        colArr[i3 + 2] = b * intensity
      } else if (params.colorTheme === 'solid') {
        colArr[i3] = solidColorRgb[0] * intensity
        colArr[i3 + 1] = solidColorRgb[1] * intensity
        colArr[i3 + 2] = solidColorRgb[2] * intensity
      } else {
        let hue: number
        if (group === 0) {
          hue = ((i / GROUP_LOW_END) * 0.3 + t * 0.02) % 1
        } else if (group === 1) {
          hue = (0.3 + ((i - GROUP_LOW_END) / PARTICLES_PER_GROUP) * 0.4 + t * 0.03) % 1
        } else {
          hue = (0.7 + ((i - GROUP_MID_END) / PARTICLES_PER_GROUP) * 0.3 + t * 0.04) % 1
        }
        const [r, g, b] = hslToRgb(hue, 0.85, 0.5 + intensity * 0.3)
        colArr[i3] = r
        colArr[i3 + 1] = g
        colArr[i3 + 2] = b
      }
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
  })

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.size = params.particleSize
      materialRef.current.needsUpdate = true
    }
  }, [params.particleSize])

  useEffect(() => {
    const bgColor = new THREE.Color(params.background)
    three.scene.background = bgColor
    three.scene.fog = new THREE.Fog(bgColor, 15, 35)
  }, [params.background, three.scene])

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={materialRef}
        size={params.particleSize}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#4facfe" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00f2fe" />
    </>
  )
}

interface ParticleSceneProps {
  params: ParticleParams
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>
  isExporting?: boolean
  exportingScale?: number
  spectrumCallback?: (spectrum: Float32Array) => void
}

export function ParticleScene({ params, canvasRef, isExporting, exportingScale = 1, spectrumCallback }: ParticleSceneProps) {
  const bgColor = params.background

  const glConfig = useMemo(() => ({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance' as const,
    preserveDrawingBuffer: true,
    precision: 'highp' as const,
  }), [])

  return (
    <Canvas
      ref={canvasRef as React.Ref<HTMLCanvasElement>}
      gl={glConfig}
      camera={{ position: [0, 0, 12], fov: 60, near: 0.1, far: 1000 }}
      frameloop="always"
      style={{
        background: bgColor,
        width: isExporting ? `${100 * exportingScale}%` : '100%',
        height: isExporting ? `${100 * exportingScale}%` : '100%',
      }}
    >
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 15, 35]} />
      <SceneLighting />
      <ParticleSystem params={params} spectrumCallback={spectrumCallback} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        minDistance={5}
        maxDistance={25}
        autoRotate={!isExporting}
        autoRotateSpeed={0.3}
      />
    </Canvas>
  )
}

export default ParticleScene
