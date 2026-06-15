import React, { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
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
  isExporting?: boolean
  onFrame?: (time: number) => void
}

const PARTICLE_COUNT = 100000
const SHELL_RADIUS = 5

function ParticleSystem({ params, onFrame }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const velocitiesRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3))
  const basePositionsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3))
  const phiThetaRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 2))
  const timeRef = useRef(0)
  const smoothedSpectrumRef = useRef<Float32Array>(new Float32Array(128))

  const geometry = useMemo(() => {
    const posArr = new Float32Array(PARTICLE_COUNT * 3)
    const colArr = new Float32Array(PARTICLE_COUNT * 3)
    const phiTheta = phiThetaRef.current

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.random() * Math.PI * 2
      const cosTheta = Math.random() * 2 - 1
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta)
      const theta = Math.acos(cosTheta)

      phiTheta[i * 2] = phi
      phiTheta[i * 2 + 1] = theta

      const x = SHELL_RADIUS * sinTheta * Math.cos(phi)
      const y = SHELL_RADIUS * sinTheta * Math.sin(phi)
      const z = SHELL_RADIUS * cosTheta

      posArr[i * 3] = x
      posArr[i * 3 + 1] = y
      posArr[i * 3 + 2] = z

      basePositionsRef.current[i * 3] = x
      basePositionsRef.current[i * 3 + 1] = y
      basePositionsRef.current[i * 3 + 2] = z

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

  useFrame((_, delta) => {
    if (!pointsRef.current) return

    const mesh = pointsRef.current
    const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = mesh.geometry.getAttribute('color') as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array
    const colArr = colAttr.array as Float32Array
    const velocities = velocitiesRef.current
    const phiTheta = phiThetaRef.current
    const smoothed = smoothedSpectrumRef.current

    timeRef.current += delta

    let spectrum = audioProcessor.getSharedSpectrum()
    if (!spectrum) {
      spectrum = new Float32Array(1024)
      const t = timeRef.current
      for (let i = 0; i < spectrum.length; i++) {
        spectrum[i] = Math.sin(t * 2 + i * 0.1) * 0.3 + 0.3
      }
    }

    const spec128 = new Float32Array(128)
    const bucketSize = Math.floor(spectrum.length / 128)
    for (let i = 0; i < 128; i++) {
      let sum = 0
      for (let j = 0; j < bucketSize; j++) {
        sum += spectrum[i * bucketSize + j] || 0
      }
      spec128[i] = sum / bucketSize
    }

    for (let i = 0; i < 128; i++) {
      smoothed[i] = smoothed[i] * 0.85 + spec128[i] * 0.15
    }

    const lowFreqEnergy = smoothed.slice(0, 10).reduce((a, b) => a + b, 0) / 10
    const midFreqEnergy = smoothed.slice(10, 50).reduce((a, b) => a + b, 0) / 40
    const highFreqEnergy = smoothed.slice(50, 128).reduce((a, b) => a + b, 0) / 78

    const speed = params.particleSpeed
    const damping = 0.98

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const i2 = i * 2
      const phi = phiTheta[i2]
      const theta = phiTheta[i2 + 1]

      const specIndex = Math.floor((theta / Math.PI) * 120)
      const freqInfluence = smoothed[Math.min(specIndex, 127)]

      let targetRadius: number
      if (freqInfluence < 0.33) {
        targetRadius = 2 + lowFreqEnergy * 2
      } else if (freqInfluence < 0.66) {
        targetRadius = 4.5 + midFreqEnergy * 1
      } else {
        targetRadius = 5 + highFreqEnergy * 3
      }

      const sinTheta = Math.sin(theta)
      const baseX = targetRadius * sinTheta * Math.cos(phi)
      const baseY = targetRadius * sinTheta * Math.sin(phi)
      const baseZ = targetRadius * Math.cos(theta)

      const ringFactor = midFreqEnergy * 0.5
      const ringPhi = Math.sin(timeRef.current * 0.5 + i * 0.001) * Math.PI * ringFactor
      const ringTheta = Math.cos(timeRef.current * 0.3 + i * 0.0015) * ringFactor

      const bx = baseX + Math.cos(ringPhi) * ringFactor * 2
      const by = baseY + Math.sin(ringTheta) * ringFactor * 2
      const bz = baseZ + Math.sin(ringPhi + ringTheta) * ringFactor

      const randX = (Math.random() - 0.5) * 0.1
      const randY = (Math.random() - 0.5) * 0.1
      const randZ = (Math.random() - 0.5) * 0.1

      const forceX = (bx - posArr[i3]) * 0.05 * speed + randX * speed
      const forceY = (by - posArr[i3 + 1]) * 0.05 * speed + randY * speed
      const forceZ = (bz - posArr[i3 + 2]) * 0.05 * speed + randZ * speed

      velocities[i3] = (velocities[i3] + forceX) * damping
      velocities[i3 + 1] = (velocities[i3 + 1] + forceY) * damping
      velocities[i3 + 2] = (velocities[i3 + 2] + forceZ) * damping

      posArr[i3] += velocities[i3]
      posArr[i3 + 1] += velocities[i3 + 1]
      posArr[i3 + 2] += velocities[i3 + 2]

      if (params.colorTheme === 'gradient') {
        const t = freqInfluence
        const r = 0.5 + t * 0.5
        const g = 1 - t * 0.5
        const b = 1
        const intensity = 0.6 + freqInfluence * 0.4
        colArr[i3] = r * intensity
        colArr[i3 + 1] = g * intensity
        colArr[i3 + 2] = b * intensity
      } else if (params.colorTheme === 'solid') {
        const intensity = 0.6 + freqInfluence * 0.4
        colArr[i3] = solidColorRgb[0] * intensity
        colArr[i3 + 1] = solidColorRgb[1] * intensity
        colArr[i3 + 2] = solidColorRgb[2] * intensity
      } else {
        const hue = (i / PARTICLE_COUNT + timeRef.current * 0.05) % 1
        const hue6 = hue * 6
        const hi = Math.floor(hue6)
        const f = hue6 - hi
        const q = 1 - f
        const intensity = 0.6 + freqInfluence * 0.4

        let r, g, b
        switch (hi % 6) {
          case 0: r = 1; g = f; b = 0; break
          case 1: r = q; g = 1; b = 0; break
          case 2: r = 0; g = 1; b = f; break
          case 3: r = 0; g = q; b = 1; break
          case 4: r = f; g = 0; b = 1; break
          default: r = 1; g = 0; b = q; break
        }
        colArr[i3] = r * intensity
        colArr[i3 + 1] = g * intensity
        colArr[i3 + 2] = b * intensity
      }
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true

    if (onFrame) {
      onFrame(timeRef.current)
    }
  })

  useEffect(() => {
    const g = pointsRef.current?.geometry
    if (g) {
      const mat = pointsRef.current?.material as THREE.PointsMaterial
      if (mat) {
        mat.size = params.particleSize
        mat.needsUpdate = true
      }
    }
  }, [params.particleSize])

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
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
}

export function ParticleScene({ params, canvasRef, isExporting, exportingScale = 1 }: ParticleSceneProps) {
  const bgColor = params.background

  return (
    <Canvas
      ref={canvasRef as React.Ref<HTMLCanvasElement>}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      }}
      camera={{ position: [0, 0, 12], fov: 60, near: 0.1, far: 1000 }}
      style={{
        background: bgColor,
        width: isExporting ? `${100 * exportingScale}%` : '100%',
        height: isExporting ? `${100 * exportingScale}%` : '100%',
      }}
    >
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 15, 35]} />
      <SceneLighting />
      <ParticleSystem params={params} isExporting={isExporting} />
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
