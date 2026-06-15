import React, { useRef, useMemo, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import type { Particle, Galaxy } from '../../constants'
import { hexToRgbNorm } from '../../constants'
import { useAppStore } from '@/store/useAppStore'

const PARTICLE_SIZE = 0.08
const BG_STAR_COUNT = 200
const BG_STAR_RADIUS = 50

interface ParticleSystemProps {
  galaxies: Galaxy[]
  totalParticles: number
}

function ParticleRenderer({ galaxies, totalParticles }: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const trailRef = useRef<THREE.Points>(null)
  const glowRefs = useRef<(THREE.Sprite | null)[]>([])
  const placementAnimRef = useRef<Record<string, { start: number; position: [number, number, number] }>>({})
  const prevGalaxyIdsRef = useRef<Set<string>>(new Set())
  const trailPositionsRef = useRef<Float32Array>(new Float32Array(0))
  const trailColorsRef = useRef<Float32Array>(new Float32Array(0))

  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)')
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.2)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 32, 32)
    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }, [])

  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(100,150,255,0.15)')
    gradient.addColorStop(0.4, 'rgba(100,150,255,0.05)')
    gradient.addColorStop(1, 'rgba(100,150,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const maxParticles = 5000
    const positions = new Float32Array(maxParticles * 3)
    const colors = new Float32Array(maxParticles * 3)
    const sizes = new Float32Array(maxParticles)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setDrawRange(0, 0)
    return geo
  }, [])

  const trailGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const maxTrails = 15000
    const positions = new Float32Array(maxTrails * 3)
    const colors = new Float32Array(maxTrails * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setDrawRange(0, 0)
    return geo
  }, [])

  const updateParticles = useCallback((particles: Particle[], galaxyRotations: Record<string, number>) => {
    if (!pointsRef.current) return
    const posAttr = geometry.attributes.position as THREE.BufferAttribute
    const colAttr = geometry.attributes.color as THREE.BufferAttribute
    const sizeAttr = geometry.attributes.size as THREE.BufferAttribute

    let idx = 0
    const trailMaxOpacity = totalParticles > 3000 ? 0.2 : 0.8

    for (const p of particles) {
      if (idx >= 5000) break
      posAttr.setXYZ(idx, p.position[0], p.position[1], p.position[2])
      colAttr.setXYZ(idx, p.color[0], p.color[1], p.color[2])
      sizeAttr.setX(idx, PARTICLE_SIZE)
      idx++
    }

    geometry.setDrawRange(0, idx)
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    sizeAttr.needsUpdate = true

    if (trailRef.current && idx > 0) {
      const trailPos = trailGeometry.attributes.position as THREE.BufferAttribute
      const trailCol = trailGeometry.attributes.color as THREE.BufferAttribute
      let tIdx = 0
      const trailLen = 2
      const step = Math.max(1, Math.floor(idx / 750))

      for (let i = 0; i < idx && tIdx < 15000; i += step) {
        const px = posAttr.getX(i)
        const py = posAttr.getY(i)
        const pz = posAttr.getZ(i)
        const vx = 0
        const vy = 0
        const vz = 0
        const cr = colAttr.getX(i)
        const cg = colAttr.getY(i)
        const cb = colAttr.getZ(i)

        for (let t = 0; t < trailLen && tIdx < 15000; t++) {
          const frac = t / trailLen
          const alpha = trailMaxOpacity * (1 - frac)
          trailPos.setXYZ(tIdx, px - vx * frac * 0.5, py - vy * frac * 0.5, pz - vz * frac * 0.5)
          trailCol.setXYZ(tIdx, cr * alpha, cg * alpha, cb * alpha)
          tIdx++
        }
      }

      trailGeometry.setDrawRange(0, tIdx)
      trailPos.needsUpdate = true
      trailCol.needsUpdate = true
    }
  }, [geometry, trailGeometry, totalParticles])

  useFrame(() => {
    for (const galaxy of galaxies) {
      if (!prevGalaxyIdsRef.current.has(galaxy.id)) {
        placementAnimRef.current[galaxy.id] = {
          start: Date.now(),
          position: galaxy.position,
        }
      }
    }
    prevGalaxyIdsRef.current = new Set(galaxies.map(g => g.id))
  })

  useEffect(() => {
    const allParticles: Particle[] = []
    const rotations: Record<string, number> = {}
    for (const g of galaxies) {
      allParticles.push(...g.particles)
      rotations[g.id] = 0
    }
    updateParticles(allParticles, rotations)
  }, [galaxies, updateParticles])

  return (
    <>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          map={particleTexture}
          size={PARTICLE_SIZE}
          vertexColors
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      <points ref={trailRef} geometry={trailGeometry}>
        <pointsMaterial
          size={0.04}
          vertexColors
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      {galaxies.map((galaxy, i) => {
        const [c1Hex] = galaxy.colorRange
        const c1 = hexToRgbNorm(c1Hex)
        return (
          <sprite
            key={`glow-${galaxy.id}`}
            ref={(el) => { glowRefs.current[i] = el }}
            position={galaxy.position}
            scale={[4, 4, 1]}
          >
            <spriteMaterial
              map={glowTexture}
              transparent
              opacity={0.3}
              color={new THREE.Color(c1[0], c1[1], c1[2])}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        )
      })}
    </>
  )
}

function ClickHandler() {
  const { camera, raycaster } = useThree()
  const placementMode = useAppStore(s => s.placementMode)
  const addGalaxy = useAppStore(s => s.addGalaxy)
  const setPlacementMode = useAppStore(s => s.setPlacementMode)

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (!placementMode) return

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const point = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, point)

    if (point) {
      addGalaxy(placementMode, [point.x, 0, point.z], 1.0)
      setPlacementMode(null)
    }
  }, [placementMode, addGalaxy, setPlacementMode, raycaster])

  return (
    <mesh
      visible={false}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onPointerDown={handleClick}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

type ThreeEvent<T> = import('@react-three/fiber').ThreeEvent<T>

function BackgroundStars() {
  const positions = useMemo(() => {
    const pos = new Float32Array(BG_STAR_COUNT * 3)
    for (let i = 0; i < BG_STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = BG_STAR_RADIUS * (0.5 + Math.random() * 0.5)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={BG_STAR_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function SpaceBackground() {
  return (
    <>
      <color attach="background" args={['#000011']} />
      <fog attach="fog" args={['#000011', 30, 80]} />
    </>
  )
}

export interface SceneManagerProps {
  particles: Particle[]
  galaxyRotations: Record<string, number>
}

export function SceneManager({ particles, galaxyRotations }: SceneManagerProps) {
  const galaxies = useAppStore(s => s.galaxies)
  const totalParticles = useAppStore(s => s.totalParticles)
  const mergedGalaxies = useMemo(() => {
    return galaxies.map(g => ({
      ...g,
      particles: particles.filter(p =>
        p.position[0] >= g.position[0] - 5 &&
        p.position[0] <= g.position[0] + 5 &&
        p.position[2] >= g.position[2] - 5 &&
        p.position[2] <= g.position[2] + 5
      ).slice(0, g.particleCount),
    }))
  }, [galaxies, particles])

  return (
    <Canvas
      camera={{ position: [0, 8, 12], fov: 60, near: 0.1, far: 200 }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    >
      <SpaceBackground />
      <ambientLight intensity={0.1} />
      <ParticleRenderer galaxies={galaxies} totalParticles={totalParticles} />
      <BackgroundStars />
      <ClickHandler />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={60}
        enablePan
        panSpeed={0.5}
        rotateSpeed={0.5}
      />
    </Canvas>
  )
}
