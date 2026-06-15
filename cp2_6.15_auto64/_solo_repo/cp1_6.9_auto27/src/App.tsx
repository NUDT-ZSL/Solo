import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Stars, Grid, Line } from '@react-three/drei'
import * as THREE from 'three'
import Tower from './components/Tower'
import type {
  CubeInstance,
  GrowthMode,
  ManualCube,
  Particle,
  RippleEffect,
  TowerConfig,
} from './types'
import {
  GOLDEN_SCALE,
  MANUAL_CUBE_COLORS,
  bounceInterpolation,
  clamp,
  deg2rad,
  easeInOutQuad,
  generateSpiralAngle,
  getLayerHsl,
  goldenSpiralPosition,
  hslToString,
  lerp,
  randomChoice,
  randomRange,
  snapToGrid,
  uid,
} from './utils/math'

const DEFAULT_CONFIG: TowerConfig = {
  basePosition: [0, 0, 0],
  layers: 8,
  cubesPerLayer: 4,
  growthMode: 'spiral',
  layerIntervalMs: 200,
  scaleFactor: GOLDEN_SCALE,
  spiralAngleDeg: 15,
  rotationPerCubeDeg: 90,
}

const MAX_TOTAL_CUBES = 2000
const MODE_CYCLE: GrowthMode[] = ['spiral', 'recursive', 'mirror']
const MODE_LABELS: Record<GrowthMode, string> = {
  spiral: '螺旋 SPIRAL',
  recursive: '递归 RECURSIVE',
  mirror: '镜像 MIRROR',
}

function generateAutoCubes(config: TowerConfig, visibleLayers: number): CubeInstance[] {
  const result: CubeInstance[] = []
  const baseRadius = 1.6
  const layerHeight = 0.85

  for (let l = 0; l < visibleLayers; l++) {
    if (result.length >= MAX_TOTAL_CUBES) break
    const layerScale = Math.pow(config.scaleFactor, l)
    const layerCubeSize = 0.6 * layerScale
    const radius = baseRadius * layerScale
    const y = l * layerHeight
    const layerRotRad = deg2rad(generateSpiralAngle(l, config.growthMode))
    const hsl = getLayerHsl(l, config.layers)
    const color = hslToString(hsl.h, hsl.s, hsl.l)

    const count = Math.min(
      config.cubesPerLayer,
      MAX_TOTAL_CUBES - result.length
    )
    for (let c = 0; c < count; c++) {
      const [ox, , oz] = goldenSpiralPosition(
        c,
        count,
        l,
        radius,
        layerRotRad
      )
      const extraRot = c * deg2rad(config.rotationPerCubeDeg / count)
      result.push({
        id: `auto-${l}-${c}-${uid()}`,
        position: [
          config.basePosition[0] + ox,
          y + layerCubeSize / 2,
          config.basePosition[2] + oz,
        ],
        scale: layerCubeSize,
        rotation: [0, extraRot + layerRotRad, 0],
        color,
        layer: l,
        opacity: hsl.a,
        isManual: false,
      })
    }
  }
  return result
}

function Scene({
  onPointerDown,
  onPointerUp,
  onPointerMove,
  hoverPos,
  isDragging,
  autoCubes,
  manualCubes,
  ripples,
  particles,
  totalCubes,
  visibleLayers,
  transitionT,
  prevConfig,
  currentConfig,
}: {
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void
  hoverPos: [number, number, number] | null
  isDragging: boolean
  autoCubes: CubeInstance[]
  manualCubes: ManualCube[]
  ripples: RippleEffect[]
  particles: Particle[]
  totalCubes: number
  visibleLayers: number
  transitionT: number
  prevConfig: TowerConfig
  currentConfig: TowerConfig
}) {
  const interpolatedConfig = useMemo<TowerConfig>(() => {
    const t = easeInOutQuad(transitionT)
    return {
      ...currentConfig,
      cubesPerLayer: Math.round(
        lerp(prevConfig.cubesPerLayer, currentConfig.cubesPerLayer, t)
      ),
      spiralAngleDeg: lerp(
        prevConfig.spiralAngleDeg,
        currentConfig.spiralAngleDeg,
        t
      ),
    }
  }, [prevConfig, currentConfig, transitionT])

  const ripplesList = ripples.map(r => {
    const now = performance.now()
    const t = clamp((now - r.startTime) / r.duration, 0, 1)
    const radius = r.maxRadius * t
    const opacity = (1 - t) * 0.6
    return (
      <mesh key={r.id} rotation={[-Math.PI / 2, 0, 0]} position={[r.center[0], 0.02, r.center[2]]}>
        <ringGeometry args={[Math.max(0.1, radius - 0.3), radius, 64]} />
        <meshBasicMaterial
          color={`rgba(100, 200, 255, ${opacity})`}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    )
  })

  const particlesMesh = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const colors: THREE.Color[] = []
    particles.forEach(p => {
      pts.push(new THREE.Vector3(p.position[0], p.position[1], p.position[2]))
      colors.push(new THREE.Color(p.color))
    })
    return { pts, colors }
  }, [particles])

  const settledManualCubes = useMemo(() => {
    const now = performance.now()
    const result: ManualCube[] = []
    const settled = manualCubes.filter(m => {
      const t = clamp((now - m.animStart) / m.animDuration, 0, 1)
      return t >= 1
    })
    settled.forEach(m => result.push(m))
    return result
  }, [manualCubes])

  const manualAnimCubes = useMemo(() => {
    const now = performance.now()
    const list: Array<{
      pos: [number, number, number]
      color: string
      scale: number
    }> = []
    manualCubes.forEach(m => {
      const t = clamp((now - m.animStart) / m.animDuration, 0, 1)
      const [xyz, bounceY] = bounceInterpolation(t)
      const pos: [number, number, number] = [
        lerp(m.startPos[0], m.endPos[0], xyz),
        lerp(m.startPos[1], m.endPos[1], xyz) + bounceY,
        lerp(m.startPos[2], m.endPos[2], xyz),
      ]
      list.push({ pos, color: m.color, scale: 0.5 })
    })
    return list
  }, [manualCubes])

  const settledAutoCubes = autoCubes

  const connectionLines = useMemo(() => {
    const lines: JSX.Element[] = []
    const allCubes: Array<[number, number, number]> = [
      ...settledAutoCubes.map(c => c.position),
      ...settledManualCubes.map(m => m.endPos),
      ...manualAnimCubes.map(a => a.pos),
    ]
    for (let i = 0; i < allCubes.length; i++) {
      for (let j = i + 1; j < Math.min(i + 6, allCubes.length); j++) {
        const a = allCubes[i]
        const b = allCubes[j]
        const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d < 1.8) {
          const opacity = clamp((1 - d / 1.8) * 0.3, 0, 0.3)
          lines.push(
            <Line
              key={`line-${i}-${j}`}
              points={[a, b]}
              color={`rgba(180, 220, 255, ${opacity})`}
              lineWidth={1}
              transparent
              depthWrite={false}
            />
          )
        }
      }
    }
    return lines
  }, [settledAutoCubes, settledManualCubes, manualAnimCubes])

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[12, 20, 8]} intensity={1.1} color="#fff0e0" />
      <pointLight position={[-10, 8, -10]} intensity={0.7} color="#8090ff" />
      <pointLight position={[8, 4, -12]} intensity={0.5} color="#ff80c0" />

      <Stars radius={120} depth={60} count={3500} factor={4} fade speed={0.4} />

      <Grid
        args={[40, 40, 40, 40]}
        cellSize={0.5}
        cellThickness={0.4}
        cellColor="#4B0082"
        sectionSize={2}
        sectionThickness={0.8}
        sectionColor="#4B0082"
        fadeDistance={50}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid
        position={[0, 0, 0]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.5, 20, 128]} />
        <meshBasicMaterial
          color="rgba(75, 0, 130, 0.06)"
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {ripplesList}

      <Tower
        autoCubes={settledAutoCubes}
        manualAnimCubes={manualAnimCubes}
        totalCubes={totalCubes}
        transitionT={transitionT}
      />

      {particlesMesh.pts.length > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={particlesMesh.pts.length}
              array={new Float32Array(particlesMesh.pts.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={particlesMesh.colors.length}
              array={new Float32Array(particlesMesh.colors.flatMap(c => [c.r, c.g, c.b]))}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.08}
            vertexColors
            transparent
            opacity={0.9}
            depthWrite={false}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {connectionLines}

      {hoverPos && isDragging && (
        <mesh position={[hoverPos[0], hoverPos[1] + 0.25, hoverPos[2]]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.35}
            emissive="#ffffff"
            emissiveIntensity={0.6}
          />
        </mesh>
      )}

      <group
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
      >
        <mesh position={[0, -100, 0]}>
          <planeGeometry args={[2000, 2000]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </group>

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={2}
        maxDistance={50}
        enableDamping
        dampingFactor={0.6}
        target={[0, 2.5, 0]}
      />
    </>
  )
}

export default function App() {
  const [config, setConfig] = useState<TowerConfig>(DEFAULT_CONFIG)
  const [prevConfig, setPrevConfig] = useState<TowerConfig>(DEFAULT_CONFIG)
  const [transitionT, setTransitionT] = useState(1)
  const transitionStartRef = useRef(0)
  const transitionDurationRef = useRef(1500)

  const [visibleLayers, setVisibleLayers] = useState(0)
  const growthStartRef = useRef(0)
  const growingRef = useRef(false)

  const [autoCubes, setAutoCubes] = useState<CubeInstance[]>([])
  const [manualCubes, setManualCubes] = useState<ManualCube[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const [ripples, setRipples] = useState<RippleEffect[]>([])

  const [hoverPos, setHoverPos] = useState<[number, number, number] | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<[number, number] | null>(null)
  const dragMovedRef = useRef(false)

  const [, forceRender] = useState(0)
  const animationRef = useRef<number | null>(null)
  const lastSpawnRef = useRef(0)

  const totalCubes = autoCubes.length + manualCubes.length

  const handleConfigChange = useCallback((next: Partial<TowerConfig>) => {
    setPrevConfig(prev => ({ ...prev, ...config }))
    setConfig(prev => {
      const merged = { ...prev, ...next }
      setTransitionT(0)
      transitionStartRef.current = performance.now()
      return merged
    })
  }, [config])

  const handleReset = useCallback(() => {
    setAutoCubes([])
    setManualCubes([])
    setParticles([])
    setRipples([])
    setVisibleLayers(0)
    growingRef.current = false
    setPrevConfig(DEFAULT_CONFIG)
    setConfig(DEFAULT_CONFIG)
    setTransitionT(1)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'g') {
        const idx = MODE_CYCLE.indexOf(config.growthMode)
        const nextMode = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]
        handleConfigChange({ growthMode: nextMode })
      } else if (key === '+' || key === '=') {
        const n = Math.min(12, config.cubesPerLayer + 1)
        if (n !== config.cubesPerLayer) handleConfigChange({ cubesPerLayer: n })
      } else if (key === '-' || key === '_') {
        const n = Math.max(4, config.cubesPerLayer - 1)
        if (n !== config.cubesPerLayer) handleConfigChange({ cubesPerLayer: n })
      } else if (key === 'r') {
        handleReset()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [config, handleConfigChange, handleReset])

  useEffect(() => {
    if (visibleLayers < config.layers && growingRef.current) {
      // wait via animation loop
    }
  }, [visibleLayers, config.layers])

  const spawnParticles = useCallback((now: number) => {
    const delta = now - lastSpawnRef.current
    if (delta < 200) return
    lastSpawnRef.current = now

    const layers = visibleLayers
    if (layers <= 0) return
    const perSec = layers * 5
    const count = Math.max(1, Math.round(perSec * delta / 1000))

    const newParticles: Particle[] = []
    const topLayer = Math.max(0, layers - 1)
    const hsl = getLayerHsl(topLayer, config.layers)
    const color = hslToString(hsl.h, hsl.s, hsl.l)

    const layerScale = Math.pow(config.scaleFactor, topLayer)
    const y = topLayer * 0.85 + 0.4
    const radius = 1.6 * layerScale

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = radius * (0.2 + Math.random() * 0.8)
      newParticles.push({
        id: `p-${uid()}`,
        position: [
          config.basePosition[0] + Math.cos(angle) * r,
          y + Math.random() * 0.3,
          config.basePosition[2] + Math.sin(angle) * r,
        ],
        velocity: [
          randomRange(-0.05, 0.05),
          randomRange(0.1, 0.3),
          randomRange(-0.05, 0.05),
        ],
        color,
        life: randomRange(1.5, 3),
        maxLife: 3,
        size: randomRange(2, 4),
      })
    }

    setParticles(prev => {
      const dt = delta / 1000
      const updated: Particle[] = prev
        .map(p => ({
          ...p,
          position: [
            p.position[0] + p.velocity[0] * dt * 60,
            p.position[1] + p.velocity[1] * dt * 60,
            p.position[2] + p.velocity[2] * dt * 60,
          ] as [number, number, number],
          life: p.life - dt,
        }))
        .filter(p => p.life > 0)
      return [...updated, ...newParticles].slice(-1200)
    })
  }, [visibleLayers, config])

  useEffect(() => {
    const tick = (now: number) => {
      if (transitionT < 1) {
        const t = clamp((now - transitionStartRef.current) / transitionDurationRef.current, 0, 1)
        setTransitionT(t)
      }

      if (growingRef.current) {
        const elapsed = now - growthStartRef.current
        const targetLayers = Math.min(
          config.layers,
          Math.floor(elapsed / config.layerIntervalMs) + 1
        )
        if (targetLayers !== visibleLayers) {
          setVisibleLayers(targetLayers)
          if (targetLayers >= config.layers) growingRef.current = false
        }
      }

      setManualCubes(prev => prev.filter(m => (now - m.animStart) < m.animDuration + 100 || m.settled === false))

      setRipples(prev => prev.filter(r => (now - r.startTime) < r.duration))

      spawnParticles(now)

      forceRender(x => (x + 1) & 0xffff)
      animationRef.current = requestAnimationFrame(tick)
    }
    animationRef.current = requestAnimationFrame(tick)
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    }
  }, [visibleLayers, config, spawnParticles, transitionT])

  useEffect(() => {
    const generated = generateAutoCubes(config, visibleLayers)
    setAutoCubes(generated.slice(0, MAX_TOTAL_CUBES))
  }, [config, visibleLayers])

  const getIntersectionPoint = useCallback((e: ThreeEvent<PointerEvent>): [number, number, number] | null => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    )
    const cam = e.camera
    raycaster.setFromCamera(ndc, cam)
    const point = new THREE.Vector3()
    if (raycaster.ray.intersectPlane(plane, point)) {
      const [gx, gz] = snapToGrid(point.x, point.z, 0.5)
      return [gx, 0, gz]
    }
    return null
  }, [])

  const findNearestAutoCube = useCallback((pos: [number, number, number]): [number, number, number] => {
    if (autoCubes.length === 0) return [pos[0], 0.5, pos[2]]
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < autoCubes.length; i++) {
      const c = autoCubes[i]
      const dx = c.position[0] - pos[0]
      const dy = c.position[1] - pos[1]
      const dz = c.position[2] - pos[2]
      const d = dx * dx + dy * dy + dz * dz
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    const target = autoCubes[bestIdx].position
    return [target[0], target[1] + 0.55, target[2]]
  }, [autoCubes])

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    const pos = getIntersectionPoint(e)
    if (!pos) return

    dragStartRef.current = [e.clientX, e.clientY]
    dragMovedRef.current = false
    setIsDragging(true)
    setHoverPos(pos)
  }, [getIntersectionPoint])

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return
    const pos = getIntersectionPoint(e)
    if (!pos) return
    if (dragStartRef.current) {
      const [sx, sy] = dragStartRef.current
      const dist = Math.hypot(e.clientX - sx, e.clientY - sy)
      if (dist > 5) dragMovedRef.current = true
    }
    setHoverPos(pos)
  }, [isDragging, getIntersectionPoint])

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    const pos = getIntersectionPoint(e)
    setIsDragging(false)

    const moved = dragMovedRef.current
    dragStartRef.current = null
    dragMovedRef.current = false

    if (!pos) return

    if (!moved) {
      handleConfigChange({ basePosition: [pos[0], pos[1], pos[2]] })
      setPrevConfig(prev => ({ ...prev, basePosition: [pos[0], pos[1], pos[2]] }))
      setAutoCubes([])
      setVisibleLayers(1)
      growingRef.current = true
      growthStartRef.current = performance.now()

      const rid = uid()
      setRipples(prev => [...prev, {
        id: rid,
        center: [pos[0], pos[1], pos[2]],
        startTime: performance.now(),
        duration: 1000,
        maxRadius: 10,
      }])
    } else {
      if (totalCubes + 1 > MAX_TOTAL_CUBES) {
        setHoverPos(null)
        return
      }
      const targetPos = findNearestAutoCube(pos)
      const startPos: [number, number, number] = [pos[0], pos[1] + 0.25, pos[2]]
      const id = uid()
      setManualCubes(prev => [...prev, {
        id,
        startPos,
        endPos: targetPos,
        color: randomChoice(MANUAL_CUBE_COLORS),
        animStart: performance.now(),
        animDuration: 800,
        settled: false,
      }])

      const rid = uid()
      setRipples(prev => [...prev, {
        id: rid,
        center: [pos[0], pos[1], pos[2]],
        startTime: performance.now(),
        duration: 1000,
        maxRadius: 6,
      }])
    }

    setHoverPos(null)
  }, [getIntersectionPoint, findNearestAutoCube, handleConfigChange, totalCubes])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [15, 10, 15], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{ background: 'radial-gradient(ellipse at center, #0a0a2e 0%, #000000 100%)' }}
      >
        <Scene
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          hoverPos={hoverPos}
          isDragging={isDragging}
          autoCubes={autoCubes}
          manualCubes={manualCubes}
          ripples={ripples}
          particles={particles}
          totalCubes={totalCubes}
          visibleLayers={visibleLayers}
          transitionT={transitionT}
          prevConfig={prevConfig}
          currentConfig={config}
        />
      </Canvas>

      <div
        className="fade-in"
        style={{
          position: 'absolute',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '14px 28px',
          background: 'rgba(10, 10, 46, 0.55)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          backdropFilter: 'blur(10px)',
          display: 'flex',
          gap: 36,
          alignItems: 'center',
          pointerEvents: 'none',
          letterSpacing: 0.5,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>层数 LAYERS</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#FFD700' }}>
            {visibleLayers}
            <span style={{ fontSize: 13, opacity: 0.4, marginLeft: 4 }}>/ {config.layers}</span>
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>立方体 CUBES</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#4ECDC4' }}>
            {totalCubes}
            <span style={{ fontSize: 13, opacity: 0.4, marginLeft: 4 }}>/ {MAX_TOTAL_CUBES}</span>
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>模式 MODE</span>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#8A2BE2' }}>
            {MODE_LABELS[config.growthMode]}
          </span>
        </div>
      </div>

      <div
        className="fade-in"
        style={{
          position: 'absolute',
          top: 120,
          left: 24,
          padding: '18px 20px',
          background: 'rgba(40, 40, 50, 0.45)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          backdropFilter: 'blur(8px)',
          maxWidth: 280,
          lineHeight: 1.9,
          fontSize: 13,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#fff', letterSpacing: 1 }}>
          ⌨ 操作指南 SHORTCUTS
        </div>
        <div style={{ opacity: 0.85 }}>
          <div><b style={{ color: '#FFD700' }}>点击</b> 画布 — 生长新塔</div>
          <div><b style={{ color: '#FFD700' }}>拖拽</b> 鼠标 — 手动堆叠</div>
          <div><b style={{ color: '#FFD700' }}>滚轮</b> — 缩放视角</div>
          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.15)', margin: '10px 0', paddingTop: 10 }}>
            <b style={{ color: '#4ECDC4' }}>[G]</b> 切换生长模式
          </div>
          <div><b style={{ color: '#4ECDC4' }}>[+] / [-]</b> 每层立方体 (当前 {config.cubesPerLayer})</div>
          <div><b style={{ color: '#4ECDC4' }}>[R]</b> 重置塔结构</div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 24,
          fontSize: 11,
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      >
        分形积木塔 · Fractal Block Tower · {config.cubesPerLayer}×{visibleLayers} · φ=0.618
      </div>
    </div>
  )
}
