import { useRef, useMemo, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

export interface GardenData {
  bands: { low: number[]; mid: number[]; high: number[] }
  energyRates: { low: number[]; mid: number[]; high: number[] }
  audioBase64?: string
}

export type BandKey = 'low' | 'mid' | 'high'

interface Pulse {
  band: BandKey
  nodeIndex: number
  startTime: number
  duration: number
  isPrimary: boolean
}

const COLORS: Record<BandKey, [string, string]> = {
  low: ['#FF6B35', '#F7C948'],
  mid: ['#6B5B95', '#B088D6'],
  high: ['#00B4D8', '#90E0EF']
}

const ANGLES: Record<BandKey, number> = {
  low: -Math.PI / 2,
  mid: -Math.PI / 2 + (Math.PI * 2) / 3,
  high: -Math.PI / 2 + (Math.PI * 4) / 3
}

const BAND_FREQ: Record<BandKey, [number, number]> = {
  low: [80, 180],
  mid: [400, 1600],
  high: [2500, 7500]
}

interface WaveTubeProps {
  band: BandKey
  energies: number[]
  energyRates: number[]
  colorStart: string
  colorEnd: string
  angle: number
  onPick: (band: BandKey, nodeIndex: number) => void
  pulses: Pulse[]
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255
  ]
}

function buildControlPoints(
  energies: number[],
  angle: number,
  numPoints: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  const len = energies.length || 1
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1)
    const srcIdx = Math.min(Math.floor(t * len), len - 1)
    const energy = energies[srcIdx] || 0
    const height = Math.min(3, energy * 3)
    const radius = 0.5 + t * 2.5
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = height
    const bendAngle = (t - 0.5) * 0.4 + (energy - 0.5) * 0.3
    const bx = x + Math.cos(angle + bendAngle) * 0.2 * t
    const bz = z + Math.sin(angle + bendAngle) * 0.2 * t
    points.push(new THREE.Vector3(bx, y, bz))
  }
  return points
}

function computePulseOpacity(
  pulses: Pulse[],
  band: BandKey,
  nodeIndex: number,
  now: number,
  isPrimary: boolean
): number {
  let maxOpacity = 0
  for (const p of pulses) {
    if (p.isPrimary !== isPrimary) continue
    if (isPrimary && p.band !== band) continue
    const elapsed = (now - p.startTime) / 1000
    if (elapsed > p.duration) continue
    const nodeDist = Math.abs(nodeIndex - p.nodeIndex)
    const maxDist = isPrimary ? 40 : 20
    if (nodeDist > maxDist) continue
    const t = elapsed / p.duration
    const distFactor = 1 - nodeDist / maxDist
    const baseOpacity = isPrimary ? 1.0 : 0.3
    const opacity = baseOpacity * (1 - t) * distFactor
    if (opacity > maxOpacity) maxOpacity = opacity
  }
  return Math.min(1, maxOpacity)
}

function WaveTube({
  band,
  energies,
  energyRates,
  colorStart,
  colorEnd,
  angle,
  onPick,
  pulses
}: WaveTubeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const controlPoints = useMemo(
    () => buildControlPoints(energies, angle, 200),
    [energies, angle]
  )

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.5)
  }, [controlPoints])

  const radialSegments = 12
  const tubularSegments = 200

  const geometry = useMemo(() => {
    const geo = new THREE.TubeGeometry(curve, tubularSegments, 0.12, radialSegments, false)
    const positions = geo.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(positions.count * 3)
    const cs = hexToRgb(colorStart)
    const ce = hexToRgb(colorEnd)

    const len = energyRates.length || 1
    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments
      const srcIdx = Math.min(Math.floor(t * len), len - 1)
      const rate = Math.min(1, Math.max(0, (energyRates[srcIdx] || 0) / 0.3))
      const radius = 0.05 + rate * 0.25
      for (let j = 0; j <= radialSegments; j++) {
        const idx = i * (radialSegments + 1) + j
        if (idx >= tubularSegments + 1) continue
        const vertIdx = i * (radialSegments + 1) + j
        if (vertIdx * 3 >= colors.length) continue
        const angle2 = (j / radialSegments) * Math.PI * 2
        const tangent = curve.getTangentAt(t)
        const normal = new THREE.Vector3()
        const binormal = new THREE.Vector3()
        const up = new THREE.Vector3(0, 1, 0)
        normal.crossVectors(tangent, up).normalize()
        binormal.crossVectors(tangent, normal).normalize()
        const center = curve.getPointAt(t)
        const px = center.x + (normal.x * Math.cos(angle2) + binormal.x * Math.sin(angle2)) * radius
        const py = center.y + (normal.y * Math.cos(angle2) + binormal.y * Math.sin(angle2)) * radius
        const pz = center.z + (normal.z * Math.cos(angle2) + binormal.z * Math.sin(angle2)) * radius
        positions.setXYZ(vertIdx, px, py, pz)
        const cr = cs[0] + (ce[0] - cs[0]) * t
        const cg = cs[1] + (ce[1] - cs[1]) * t
        const cb = cs[2] + (ce[2] - cs[2]) * t
        colors[vertIdx * 3] = cr
        colors[vertIdx * 3 + 1] = cg
        colors[vertIdx * 3 + 2] = cb
      }
    }
    positions.needsUpdate = true
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [curve, colorStart, colorEnd, energyRates])

  const glowGeometry = useMemo(() => {
    const geo = new THREE.TubeGeometry(curve, tubularSegments, 0.22, radialSegments, false)
    return geo
  }, [curve])

  const glowMaterialRef = useRef<THREE.ShaderMaterial | null>(null)
  const baseMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null)

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (!e.face) return
      const vertIdx = e.face.a
      const segIdx = Math.floor(vertIdx / (radialSegments + 1))
      const numSegs = energies.length || 200
      const nodeIdx = Math.min(numSegs - 1, Math.max(0, Math.round((segIdx / tubularSegments) * numSegs)))
      onPick(band, nodeIdx)
    },
    [band, onPick, energies.length]
  )

  useFrame(() => {
    const now = performance.now()
    if (glowMaterialRef.current) {
      const segIndex = 0
      const prim = computePulseOpacity(pulses, band, segIndex, now, true)
      const sec = computePulseOpacity(pulses, band, segIndex, now, false)
      const total = Math.max(prim, sec)
      glowMaterialRef.current.uniforms.uOpacity.value = total
      glowMaterialRef.current.uniforms.uTime.value = now * 0.001
    }
  })

  useEffect(() => {
    if (glowRef.current && glowMaterialRef.current) {
      glowMaterialRef.current.uniforms.uBand.value = band === 'low' ? 0 : band === 'mid' ? 0.5 : 1
    }
  }, [band])

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={handleClick}
      >
        <meshStandardMaterial
          ref={(m) => { if (m) baseMaterialRef.current = m }}
          vertexColors
          side={THREE.DoubleSide}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      <mesh ref={glowRef} geometry={glowGeometry}>
        <shaderMaterial
          ref={(m) => {
            if (m) {
              glowMaterialRef.current = m
              m.uniforms = {
                uOpacity: { value: 0 },
                uTime: { value: 0 },
                uBand: { value: 0 }
              }
            }
          }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vPos;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vPos = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float uOpacity;
            uniform float uTime;
            uniform float uBand;
            varying vec3 vNormal;
            varying vec3 vPos;
            void main() {
              float fres = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
              vec3 c1, c2;
              if (uBand < 0.25) { c1 = vec3(1.0, 0.42, 0.21); c2 = vec3(0.97, 0.79, 0.28); }
              else if (uBand < 0.75) { c1 = vec3(0.42, 0.36, 0.58); c2 = vec3(0.69, 0.53, 0.84); }
              else { c1 = vec3(0.0, 0.71, 0.85); c2 = vec3(0.56, 0.88, 0.94); }
              float h = clamp(vPos.y / 3.0, 0.0, 1.0);
              vec3 col = mix(c1, c2, h);
              float pulse = 0.6 + 0.4 * sin(uTime * 6.0);
              gl_FragColor = vec4(col * pulse, uOpacity * fres * 0.9);
              if (gl_FragColor.a < 0.01) discard;
            }
          `}
        />
      </mesh>
    </group>
  )
}

interface FloorProps {
  data: GardenData | null
}

function FloorGrid({ data }: FloorProps) {
  const size = 8
  const divisions = 20
  const positions = useMemo(() => {
    const arr: [number, number, number][] = []
    for (let i = 0; i <= divisions; i++) {
      const t = i / divisions
      const a = -size / 2 + t * size
      arr.push([a, 0, -size / 2])
      arr.push([a, 0, size / 2])
      arr.push([-size / 2, 0, a])
      arr.push([size / 2, 0, a])
    }
    return arr
  }, [])

  const totalEnergy = data
    ? (data.bands.low.reduce((a, b) => a + b, 0) +
        data.bands.mid.reduce((a, b) => a + b, 0) +
        data.bands.high.reduce((a, b) => a + b, 0)) /
      300
    : 0

  return (
    <group>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length}
            array={new Float32Array(positions.flat())}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#1a1a3e" transparent opacity={0.6} />
      </lineSegments>
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color="#0a0a18" transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.8, 3.2, 64]} />
        <meshBasicMaterial
          color={`rgba(0, 180, 216, ${0.1 + totalEnergy * 0.15})`}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

interface GardenSceneProps {
  data: GardenData | null
  onBandPick: (band: BandKey, nodeIndex: number, audio: string | undefined, bandsData: GardenData['bands']) => void
}

function GardenScene({ data, onBandPick }: GardenSceneProps) {
  const [pulses, setPulses] = useState<Pulse[]>([])

  const removeOldPulses = useCallback(() => {
    const now = performance.now()
    setPulses(prev => prev.filter(p => (now - p.startTime) / 1000 < p.duration + 0.1))
  }, [])

  useEffect(() => {
    const id = setInterval(removeOldPulses, 200)
    return () => clearInterval(id)
  }, [removeOldPulses])

  const handlePick = useCallback(
    (band: BandKey, nodeIndex: number) => {
      if (!data) return
      const now = performance.now()
      setPulses(prev => [
        ...prev,
        { band, nodeIndex, startTime: now, duration: 0.8, isPrimary: true },
        ...(Object.keys(ANGLES) as BandKey[])
          .filter(b => b !== band)
          .map(b => ({
            band: b,
            nodeIndex,
            startTime: now + 0.05,
            duration: 0.4,
            isPrimary: false as const
          }))
      ])
      onBandPick(band, nodeIndex, data.audioBase64, data.bands)
    },
    [data, onBandPick]
  )

  useEffect(() => {
    setPulses([])
  }, [data])

  if (!data) {
    return (
      <group>
        <FloorGrid data={null} />
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 8, 5]} intensity={0.8} color="#ffffff" />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} minDistance={3} maxDistance={20} />
      </group>
    )
  }

  const bands: BandKey[] = ['low', 'mid', 'high']

  return (
    <group>
      <FloorGrid data={data} />
      <ambientLight intensity={0.35} />
      <pointLight position={[6, 10, 6]} intensity={1.0} color="#ffffff" />
      <pointLight position={[-5, 4, -5]} intensity={0.5} color="#6B5B95" />
      <pointLight position={[5, 3, -5]} intensity={0.4} color="#00B4D8" />
      {bands.map(b => (
        <WaveTube
          key={b}
          band={b}
          energies={data.bands[b]}
          energyRates={data.energyRates[b]}
          colorStart={COLORS[b][0]}
          colorEnd={COLORS[b][1]}
          angle={ANGLES[b]}
          onPick={handlePick}
          pulses={pulses}
        />
      ))}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={20}
        target={[0, 1.5, 0]}
      />
    </group>
  )
}

export interface GardenViewProps {
  data: GardenData | null
  onBandPick: (band: BandKey, nodeIndex: number, audio: string | undefined, bandsData: GardenData['bands']) => void
}

export default function GardenView({ data, onBandPick }: GardenViewProps) {
  return (
    <Canvas
      camera={{ position: [6, 5, 8], fov: 50 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ background: '#0D0D1A' }}
    >
      <color attach="background" args={['#0D0D1A']} />
      <fog attach="fog" args={['#0D0D1A', 10, 25]} />
      <GardenScene data={data} onBandPick={onBandPick} />
    </Canvas>
  )
}

export function playBandSound(
  band: BandKey,
  bands: GardenData['bands'],
  startIdx: number,
  ctx: AudioContext
) {
  const energies = bands[band]
  if (!energies.length) return
  const [fmin, fmax] = BAND_FREQ[band]
  const duration = 1.2
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const channel = buffer.getChannelData(0)
  const total = energies.length
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize
    const eIdx = Math.min(total - 1, Math.max(0, startIdx + Math.floor((t - 0.5) * total)))
    const energy = energies[eIdx] || 0
    const freq = fmin + (fmax - fmin) * (0.3 + 0.7 * Math.abs(Math.sin(t * 4 + startIdx * 0.1)))
    const envelope = Math.sin(t * Math.PI)
    const noise = (Math.random() * 2 - 1) * 0.7
    const tone = Math.sin(i * 2 * Math.PI * freq / ctx.sampleRate) * 0.3
    const val = (noise + tone) * energy * envelope * 0.35
    channel[i] = Math.max(-1, Math.min(1, val))
  }
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = (fmin + fmax) / 2
  filter.Q.value = 0.8
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.4, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  src.start()
  src.stop(ctx.currentTime + duration)
}

export { BAND_FREQ }
