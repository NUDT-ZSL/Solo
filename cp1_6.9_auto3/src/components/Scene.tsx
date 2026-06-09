import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, DepthOfField } from '@react-three/postprocessing'
import * as THREE from 'three'
import {
  generateCrystals,
  generatePillars,
  generateBurstParticles,
  updateCrystalState,
  updateParticle,
  CrystalData,
  CrystalUpdateState,
  PillarData,
  ParticleData,
} from '@utils/crystalGenerator'
import {
  SceneState,
  getLightColor,
  getPillarColors,
  fadeInOpacity,
  hslToHex,
} from '@utils/colorPalette'

const LIGHT_COLORS_HEX = [0xffd700, 0x4488ff, 0xff66cc, 0x00ffaa]

interface CrystalMeshProps {
  crystal: CrystalData
  sceneStateRef: React.MutableRefObject<SceneState>
  onClickCrystal: (id: number) => void
  fadeInElapsed: React.MutableRefObject<number>
}

function CrystalMesh({ crystal, sceneStateRef, onClickCrystal, fadeInElapsed }: CrystalMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const crystalStateRef = useRef(crystal)

  useEffect(() => {
    crystalStateRef.current = { ...crystal }
  }, [crystal])

  useFrame((_, delta) => {
    if (!meshRef.current || !materialRef.current) return
    const now = performance.now()
    const deltaMs = delta * 1000

    const updates: CrystalUpdateState = updateCrystalState(crystalStateRef.current, sceneStateRef.current, now)

    meshRef.current.rotation.copy(updates.rotation)
    meshRef.current.scale.setScalar(updates.scale)

    const fadeOpacity = fadeInOpacity(fadeInElapsed.current, 1500)
    const glowOpacity = updates.glowOpacity * fadeOpacity

    materialRef.current.color.setHex(updates.color)
    materialRef.current.opacity = 0.55 * fadeOpacity
    materialRef.current.needsUpdate = true

    if (glowRef.current) {
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial
      glowMat.color.setHex(updates.color)
      glowMat.opacity = glowOpacity
      glowRef.current.visible = glowOpacity > 0.001
      glowRef.current.scale.setScalar(updates.scale * 1.3)
    }
  })

  return (
    <group position={crystal.position}>
      <mesh
        ref={meshRef}
        geometry={crystal.geometry}
        onClick={(e) => {
          e.stopPropagation()
          onClickCrystal(crystal.id)
        }}
      >
        <meshPhysicalMaterial
          ref={materialRef}
          color={crystal.color}
          transparent
          opacity={0.55}
          roughness={0.1}
          metalness={0.1}
          transmission={0.6}
          thickness={0.5}
          ior={1.5}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={glowRef} geometry={crystal.geometry} visible={false}>
        <meshBasicMaterial color={crystal.color} transparent opacity={0} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

interface PillarMeshProps {
  pillar: PillarData
  sceneStateRef: React.MutableRefObject<SceneState>
  fadeInElapsed: React.MutableRefObject<number>
}

function PillarMesh({ pillar, sceneStateRef, fadeInElapsed }: PillarMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPillarIndex: { value: pillar.id },
    uColorPhase: { value: pillar.colorPhase },
    uOpacity: { value: 0.5 },
    uHeight: { value: pillar.height },
  }), [pillar.id, pillar.colorPhase, pillar.height])

  const vertexShader = `
    varying vec3 vPosition;
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const fragmentShader = `
    uniform float uTime;
    uniform float uPillarIndex;
    uniform float uColorPhase;
    uniform float uOpacity;
    uniform float uHeight;
    varying vec3 vPosition;

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
      float yNorm = clamp((vPosition.y + uHeight * 0.5) / uHeight, 0.0, 1.0);
      float hueBase = mod(uPillarIndex * 50.0 + uTime * 0.05 + uColorPhase, 360.0);
      float hue = hueBase + yNorm * 60.0;
      vec3 color = hsv2rgb(vec3(hue / 360.0, 0.85, 0.5 + yNorm * 0.2));
      gl_FragColor = vec4(color, uOpacity);
    }
  `

  useFrame((_, delta) => {
    if (!meshRef.current || !materialRef.current) return
    const now = performance.now() / 1000

    const floatY = Math.sin(now * pillar.floatFrequency * Math.PI * 2 + pillar.floatPhase) * pillar.floatAmplitude
    meshRef.current.position.y = pillar.basePosition.y + floatY

    const audioLevel = sceneStateRef.current.audioLevel
    const opacity = (0.3 + audioLevel * 8) * 0.7
    const fadeOpacity = fadeInOpacity(fadeInElapsed.current, 1500)

    materialRef.current.uniforms.uTime.value = now * 1000
    materialRef.current.uniforms.uOpacity.value = Math.min(0.7, Math.max(0.3, opacity)) * fadeOpacity
    materialRef.current.needsUpdate = true
  })

  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(pillar.radius, pillar.radius * 0.7, pillar.height, 24, 1, true)
    geo.translate(0, 0, 0)
    return geo
  }, [pillar.radius, pillar.height])

  return (
    <mesh ref={meshRef} position={pillar.basePosition} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

interface ParticleSystemProps {
  particlesRef: React.MutableRefObject<ParticleData[]>
}

function ParticleSystem({ particlesRef }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const MAX_PARTICLES = 400

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(MAX_PARTICLES * 3)
    const colors = new Float32Array(MAX_PARTICLES * 3)
    const sizes = new Float32Array(MAX_PARTICLES)
    const opacities = new Float32Array(MAX_PARTICLES)

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1))

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 120.0 * uPixelRatio / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d) * vOpacity;
          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    return { geometry: geo, material: mat }
  }, [])

  useFrame((_, delta) => {
    if (!pointsRef.current) return
    const deltaMs = delta * 1000

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute
    const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute
    const opacityAttr = geometry.getAttribute('opacity') as THREE.BufferAttribute

    const posArray = posAttr.array as Float32Array
    const colorArray = colorAttr.array as Float32Array
    const sizeArray = sizeAttr.array as Float32Array
    const opacityArray = opacityAttr.array as Float32Array

    const aliveParticles: ParticleData[] = []

    for (let i = 0; i < particlesRef.current.length; i++) {
      const result = updateParticle(particlesRef.current[i], deltaMs)
      if (result.alive) {
        aliveParticles.push(result.particle)
      }
    }
    particlesRef.current = aliveParticles

    const count = Math.min(aliveParticles.length, MAX_PARTICLES)

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i < count) {
        const p = aliveParticles[i]
        posArray[i * 3] = p.position.x
        posArray[i * 3 + 1] = p.position.y
        posArray[i * 3 + 2] = p.position.z

        const r = ((p.color >> 16) & 255) / 255
        const g = ((p.color >> 8) & 255) / 255
        const b = (p.color & 255) / 255
        colorArray[i * 3] = r
        colorArray[i * 3 + 1] = g
        colorArray[i * 3 + 2] = b

        sizeArray[i] = p.size
        opacityArray[i] = p.life / p.maxLife
      } else {
        sizeArray[i] = 0
        opacityArray[i] = 0
      }
    }

    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    opacityAttr.needsUpdate = true
    geometry.setDrawRange(0, count)
  })

  return <points ref={pointsRef} geometry={geometry} material={material} />
}

function SceneLights({ sceneStateRef }: { sceneStateRef: React.MutableRefObject<SceneState> }) {
  const lightsRef = useRef<THREE.PointLight[]>([])

  useFrame(() => {
    const now = performance.now() / 1000
    const t = now * 0.08

    for (let i = 0; i < lightsRef.current.length; i++) {
      const light = lightsRef.current[i]
      if (!light) continue

      const angle = t + (i / 4) * Math.PI * 2
      const radius = 12
      light.position.set(
        Math.cos(angle) * radius,
        6 * Math.sin(angle * 0.7 + i) + 4,
        Math.sin(angle) * radius
      )

      const lightColor = getLightColor(sceneStateRef.current, i)
      const hslMatch = lightColor.match(/hsl\(([^,]+),\s*([^,]+),\s*([^)]+)\)/)
      if (hslMatch) {
        const h = parseFloat(hslMatch[1])
        const s = parseFloat(hslMatch[2]) / 100
        const l = parseFloat(hslMatch[3]) / 100
        const hex = hslToHex(h, s, l)
        light.color.setHex(hex)
      }
    }
  })

  return (
    <>
      <ambientLight intensity={0.15} color={0x8899cc} />
      {LIGHT_COLORS_HEX.map((color, i) => (
        <pointLight
          key={i}
          ref={(el) => { if (el) lightsRef.current[i] = el }}
          color={color}
          intensity={2.5}
          distance={50}
          decay={2}
        />
      ))}
    </>
  )
}

interface CameraControllerProps {
  sceneStateRef: React.MutableRefObject<SceneState>
}

function CameraController({ sceneStateRef }: CameraControllerProps) {
  const { camera, gl } = useThree()
  const stateRef = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    theta: Math.PI * 0.25,
    phi: Math.PI * 0.45,
    distance: 22,
  })

  useEffect(() => {
    const dom = gl.domElement

    const onPointerDown = (e: PointerEvent) => {
      stateRef.current.isDragging = true
      stateRef.current.lastX = e.clientX
      stateRef.current.lastY = e.clientY
      dom.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!stateRef.current.isDragging) return
      const dx = e.clientX - stateRef.current.lastX
      const dy = e.clientY - stateRef.current.lastY

      stateRef.current.theta -= dx * 0.005
      stateRef.current.phi -= dy * 0.005

      const minPhi = Math.PI * (60 / 180)
      const maxPhi = Math.PI * (120 / 180)
      stateRef.current.phi = Math.max(minPhi, Math.min(maxPhi, stateRef.current.phi))

      stateRef.current.lastX = e.clientX
      stateRef.current.lastY = e.clientY
    }

    const onPointerUp = (e: PointerEvent) => {
      stateRef.current.isDragging = false
      dom.releasePointerCapture(e.pointerId)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      stateRef.current.distance += e.deltaY * 0.015
      stateRef.current.distance = Math.max(5, Math.min(30, stateRef.current.distance))
    }

    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('pointercancel', onPointerUp)
    dom.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('pointerup', onPointerUp)
      dom.removeEventListener('pointercancel', onPointerUp)
      dom.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  useFrame(() => {
    const { theta, phi, distance } = stateRef.current

    const x = distance * Math.sin(phi) * Math.cos(theta)
    const y = distance * Math.cos(phi)
    const z = distance * Math.sin(phi) * Math.sin(theta)

    camera.position.lerp(new THREE.Vector3(x, y, z), 0.08)
    camera.lookAt(0, 0, 0)

    sceneStateRef.current.cameraDistance = distance
  })

  return null
}

interface SceneContentProps {
  sceneStateRef: React.MutableRefObject<SceneState>
  fadeInElapsed: React.MutableRefObject<number>
  crystals: CrystalData[]
  pillars: PillarData[]
  particlesRef: React.MutableRefObject<ParticleData[]>
  onClickCrystal: (id: number) => void
}

function SceneContent({
  sceneStateRef,
  fadeInElapsed,
  crystals,
  pillars,
  particlesRef,
  onClickCrystal,
}: SceneContentProps) {
  useFrame((_, delta) => {
    sceneStateRef.current.time = performance.now()
    fadeInElapsed.current += delta * 1000
  })

  return (
    <>
      <CameraController sceneStateRef={sceneStateRef} />
      <SceneLights sceneStateRef={sceneStateRef} />

      {pillars.map((pillar) => (
        <PillarMesh
          key={`pillar-${pillar.id}`}
          pillar={pillar}
          sceneStateRef={sceneStateRef}
          fadeInElapsed={fadeInElapsed}
        />
      ))}

      {crystals.map((crystal) => (
        <CrystalMesh
          key={`crystal-${crystal.id}`}
          crystal={crystal}
          sceneStateRef={sceneStateRef}
          onClickCrystal={onClickCrystal}
          fadeInElapsed={fadeInElapsed}
        />
      ))}

      <ParticleSystem particlesRef={particlesRef} />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <DepthOfField
          focusDistance={0.015}
          focalLength={0.04}
          bokehScale={3.5}
        />
      </EffectComposer>
    </>
  )
}

function useWebAudio(sceneStateRef: React.MutableRefObject<SceneState>) {
  const audioRef = useRef<{
    ctx: AudioContext | null
    osc: OscillatorNode | null
    gain: GainNode | null
    analyser: AnalyserNode | null
    started: boolean
  }>({ ctx: null, osc: null, gain: null, analyser: null, started: false })

  const initAudio = useCallback(() => {
    if (audioRef.current.started) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()

      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 80

      const gain = ctx.createGain()
      gain.gain.value = 0

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256

      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.3
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 0.025
      lfo.connect(lfoGain)
      lfoGain.connect(gain.gain)

      osc.connect(gain)
      gain.connect(analyser)
      analyser.connect(ctx.destination)

      osc.start()
      lfo.start()
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2)

      audioRef.current = { ctx, osc, gain, analyser, started: true }

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const updateAudio = () => {
        if (!audioRef.current.analyser) return
        audioRef.current.analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < 10; i++) sum += dataArray[i]
        const avg = sum / 10 / 255
        sceneStateRef.current.audioLevel = 0.025 + avg * 0.025
        requestAnimationFrame(updateAudio)
      }
      updateAudio()
    } catch (e) {
      console.warn('Web Audio unavailable:', e)
      sceneStateRef.current.audioLevel = 0.03
    }
  }, [sceneStateRef])

  return { initAudio, audioRef }
}

export default function Scene() {
  const sceneStateRef = useRef<SceneState>({
    time: performance.now(),
    audioLevel: 0.03,
    cameraDistance: 22,
  })

  const fadeInElapsed = useRef(0)
  const particlesRef = useRef<ParticleData[]>([])
  const crystalsRef = useRef<CrystalData[]>([])

  const { initAudio } = useWebAudio(sceneStateRef)

  const crystals = useMemo(() => {
    const state = sceneStateRef.current
    const count = 120 + Math.floor(Math.random() * 31)
    const c = generateCrystals(state, count)
    crystalsRef.current = c
    return c
  }, [])

  const pillars = useMemo(() => {
    const count = 5 + Math.floor(Math.random() * 4)
    return generatePillars(count)
  }, [])

  const onClickCrystal = useCallback((id: number) => {
    initAudio()
    const now = performance.now()
    const crystal = crystalsRef.current.find(c => c.id === id)
    if (!crystal) return

    crystal.isFlashing = true
    crystal.flashStartTime = now
    crystal.isExpanded = true
    crystal.expandStartTime = now

    const newParticles = generateBurstParticles(crystal, 20 + Math.floor(Math.random() * 11))
    particlesRef.current = [...particlesRef.current, ...newParticles]

    for (const other of crystalsRef.current) {
      if (other.id === id) continue
      const dist = crystal.position.distanceTo(other.position)
      if (dist < 2) {
        other.hasGlow = true
        other.glowStartTime = now
      }
    }
  }, [initAudio])

  return (
    <Canvas
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      camera={{ fov: 60, near: 0.1, far: 200, position: [0, 8, 22] }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      onPointerDown={initAudio}
    >
      <fog attach="fog" args={['#0a0a1a', 15, 45]} />
      <SceneContent
        sceneStateRef={sceneStateRef}
        fadeInElapsed={fadeInElapsed}
        crystals={crystals}
        pillars={pillars}
        particlesRef={particlesRef}
        onClickCrystal={onClickCrystal}
      />
    </Canvas>
  )
}
