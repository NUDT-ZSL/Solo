import { useRef, useMemo, useEffect, useCallback, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { LightMode } from '../App'

const TOTAL_PARTICLES = 5000
const MAX_DEBRIS = 300
const PRISM_POS = new THREE.Vector3(0, 0, 0)
const PRISM_SIZE = 2.5
const LIGHT_BEAM_WIDTH = 2
const GRAVITY = -0.3

interface ParticleData {
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  baseColor: THREE.Color
  wavelength: number
  size: number
  opacity: number
  age: number
  life: number
  phase: 'beam' | 'spectrum' | 'collecting' | 'inGlow' | 'dead'
  targetPos: THREE.Vector3 | null
  collectProgress: number
  repulseTimer: number
  repulseDir: THREE.Vector3
}

interface DebrisData {
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  size: number
  opacity: number
  age: number
  life: number
}

const hueToRgb = (hue: number): THREE.Color => {
  const c = new THREE.Color()
  c.setHSL(hue / 360, 1, 0.5)
  return c
}

const getSpectrumColor = (index: number, total: number): THREE.Color => {
  const hueStart = 0
  const hueEnd = 280
  const t = index / (total - 1)
  const hue = hueStart + (hueEnd - hueStart) * t
  return hueToRgb(hue)
}

const getWavelengthCurvature = (index: number, total: number): number => {
  const t = index / (total - 1)
  return 0.3 + t * 1.2
}

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

interface SceneProps {
  lightMode: LightMode
  bloomEnabled: boolean
  onFpsUpdate: (fps: number) => void
  onParticleCount: (count: number) => void
}

function PrismMesh() {
  const meshRef = useRef<THREE.Mesh>(null)
  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(PRISM_SIZE * 0.7, PRISM_SIZE * 0.7, PRISM_SIZE * 2.2, 3, 1)
    geo.rotateZ(Math.PI / 2)
    return geo
  }, [])

  return (
    <mesh ref={meshRef} position={PRISM_POS.toArray()} castShadow receiveShadow>
      <primitive object={geometry} attach="geometry" />
      <meshPhysicalMaterial
        color="#E8F4FF"
        transparent
        opacity={0.3}
        roughness={0.05}
        metalness={0.1}
        transmission={0.9}
        thickness={0.8}
        ior={1.5}
        clearcoat={1}
        clearcoatRoughness={0.1}
        envMapIntensity={1}
      />
    </mesh>
  )
}

interface ParticleSystemProps {
  lightMode: LightMode
  onFpsUpdate: (fps: number) => void
  onParticleCount: (count: number) => void
}

function ParticleSystem({ lightMode, onFpsUpdate, onParticleCount }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const glowPointsRef = useRef<THREE.Points>(null)
  const debrisPointsRef = useRef<THREE.Points>(null)
  const glowSpriteRef = useRef<THREE.SpriteMaterial | null>(null)
  const { camera, gl } = useThree()

  const [clickPoint, setClickPoint] = useState<THREE.Vector3 | null>(null)
  const clickTimeRef = useRef<number>(0)
  const glowSphereRef = useRef<{ pos: THREE.Vector3; age: number; life: number; active: boolean }>({
    pos: new THREE.Vector3(),
    age: 0,
    life: 0.5,
    active: false,
  })

  const particles = useRef<ParticleData[]>([])
  const debris = useRef<DebrisData[]>([])

  const { geometry, glowGeometry, debrisGeometry, spriteTexture } = useMemo(() => {
    const positions = new Float32Array(TOTAL_PARTICLES * 3)
    const colors = new Float32Array(TOTAL_PARTICLES * 3)
    const sizes = new Float32Array(TOTAL_PARTICLES)
    const opacities = new Float32Array(TOTAL_PARTICLES)

    const glowPositions = new Float32Array(TOTAL_PARTICLES * 3)
    const glowColors = new Float32Array(TOTAL_PARTICLES * 3)
    const glowSizes = new Float32Array(TOTAL_PARTICLES)
    const glowOpacities = new Float32Array(TOTAL_PARTICLES)

    const debrisPositions = new Float32Array(MAX_DEBRIS * 3)
    const debrisColors = new Float32Array(MAX_DEBRIS * 3)
    const debrisSizes = new Float32Array(MAX_DEBRIS)
    const debrisOpacities = new Float32Array(MAX_DEBRIS)

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const beamAngle = Math.atan2(1.2, 4)
      const startX = -6
      const startY = 1.2
      const startZ = 0

      const offsetY = (Math.random() - 0.5) * LIGHT_BEAM_WIDTH
      const offsetZ = (Math.random() - 0.5) * LIGHT_BEAM_WIDTH
      const spawnDelay = Math.random() * 2.0

      const spectrumIndex = i
      const specColor = getSpectrumColor(spectrumIndex, TOTAL_PARTICLES)
      let particleColor: THREE.Color
      if (lightMode === 'white') {
        particleColor = new THREE.Color(0xffffff)
      } else if (lightMode === 'colorful') {
        particleColor = specColor.clone()
      } else {
        particleColor = new THREE.Color(0xffffff).lerp(specColor, 0.3)
      }

      const baseSpeed = 2.5 + Math.random() * 0.5
      const vx = Math.cos(beamAngle) * baseSpeed
      const vy = Math.sin(beamAngle) * baseSpeed * 0.3
      const vz = (Math.random() - 0.5) * 0.3

      const curvature = getWavelengthCurvature(spectrumIndex, TOTAL_PARTICLES)

      positions[i * 3] = startX - vx * spawnDelay
      positions[i * 3 + 1] = startY + offsetY + vy * spawnDelay
      positions[i * 3 + 2] = startZ + offsetZ + vz * spawnDelay

      colors[i * 3] = particleColor.r
      colors[i * 3 + 1] = particleColor.g
      colors[i * 3 + 2] = particleColor.b

      sizes[i] = 3.0
      opacities[i] = 1.0

      glowPositions[i * 3] = positions[i * 3]
      glowPositions[i * 3 + 1] = positions[i * 3 + 1]
      glowPositions[i * 3 + 2] = positions[i * 3 + 2]
      glowColors[i * 3] = particleColor.r
      glowColors[i * 3 + 1] = particleColor.g
      glowColors[i * 3 + 2] = particleColor.b
      glowSizes[i] = 9.0
      glowOpacities[i] = 0.3

      particles.current.push({
        position: new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]),
        velocity: new THREE.Vector3(vx, vy + (Math.random() - 0.5) * 0.2, vz),
        color: particleColor.clone(),
        baseColor: specColor.clone(),
        wavelength: curvature,
        size: 3.0,
        opacity: 1.0,
        age: spawnDelay * -1,
        life: 6.0,
        phase: 'beam',
        targetPos: null,
        collectProgress: 0,
        repulseTimer: 0,
        repulseDir: new THREE.Vector3(),
      })
    }

    for (let i = 0; i < MAX_DEBRIS; i++) {
      debrisSizes[i] = 0
      debrisOpacities[i] = 0
      debris.current.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        size: 0,
        opacity: 0,
        age: 0,
        life: 1.5,
      })
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const sizeAttr = new THREE.BufferAttribute(sizes, 1)
    sizeAttr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('size', sizeAttr)
    const opacityAttr = new THREE.BufferAttribute(opacities, 1)
    opacityAttr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('opacity', opacityAttr)

    const gGeo = new THREE.BufferGeometry()
    gGeo.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3))
    gGeo.setAttribute('color', new THREE.BufferAttribute(glowColors, 3))
    const gSizeAttr = new THREE.BufferAttribute(glowSizes, 1)
    gSizeAttr.setUsage(THREE.DynamicDrawUsage)
    gGeo.setAttribute('size', gSizeAttr)
    const gOpacityAttr = new THREE.BufferAttribute(glowOpacities, 1)
    gOpacityAttr.setUsage(THREE.DynamicDrawUsage)
    gGeo.setAttribute('opacity', gOpacityAttr)

    const dGeo = new THREE.BufferGeometry()
    dGeo.setAttribute('position', new THREE.BufferAttribute(debrisPositions, 3))
    dGeo.setAttribute('color', new THREE.BufferAttribute(debrisColors, 3))
    const dSizeAttr = new THREE.BufferAttribute(debrisSizes, 1)
    dSizeAttr.setUsage(THREE.DynamicDrawUsage)
    dGeo.setAttribute('size', dSizeAttr)
    const dOpacityAttr = new THREE.BufferAttribute(debrisOpacities, 1)
    dOpacityAttr.setUsage(THREE.DynamicDrawUsage)
    dGeo.setAttribute('opacity', dOpacityAttr)

    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.7)')
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true

    return { geometry: geo, glowGeometry: gGeo, debrisGeometry: dGeo, spriteTexture: tex }
  }, [lightMode])

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation()
    const point = e.point.clone()
    setClickPoint(point)
    clickTimeRef.current = performance.now()

    const radius = 2.5
    for (let i = 0; i < particles.current.length; i++) {
      const p = particles.current[i]
      if (p.phase === 'dead') continue
      const dist = p.position.distanceTo(point)
      if (dist < radius) {
        p.phase = 'collecting'
        p.targetPos = point.clone()
        p.collectProgress = 0
      }
    }
  }, [])

  let frameCount = 0
  let fpsTimer = performance.now()

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute
    const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute
    const opacityAttr = geometry.getAttribute('opacity') as THREE.BufferAttribute

    const gPosAttr = glowGeometry.getAttribute('position') as THREE.BufferAttribute
    const gColorAttr = glowGeometry.getAttribute('color') as THREE.BufferAttribute
    const gSizeAttr = glowGeometry.getAttribute('size') as THREE.BufferAttribute
    const gOpacityAttr = glowGeometry.getAttribute('opacity') as THREE.BufferAttribute

    const dPosAttr = debrisGeometry.getAttribute('position') as THREE.BufferAttribute
    const dColorAttr = debrisGeometry.getAttribute('color') as THREE.BufferAttribute
    const dSizeAttr = debrisGeometry.getAttribute('size') as THREE.BufferAttribute
    const dOpacityAttr = debrisGeometry.getAttribute('opacity') as THREE.BufferAttribute

    const prismExitX = PRISM_POS.x + PRISM_SIZE * 0.8
    const activeParticleCount = particles.current.filter(p => p.phase !== 'dead').length

    for (let i = 0; i < particles.current.length; i++) {
      const p = particles.current[i]
      p.age += dt

      if (p.repulseTimer > 0) {
        p.repulseTimer -= dt
        p.position.addScaledVector(p.repulseDir, dt * 8)
      }

      if (p.phase === 'beam') {
        p.position.addScaledVector(p.velocity, dt)
        if (p.position.x > prismExitX - 0.5) {
          p.phase = 'spectrum'
          const curvature = p.wavelength
          const horizontalSpeed = 2.0 + Math.random() * 1.5
          const verticalSpeed = (Math.random() - 0.5) * 1.0
          const bendAngle = curvature * 0.5
          p.velocity.set(
            horizontalSpeed * Math.cos(bendAngle * 0.2),
            -bendAngle * 0.8 + verticalSpeed,
            p.velocity.z + (Math.random() - 0.5) * 0.2
          )
          p.color.copy(p.baseColor)
        }
      } else if (p.phase === 'spectrum') {
        p.velocity.y += GRAVITY * p.wavelength * dt
        p.position.addScaledVector(p.velocity, dt)

        const fadeStart = 0
        const fadeDuration = 3
        if (p.age > fadeStart) {
          const fadeT = Math.min((p.age - fadeStart) / fadeDuration, 1)
          p.size = 3.0 * (1 - fadeT) + 0.5 * fadeT
          p.opacity = 1.0 * (1 - fadeT) + 0.2 * fadeT
        }

        if (p.age > p.life || p.position.x > 15 || p.position.y < -8) {
          const beamAngle = Math.atan2(1.2, 4)
          const startX = -6
          const startY = 1.2
          const startZ = 0
          const offsetY = (Math.random() - 0.5) * LIGHT_BEAM_WIDTH
          const offsetZ = (Math.random() - 0.5) * LIGHT_BEAM_WIDTH
          const baseSpeed = 2.5 + Math.random() * 0.5
          p.position.set(startX, startY + offsetY, startZ + offsetZ)
          p.velocity.set(
            Math.cos(beamAngle) * baseSpeed,
            Math.sin(beamAngle) * baseSpeed * 0.3,
            (Math.random() - 0.5) * 0.3
          )
          p.age = 0
          p.phase = 'beam'
          p.size = 3.0
          p.opacity = 1.0
          if (lightMode === 'white') {
            p.color.set(0xffffff)
          } else if (lightMode === 'gradient') {
            p.color.set(0xffffff).lerp(p.baseColor, 0.3)
          } else {
            p.color.copy(p.baseColor)
          }
        }
      } else if (p.phase === 'collecting' && p.targetPos) {
        p.collectProgress += dt / 0.8
        const t = easeInOutCubic(Math.min(p.collectProgress, 1))
        const startPos = (p as any)._startPos
        if (!startPos) {
          (p as any)._startPos = p.position.clone()
          continue
        }
        p.position.lerpVectors(startPos, p.targetPos, t)
        p.size = 3.0 * (1 + t * 1.5)
        p.opacity = 1.0

        if (p.collectProgress >= 1) {
          p.phase = 'inGlow'
          if (!glowSphereRef.current.active) {
            glowSphereRef.current.active = true
            glowSphereRef.current.pos.copy(p.targetPos!)
            glowSphereRef.current.age = 0
          }
        }
      } else if (p.phase === 'inGlow') {
        if (!glowSphereRef.current.active) {
          for (let j = 0; j < 3; j++) {
            const debrisIdx = debris.current.findIndex(d => d.age >= d.life)
            if (debrisIdx >= 0) {
              const d = debris.current[debrisIdx]
              const dir = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
              ).normalize()
              const speed = 4.0 + Math.random() * 2.0
              d.position.copy(p.position)
              d.velocity.copy(dir).multiplyScalar(speed)
              d.color.copy(p.baseColor)
              d.size = 2.5
              d.opacity = 1
              d.age = 0
              d.life = 1.5
            }
          }
          p.phase = 'dead'
          setTimeout(() => {
            const beamAngle = Math.atan2(1.2, 4)
            const baseSpeed = 2.5 + Math.random() * 0.5
            const offsetY = (Math.random() - 0.5) * LIGHT_BEAM_WIDTH
            const offsetZ = (Math.random() - 0.5) * LIGHT_BEAM_WIDTH
            p.position.set(-6, 1.2 + offsetY, offsetZ)
            p.velocity.set(
              Math.cos(beamAngle) * baseSpeed,
              Math.sin(beamAngle) * baseSpeed * 0.3,
              (Math.random() - 0.5) * 0.3
            )
            p.age = 0
            p.phase = 'beam'
            p.size = 3.0
            p.opacity = 1.0
            ;(p as any)._startPos = null
            if (lightMode === 'white') {
              p.color.set(0xffffff)
            } else if (lightMode === 'gradient') {
              p.color.set(0xffffff).lerp(p.baseColor, 0.3)
            } else {
              p.color.copy(p.baseColor)
            }
          }, 1500 + Math.random() * 500)
        }
      }

      if (p.phase !== 'dead') {
        posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z)
        colorAttr.setXYZ(i, p.color.r, p.color.g, p.color.b)
        sizeAttr.setX(i, p.size)
        opacityAttr.setX(i, p.opacity)

        gPosAttr.setXYZ(i, p.position.x, p.position.y, p.position.z)
        gColorAttr.setXYZ(i, p.color.r, p.color.g, p.color.b)
        gSizeAttr.setX(i, p.size * 3)
        gOpacityAttr.setX(i, p.opacity * 0.3)
      } else {
        sizeAttr.setX(i, 0)
        opacityAttr.setX(i, 0)
        gSizeAttr.setX(i, 0)
        gOpacityAttr.setX(i, 0)
      }
    }

    if (glowSphereRef.current.active) {
      glowSphereRef.current.age += dt
      if (glowSphereRef.current.age >= glowSphereRef.current.life) {
        glowSphereRef.current.active = false
      }
    }

    for (let i = 0; i < particles.current.length; i++) {
      const p1 = particles.current[i]
      if (p1.phase === 'dead' || p1.phase === 'collecting' || p1.phase === 'inGlow') continue
      for (let j = i + 1; j < i + 20 && j < particles.current.length; j++) {
        const p2 = particles.current[j]
        if (p2.phase === 'dead' || p2.phase === 'collecting' || p2.phase === 'inGlow') continue
        const dx = p1.position.x - p2.position.x
        const dy = p1.position.y - p2.position.y
        const dz = p1.position.z - p2.position.z
        const distSq = dx * dx + dy * dy + dz * dz
        if (distSq < 0.01 && distSq > 0) {
          const dist = Math.sqrt(distSq)
          const nx = dx / dist
          const ny = dy / dist
          const nz = dz / dist
          p1.repulseTimer = 0.2
          p1.repulseDir.set(nx, ny, nz)
          p2.repulseTimer = 0.2
          p2.repulseDir.set(-nx, -ny, -nz)
        }
      }
    }

    for (let i = 0; i < debris.current.length; i++) {
      const d = debris.current[i]
      d.age += dt
      if (d.age < d.life && d.size > 0) {
        d.velocity.y += GRAVITY * 0.3 * dt
        d.position.addScaledVector(d.velocity, dt)
        const fadeT = d.age / d.life
        d.size = 2.5 * (1 - fadeT)
        d.opacity = 1 - fadeT

        dPosAttr.setXYZ(i, d.position.x, d.position.y, d.position.z)
        dColorAttr.setXYZ(i, d.color.r, d.color.g, d.color.b)
        dSizeAttr.setX(i, d.size)
        dOpacityAttr.setX(i, d.opacity)
      } else {
        dSizeAttr.setX(i, 0)
        dOpacityAttr.setX(i, 0)
      }
    }

    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    opacityAttr.needsUpdate = true
    gPosAttr.needsUpdate = true
    gColorAttr.needsUpdate = true
    gSizeAttr.needsUpdate = true
    gOpacityAttr.needsUpdate = true
    dPosAttr.needsUpdate = true
    dColorAttr.needsUpdate = true
    dSizeAttr.needsUpdate = true
    dOpacityAttr.needsUpdate = true

    frameCount++
    const now = performance.now()
    if (now - fpsTimer >= 500) {
      const fps = Math.round((frameCount * 1000) / (now - fpsTimer))
      onFpsUpdate(fps)
      onParticleCount(activeParticleCount + debris.current.filter(d => d.age < d.life).length)
      frameCount = 0
      fpsTimer = now
    }
  })

  const pointsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: spriteTexture },
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          gl_FragColor = vec4(vColor, vOpacity) * texColor;
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    })
  }, [spriteTexture])

  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: spriteTexture },
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          gl_FragColor = vec4(vColor, vOpacity) * texColor;
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    })
  }, [spriteTexture])

  return (
    <group onPointerDown={handlePointerDown}>
      <points ref={glowPointsRef} geometry={glowGeometry} material={glowMaterial} />
      <points ref={pointsRef} geometry={geometry} material={pointsMaterial} />
      <points ref={debrisPointsRef} geometry={debrisGeometry} material={pointsMaterial} />
      {glowSphereRef.current.active && (
        <mesh position={glowSphereRef.current.pos.toArray()}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={Math.sin((glowSphereRef.current.age / glowSphereRef.current.life) * Math.PI) * 0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}

function SceneContent({ lightMode, bloomEnabled, onFpsUpdate, onParticleCount }: SceneProps) {
  const { scene } = useThree()

  useEffect(() => {
    scene.fog = new THREE.Fog(0x0A0A1A, 5, 30)
    scene.background = new THREE.Color(0x0A0A1A)
  }, [scene])

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 5, 5]} intensity={0.4} color="#C0D9FF" />
      <pointLight position={[-5, 2, 0]} intensity={1} color="#FFFFFF" distance={10} />
      <pointLight position={[5, -2, 2]} intensity={0.5} color="#80B0FF" distance={12} />
      <PrismMesh />
      <ParticleSystem
        lightMode={lightMode}
        onFpsUpdate={onFpsUpdate}
        onParticleCount={onParticleCount}
      />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={4}
        maxDistance={20}
        autoRotate={false}
        target={[0, 0, 0]}
      />
      {bloomEnabled && (
        <EffectComposer>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
            radius={0.1}
          />
        </EffectComposer>
      )}
    </>
  )
}

export default function PrismScene(props: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 1, 8], fov: 60, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent {...props} />
    </Canvas>
  )
}
