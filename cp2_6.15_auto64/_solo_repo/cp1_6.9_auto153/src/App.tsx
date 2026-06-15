import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, EffectComposer, Bloom } from '@react-three/drei'
import * as THREE from 'three'
import {
  generateRoadGrid,
  RoadGridData,
  RoadSegment,
  Intersection,
  findNearestSegment,
  getSegmentById,
  RoadDirection
} from './roadGrid'
import {
  createParticleSystem,
  updateParticles,
  triggerHotspot,
  ParticleSystemState,
  HotspotEvent,
  CongestedSegment
} from './trafficParticles'
import UIOverlay, { StatsData } from './uiOverlay'

const GRID_SIZE = 6
const SEGMENT_LENGTH = 200
const ROAD_WIDTH = 8
const INTERSECTION_SIZE = 15
const MIN_PARTICLES = 2500
const MAX_PARTICLES = 3500
const MAX_PARTICLES_FOR_BUFFER = 4000

function RoadLines({ gridData }: { gridData: RoadGridData }) {
  const lineRef = useRef<THREE.LineSegments>(null)

  const geometry = useMemo(() => {
    const positions: number[] = []
    const colors: number[] = []
    const color = new THREE.Color(0x33AADD)

    for (const seg of gridData.segments) {
      positions.push(seg.start.x, 0.02, seg.start.z)
      positions.push(seg.end.x, 0.02, seg.end.z)
      colors.push(color.r, color.g, color.b)
      colors.push(color.r, color.g, color.b)

      const perp = seg.direction === RoadDirection.HORIZONTAL
        ? new THREE.Vector3(0, 0, seg.width / 2)
        : new THREE.Vector3(seg.width / 2, 0, 0)

      positions.push(seg.start.x + perp.x, 0.02, seg.start.z + perp.z)
      positions.push(seg.end.x + perp.x, 0.02, seg.end.z + perp.z)
      colors.push(color.r, color.g, color.b)
      colors.push(color.r, color.g, color.b)

      positions.push(seg.start.x - perp.x, 0.02, seg.start.z - perp.z)
      positions.push(seg.end.x - perp.x, 0.02, seg.end.z - perp.z)
      colors.push(color.r, color.g, color.b)
      colors.push(color.r, color.g, color.b)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return geo
  }, [gridData])

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.15}
        linewidth={1}
      />
    </lineSegments>
  )
}

function Intersections({ intersections }: { intersections: Intersection[] }) {
  const groupRef = useRef<THREE.Group>(null)

  return (
    <group ref={groupRef}>
      {intersections.map(int => (
        <mesh key={int.id} position={[int.position.x, 0.03, int.position.z]}>
          <planeGeometry args={[int.size, int.size]} />
          <meshBasicMaterial
            color={0x44AAFF}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

function GroundPlane({ gridData }: { gridData: RoadGridData }) {
  const size = gridData.bounds.max.x - gridData.bounds.min.x
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[size * 1.1, size * 1.1]} />
      <meshBasicMaterial color={0x0D1117} />
    </mesh>
  )
}

interface CongestionGlowProps {
  congestedSegments: Map<string, CongestedSegment>
  gridData: RoadGridData
}

function CongestionGlow({ congestedSegments, gridData }: CongestionGlowProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map())

  useFrame((_, delta) => {
    if (!groupRef.current) return
    let t = performance.now() / 1000

    congestedSegments.forEach((cs, segId) => {
      const mesh = meshRefs.current.get(segId)
      if (!mesh) return
      const pulse = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 0.8))
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = pulse
    })
  })

  useEffect(() => {
    meshRefs.current.clear()
  }, [])

  const segmentsArr = Array.from(congestedSegments.values())

  return (
    <group ref={groupRef}>
      {segmentsArr.map(cs => {
        const seg = getSegmentById(gridData, cs.segmentId)
        if (!seg) return null
        const midX = (seg.start.x + seg.end.x) / 2
        const midZ = (seg.start.z + seg.end.z) / 2
        const isH = seg.direction === RoadDirection.HORIZONTAL
        const w = isH ? seg.length + 10 : seg.width + 12
        const h = isH ? seg.width + 12 : seg.length + 10
        return (
          <mesh
            key={cs.segmentId}
            ref={el => { if (el) meshRefs.current.set(cs.segmentId, el) }}
            position={[midX, 0.04, midZ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial
              color={0xFF0066}
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </group>
  )
}

interface HotspotsRendererProps {
  hotspots: HotspotEvent[]
  currentTime: number
}

function HotspotsRenderer({ hotspots, currentTime }: HotspotsRendererProps) {
  return (
    <group>
      {hotspots.map(h => {
        const elapsed = currentTime - h.startTime
        const gatherT = Math.min(1, elapsed / h.gatherDuration)
        const totalT = elapsed / h.totalDuration
        let opacity = 0
        if (elapsed < h.gatherDuration) {
          opacity = Math.min(1, elapsed / 0.3)
        } else {
          opacity = Math.max(0, 1 - (elapsed - h.gatherDuration) / h.glowDuration)
        }
        const scale = 0.3 + gatherT * 0.7 + (totalT > 0.33 ? (totalT - 0.33) * 1.5 : 0)
        return (
          <group key={h.id} position={[h.center.x, h.center.y + 1, h.center.z]}>
            <mesh scale={scale}>
              <sphereGeometry args={[h.radius, 32, 32]} />
              <meshBasicMaterial
                color={0xFF2200}
                transparent
                opacity={opacity * 0.3}
                side={THREE.BackSide}
                depthWrite={false}
              />
            </mesh>
            <mesh scale={scale * 0.6}>
              <sphereGeometry args={[h.radius, 24, 24]} />
              <meshBasicMaterial
                color={0xFF6600}
                transparent
                opacity={opacity * 0.5}
                depthWrite={false}
              />
            </mesh>
            <pointLight
              color={0xFF2200}
              intensity={opacity * 3}
              distance={h.radius * 3 * scale}
            />
          </group>
        )
      })}
    </group>
  )
}

interface ParticleSystemProps {
  gridData: RoadGridData
  particleState: React.MutableRefObject<ParticleSystemState>
  onStatsUpdate: (stats: StatsData) => void
  onParticleClick: (segmentId: string, worldPos: THREE.Vector3) => void
}

function ParticleSystem({
  gridData,
  particleState,
  onStatsUpdate,
  onParticleClick
}: ParticleSystemProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera, gl, scene } = useThree()
  const startTimeRef = useRef(performance.now() / 1000)
  const lastStatsRef = useRef(0)
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now(), fps: 60 })

  const [positions, colors, sizes] = useMemo(() => {
    const pos = new Float32Array(MAX_PARTICLES_FOR_BUFFER * 3)
    const col = new Float32Array(MAX_PARTICLES_FOR_BUFFER * 3)
    const siz = new Float32Array(MAX_PARTICLES_FOR_BUFFER)
    return [pos, col, siz]
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geo.setDrawRange(0, particleState.current.particles.length)
    return geo
  }, [positions, colors, sizes, particleState])

  useFrame((state, delta) => {
    const currentTime = performance.now() / 1000 - startTimeRef.current
    const safeDelta = Math.min(delta, 0.05)

    updateParticles(particleState.current, gridData, safeDelta, currentTime)

    const particles = particleState.current.particles
    const drawCount = Math.min(particles.length, MAX_PARTICLES_FOR_BUFFER)
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute
    const posArr = posAttr.array as Float32Array
    const colArr = colAttr.array as Float32Array

    for (let i = 0; i < drawCount; i++) {
      const p = particles[i]
      const i3 = i * 3
      posArr[i3] = p.position.x
      posArr[i3 + 1] = p.position.y
      posArr[i3 + 2] = p.position.z
      colArr[i3] = p.color.r
      colArr[i3 + 1] = p.color.g
      colArr[i3 + 2] = p.color.b
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    geometry.setDrawRange(0, drawCount)
    geometry.computeBoundingSphere()

    fpsCounterRef.current.frames++
    const now = performance.now()
    if (now - fpsCounterRef.current.lastTime >= 1000) {
      fpsCounterRef.current.fps = fpsCounterRef.current.frames
      fpsCounterRef.current.frames = 0
      fpsCounterRef.current.lastTime = now
    }

    if (currentTime - lastStatsRef.current >= 0.2) {
      lastStatsRef.current = currentTime
      const s = particleState.current.stats
      onStatsUpdate({
        totalParticles: s.totalCount,
        avgSpeed: s.avgSpeed,
        congestedCount: s.congestedCount,
        fps: fpsCounterRef.current.fps
      })
    }
  })

  const handleClick = useCallback((event: any) => {
    event.stopPropagation()
    const point = event.point as THREE.Vector3
    const nearestSeg = findNearestSegment(point, gridData)
    if (nearestSeg) {
      onParticleClick(nearestSeg.id, point.clone())
    }
  }, [gridData, onParticleClick])

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      onClick={handleClick}
    >
      <pointsMaterial
        size={4}
        vertexColors
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

interface ClickDetectionPlaneProps {
  gridData: RoadGridData
  onSegmentClick: (segmentId: string, worldPos: THREE.Vector3) => void
}

function ClickDetectionPlane({ gridData, onSegmentClick }: ClickDetectionPlaneProps) {
  const planeRef = useRef<THREE.Mesh>(null)
  const size = (gridData.bounds.max.x - gridData.bounds.min.x) * 1.5

  const handleClick = useCallback((event: any) => {
    event.stopPropagation()
    const point = event.point as THREE.Vector3
    const nearestSeg = findNearestSegment(point, gridData)
    if (nearestSeg) {
      onSegmentClick(nearestSeg.id, point.clone())
    }
  }, [gridData, onSegmentClick])

  return (
    <mesh
      ref={planeRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.1, 0]}
      onClick={handleClick}
    >
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 300, 0]} intensity={0.3} color={0x88CCFF} />
    </>
  )
}

interface SceneContentProps {
  gridData: RoadGridData
  particleState: React.MutableRefObject<ParticleSystemState>
  onStatsUpdate: (stats: StatsData) => void
  hotspotsList: HotspotEvent[]
  congestedMap: Map<string, CongestedSegment>
  currentTimeRef: React.MutableRefObject<number>
  onParticleClick: (segmentId: string, worldPos: THREE.Vector3) => void
}

function SceneContent({
  gridData,
  particleState,
  onStatsUpdate,
  hotspotsList,
  congestedMap,
  currentTimeRef,
  onParticleClick
}: SceneContentProps) {
  useFrame(() => {
    currentTimeRef.current = performance.now() / 1000
  })

  return (
    <>
      <Lights />
      <GroundPlane gridData={gridData} />
      <RoadLines gridData={gridData} />
      <Intersections intersections={gridData.intersections} />
      <CongestionGlow congestedSegments={congestedMap} gridData={gridData} />
      <ParticleSystem
        gridData={gridData}
        particleState={particleState}
        onStatsUpdate={onStatsUpdate}
        onParticleClick={onParticleClick}
      />
      <HotspotsRenderer hotspots={hotspotsList} currentTime={currentTimeRef.current} />
      <ClickDetectionPlane gridData={gridData} onSegmentClick={onParticleClick} />
      <OrbitControls
        enableDamping
        dampingFactor={0.85}
        minDistance={50}
        maxDistance={500}
        minPolarAngle={Math.PI / 12}
        maxPolarAngle={Math.PI * 75 / 180}
        enablePan={false}
        target={[0, 0, 0]}
      />
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
          radius={0.5}
        />
      </EffectComposer>
    </>
  )
}

const App: React.FC = () => {
  const gridData = useMemo(() =>
    generateRoadGrid(GRID_SIZE, SEGMENT_LENGTH, ROAD_WIDTH, INTERSECTION_SIZE)
  , [])

  const particleStateRef = useRef<ParticleSystemState>(
    createParticleSystem(gridData, MIN_PARTICLES, MAX_PARTICLES)
  )

  const currentTimeRef = useRef(0)
  const startTimeRef = useRef(performance.now() / 1000)

  const [stats, setStats] = useState<StatsData>({
    totalParticles: particleStateRef.current.stats.totalCount,
    avgSpeed: particleStateRef.current.stats.avgSpeed,
    congestedCount: 0,
    fps: 60
  })

  const [hotspotsList, setHotspotsList] = useState<HotspotEvent[]>([])
  const [congestedMap, setCongestedMap] = useState<Map<string, CongestedSegment>>(new Map())

  useEffect(() => {
    const interval = setInterval(() => {
      setHotspotsList([...particleStateRef.current.hotspots])
      setCongestedMap(new Map(particleStateRef.current.congestedSegments))
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const handleStatsUpdate = useCallback((newStats: StatsData) => {
    setStats(newStats)
  }, [])

  const handleParticleClick = useCallback((segmentId: string, worldPos: THREE.Vector3) => {
    const currentTime = performance.now() / 1000 - startTimeRef.current
    triggerHotspot(
      particleStateRef.current,
      gridData,
      segmentId,
      worldPos,
      currentTime
    )
    setHotspotsList([...particleStateRef.current.hotspots])
  }, [gridData])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{
          position: [250, 250, 250],
          fov: 50,
          near: 0.1,
          far: 2000
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.setClearColor(0x0D1117)
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.2
        }}
        style={{ background: '#0D1117' }}
      >
        <SceneContent
          gridData={gridData}
          particleState={particleStateRef}
          onStatsUpdate={handleStatsUpdate}
          hotspotsList={hotspotsList}
          congestedMap={congestedMap}
          currentTimeRef={currentTimeRef}
          onParticleClick={handleParticleClick}
        />
      </Canvas>
      <UIOverlay stats={stats} />
    </div>
  )
}

export default App
