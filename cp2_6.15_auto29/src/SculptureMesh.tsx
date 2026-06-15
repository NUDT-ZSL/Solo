import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAudioStore } from './store'

const RING_COUNT = 32
const DEFAULT_SEGMENTS = 64
const REDUCED_SEGMENTS = 32
const MIN_RADIUS = 0.5
const MAX_RADIUS = 3.0
const Y_SPACING = 0.22
const BEAT_EXPANSION = 0.3
const VERTEX_UPDATE_THRESHOLD = 5

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

interface SculptureMeshProps {}

export default function SculptureMesh({}: SculptureMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const geometryRef = useRef<THREE.BufferGeometry | null>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const basePositionsRef = useRef<Float32Array | null>(null)
  const targetColorsRef = useRef<THREE.Color[]>([])
  const currentColorsRef = useRef<THREE.Color[]>([])
  const beatStartTimeRef = useRef<number>(-1)
  const lastBeatRef = useRef<boolean>(false)
  const lastUpdateTimeRef = useRef<number>(0)
  const slowFrameCountRef = useRef<number>(0)
  const [segments, setSegments] = useState(DEFAULT_SEGMENTS)

  const spectrum = useAudioStore((s) => s.spectrum)
  const beat = useAudioStore((s) => s.beat)
  const lowFreqEnergy = useAudioStore((s) => s.lowFreqEnergy)
  const midFreqEnergy = useAudioStore((s) => s.midFreqEnergy)
  const highFreqEnergy = useAudioStore((s) => s.highFreqEnergy)

  const lowColor = useMemo(() => new THREE.Color('#ff3366'), [])
  const midColor = useMemo(() => new THREE.Color('#33ff66'), [])
  const highColor = useMemo(() => new THREE.Color('#3366ff'), [])
  const whiteColor = useMemo(() => new THREE.Color('#ffffff'), [])

  const { geometry, initialBasePositions } = useMemo(() => {
    const totalVertices = RING_COUNT * segments
    const positions = new Float32Array(totalVertices * 3)
    const basePositions = new Float32Array(totalVertices * 3)
    const colors = new Float32Array(totalVertices * 3)
    const indices: number[] = []
    const initialTargetColors: THREE.Color[] = []
    const initialCurrentColors: THREE.Color[] = []

    for (let ring = 0; ring < RING_COUNT; ring++) {
      const ringProgress = ring / (RING_COUNT - 1)
      const radius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * ringProgress
      const y = (ring - RING_COUNT / 2) * Y_SPACING
      const twistAngle = ringProgress * Math.PI * 1.5

      for (let i = 0; i < segments; i++) {
        const vi = ring * segments + i
        const angle = (i / segments) * Math.PI * 2 + twistAngle
        const mobiusOffset = Math.sin(angle * 0.5) * 0.3 * ringProgress

        const r = radius + mobiusOffset
        const x = Math.cos(angle) * r
        const z = Math.sin(angle) * r
        const yOffset = Math.sin(angle) * 0.15 * ringProgress

        const px = x
        const py = y + yOffset
        const pz = z

        positions[vi * 3] = px
        positions[vi * 3 + 1] = py
        positions[vi * 3 + 2] = pz
        basePositions[vi * 3] = px
        basePositions[vi * 3 + 1] = py
        basePositions[vi * 3 + 2] = pz

        colors[vi * 3] = 0.2
        colors[vi * 3 + 1] = 0.2
        colors[vi * 3 + 2] = 0.4

        initialTargetColors.push(new THREE.Color(0.2, 0.2, 0.4))
        initialCurrentColors.push(new THREE.Color(0.2, 0.2, 0.4))
      }

      for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments
        const a = ring * segments + i
        const b = ring * segments + next
        const c = (ring + 1) * segments + next
        const d = (ring + 1) * segments + i

        if (ring < RING_COUNT - 1) {
          indices.push(a, b, d)
          indices.push(b, c, d)
        }
      }
    }

    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments
      const a = (RING_COUNT - 1) * segments + i
      const b = (RING_COUNT - 1) * segments + next
      indices.push(a, b)
    }

    targetColorsRef.current = initialTargetColors
    currentColorsRef.current = initialCurrentColors

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    return {
      geometry: geo,
      initialBasePositions: basePositions,
    }
  }, [segments])

  useEffect(() => {
    basePositionsRef.current = initialBasePositions
    geometryRef.current = geometry
  }, [geometry, initialBasePositions])

  useEffect(() => {
    slowFrameCountRef.current = 0
    lastUpdateTimeRef.current = 0
    geometryRef.current = geometry
    geometry.computeVertexNormals()
  }, [segments, geometry])

  useFrame((state, delta) => {
    const startTime = performance.now()
    if (!geometryRef.current || !basePositionsRef.current) return

    const positionAttr = geometryRef.current.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = geometryRef.current.getAttribute('color') as THREE.BufferAttribute
    const positions = positionAttr.array as Float32Array
    const colors = colorAttr.array as Float32Array
    void basePositionsRef.current

    if (beat && !lastBeatRef.current) {
      beatStartTimeRef.current = state.clock.elapsedTime
    }
    lastBeatRef.current = beat

    let beatProgress = 0
    let beatExpansion = 0
    let beatFlash = 0

    if (beatStartTimeRef.current >= 0) {
      beatProgress = (state.clock.elapsedTime - beatStartTimeRef.current) / 0.3
      if (beatProgress >= 1) {
        beatProgress = 1
        beatStartTimeRef.current = -1
      }

      const expansionProgress = Math.min(beatProgress, 0.2 / 0.3) / (0.2 / 0.3)
      beatExpansion = easeOut(1 - expansionProgress) * BEAT_EXPANSION

      beatFlash = Math.sin(beatProgress * Math.PI) * 1.5
    }

    const colorLerpSpeed = 0.1
    const colorLerpAmount = Math.min(1, delta / colorLerpSpeed)

    const totalEnergy = lowFreqEnergy + midFreqEnergy + highFreqEnergy + 0.001
    const lowWeight = lowFreqEnergy / totalEnergy
    const midWeight = midFreqEnergy / totalEnergy
    const highWeight = highFreqEnergy / totalEnergy

    const globalTargetColor = new THREE.Color(
      lowColor.r * lowWeight + midColor.r * midWeight + highColor.r * highWeight,
      lowColor.g * lowWeight + midColor.g * midWeight + highColor.g * highWeight,
      lowColor.b * lowWeight + midColor.b * midWeight + highColor.b * highWeight
    )

    if (beatFlash > 0) {
      globalTargetColor.lerp(whiteColor, beatFlash * 0.4)
    }

    const spectrumLength = spectrum.length

    for (let ring = 0; ring < RING_COUNT; ring++) {
      const ringProgress = ring / (RING_COUNT - 1)
      const specIndex = Math.floor(ringProgress * (spectrumLength - 1))
      const specValue = spectrum[specIndex] || 0
      const adjSpecIndex = Math.min(specIndex + 1, spectrumLength - 1)
      const adjSpecValue = spectrum[adjSpecIndex] || 0
      const localT = (ringProgress * (spectrumLength - 1)) % 1
      const smoothSpec = lerp(specValue, adjSpecValue, localT)

      const ringExpansion = beatExpansion * (0.7 + ringProgress * 0.6)
      const baseRadius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * ringProgress
      const yCenter = (ring - RING_COUNT / 2) * Y_SPACING

      const ringFreqColor = new THREE.Color()
      if (ringProgress < 0.33) {
        ringFreqColor.copy(lowColor).lerp(midColor, ringProgress / 0.33)
      } else if (ringProgress < 0.66) {
        ringFreqColor.copy(midColor).lerp(highColor, (ringProgress - 0.33) / 0.33)
      } else {
        ringFreqColor.copy(highColor)
      }

      const vertexTargetColor = new THREE.Color()
      vertexTargetColor.copy(globalTargetColor).lerp(ringFreqColor, 0.3 + ringProgress * 0.3)
      vertexTargetColor.multiplyScalar(0.6 + smoothSpec * 0.8)

      const twistAngle = ringProgress * Math.PI * 1.5

      for (let i = 0; i < segments; i++) {
        const vi = ring * segments + i
        const bi = vi * 3

        const angle = (i / segments) * Math.PI * 2 + twistAngle
        const mobiusFactor = Math.sin(angle * 0.5) * 0.3 * ringProgress

        const radius = baseRadius + mobiusFactor + ringExpansion + smoothSpec * 1.2
        const waveDeform = Math.sin(angle * 3 + state.clock.elapsedTime * 2 + ring * 0.3) * smoothSpec * 0.4
        const finalRadius = radius + waveDeform

        const x = Math.cos(angle) * finalRadius
        const z = Math.sin(angle) * finalRadius
        const yOsc = Math.sin(angle) * 0.15 * ringProgress + smoothSpec * 0.3 * Math.sin(angle * 2)
        const y = yCenter + yOsc + smoothSpec * 0.15

        positions[bi] = x
        positions[bi + 1] = y
        positions[bi + 2] = z

        const currentColor = currentColorsRef.current[vi]
        if (!currentColor) continue

        currentColor.lerp(vertexTargetColor, colorLerpAmount)

        colors[bi] = currentColor.r
        colors[bi + 1] = currentColor.g
        colors[bi + 2] = currentColor.b
      }
    }

    positionAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    geometryRef.current.computeVertexNormals()

    if (meshRef.current && meshRef.current.rotation) {
      meshRef.current.rotation.y += delta * 0.08
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1
    }

    if (materialRef.current) {
      const emissiveIntensity = 1.0 + beatFlash + (lowFreqEnergy * 0.5 + midFreqEnergy * 0.3)
      materialRef.current.uniforms.uEmissiveIntensity.value = emissiveIntensity
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }

    const elapsed = performance.now() - startTime
    lastUpdateTimeRef.current = elapsed

    if (elapsed > VERTEX_UPDATE_THRESHOLD && segments === DEFAULT_SEGMENTS) {
      slowFrameCountRef.current++
      if (slowFrameCountRef.current > 10) {
        setSegments(REDUCED_SEGMENTS)
        slowFrameCountRef.current = 0
      }
    } else if (elapsed < VERTEX_UPDATE_THRESHOLD - 1 && segments === REDUCED_SEGMENTS) {
      slowFrameCountRef.current--
      if (slowFrameCountRef.current < -30) {
        setSegments(DEFAULT_SEGMENTS)
        slowFrameCountRef.current = 0
      }
    }
  })

  const uniforms = useMemo(() => ({
    uEmissiveIntensity: { value: 1.0 },
    uTime: { value: 0 },
  }), [])

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef as any}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vColor;
          varying vec3 vNormal;
          varying vec3 vPosition;
          uniform float uTime;

          void main() {
            vColor = color;
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          varying vec3 vNormal;
          varying vec3 vPosition;
          uniform float uEmissiveIntensity;
          uniform float uTime;

          void main() {
            vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
            float diff = max(dot(vNormal, lightDir), 0.0);

            vec3 viewDir = normalize(-vec3(0.0, 0.0, 1.0));
            vec3 reflectDir = reflect(-lightDir, vNormal);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

            float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.0);

            vec3 ambient = vColor * 0.2;
            vec3 diffuse = vColor * diff * 0.6;
            vec3 specular = vec3(1.0) * spec * 0.3;
            vec3 emissive = vColor * uEmissiveIntensity;
            vec3 rim = vColor * fresnel * 0.4;

            vec3 finalColor = ambient + diffuse + specular + emissive + rim;

            float alpha = 0.7 + fresnel * 0.3;
            alpha = clamp(alpha, 0.4, 0.95);

            gl_FragColor = vec4(finalColor, alpha);
          }
        `}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
      />
    </mesh>
  )
}
