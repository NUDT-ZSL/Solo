import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { MemoryNetwork, MemoryCurveData } from './MemoryNetwork'

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(a, b, t)
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

interface CurveRuntime {
  mesh: THREE.Mesh
  glow: THREE.Mesh
  mat: THREE.MeshStandardMaterial
  glowMat: THREE.MeshBasicMaterial
  baseWidth: number
  baseColor: THREE.Color
  lastHovered: boolean
  lastSelected: boolean
  lastPulse: boolean
  expandStartTime: number
  baseGeomKey: string
}

function BackgroundManager({ network }: { network: MemoryNetwork }) {
  const { scene } = useThree()
  const c1 = new THREE.Color('#0a0a2e')
  const c2 = new THREE.Color('#3a1a5e')
  useFrame(() => {
    const t = network.getBackgroundT()
    const eased = t < 0.5 ? t * 2 : 2 - t * 2
    const color = lerpColor(c1, c2, eased)
    scene.background = color
  })
  return null
}

function buildTubeGeom(points: THREE.Vector3[], width: number): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
  return new THREE.TubeGeometry(curve, 100, width, 6, false)
}

function CurveTube({
  curve,
  network,
  onClick,
  registerRuntime
}: {
  curve: MemoryCurveData
  network: MemoryNetwork
  onClick: (id: number) => void
  registerRuntime: (id: number, rt: CurveRuntime) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const registered = useRef(false)

  const basePoints = useMemo(() => {
    return network.getCurveRenderData(curve).points
  }, [])

  const baseGeomKey = useMemo(
    () => basePoints.map(p => p.x.toFixed(3) + ',' + p.y.toFixed(3) + ',' + p.z.toFixed(3)).join('|'),
    [basePoints]
  )

  const baseGeom = useMemo(() => buildTubeGeom(basePoints, curve.baseWidth), [basePoints, curve.baseWidth])
  const glowGeom = useMemo(() => buildTubeGeom(basePoints, curve.baseWidth * 3), [basePoints, curve.baseWidth])

  useEffect(() => {
    if (meshRef.current && matRef.current && glowRef.current && glowMatRef.current && !registered.current) {
      registered.current = true
      registerRuntime(curve.id, {
        mesh: meshRef.current,
        glow: glowRef.current,
        mat: matRef.current,
        glowMat: glowMatRef.current,
        baseWidth: curve.baseWidth,
        baseColor: curve.color.clone(),
        lastHovered: false,
        lastSelected: false,
        lastPulse: false,
        expandStartTime: -1,
        baseGeomKey
      })
    }
  }, [curve.id, curve.baseWidth, curve.color, baseGeomKey, registerRuntime])

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={baseGeom}
        onClick={(e) => {
          e.stopPropagation()
          onClick(curve.id)
        }}
      >
        <meshStandardMaterial
          ref={matRef}
          color={curve.color}
          transparent
          opacity={0.85}
          emissive={curve.color}
          emissiveIntensity={0.7}
          roughness={0.3}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={glowRef} geometry={glowGeom}>
        <meshBasicMaterial
          ref={glowMatRef}
          color={curve.color}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

function IntersectionNodes({ network }: { network: MemoryNetwork }) {
  const groupRef = useRef<THREE.Group>(null)
  const nodeMeshes = useRef<THREE.Mesh[]>([])
  const positionsRef = useRef<THREE.Vector3[]>([])
  const inited = useRef(false)
  const [nodeKey, setNodeKey] = useState(0)

  useEffect(() => {
    const unsub = network.subscribe(() => setNodeKey(k => network.intersectionNodes.length))
    return unsub
  }, [network])

  const basePositions = useMemo(() => {
    return network.intersectionNodes.map(n => n.position.clone())
  }, [nodeKey])

  useEffect(() => {
    if (!groupRef.current) return
    while (groupRef.current.children.length > 0) {
      const child = groupRef.current.children[0] as THREE.Mesh
      child.geometry?.dispose()
      ;(child.material as THREE.Material)?.dispose()
      groupRef.current.remove(child)
    }
    nodeMeshes.current = []
    for (let i = 0; i < basePositions.length; i++) {
      const geom = new THREE.SphereGeometry(0.08, 8, 8)
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.copy(basePositions[i])
      groupRef.current.add(mesh)
      nodeMeshes.current.push(mesh)
    }
    positionsRef.current = [...basePositions]
    inited.current = true
  }, [basePositions])

  return <group ref={groupRef} />
}

function ExpandScene({ network }: { network: MemoryNetwork }) {
  const groupRef = useRef<THREE.Group>(null!)
  const centerSphereRef = useRef<THREE.Mesh>(null!)
  const haloRef = useRef<THREE.Mesh>(null!)
  const particleMeshes = useRef<THREE.Mesh[]>([])
  const filamentMeshes = useRef<THREE.Mesh[]>([])
  const lastAnimTime = useRef<number>(-1)
  const lastAnimId = useRef<number>(-1)

  useFrame(() => {
    const anim = network.expandAnimation
    if (!anim) {
      if (groupRef.current) groupRef.current.visible = false
      lastAnimId.current = -1
      return
    }

    const elapsed = network.currentTime - anim.startTime
    const inExpandPhase = elapsed > 800 && elapsed < 2800

    if (lastAnimId.current !== anim.curveId) {
      lastAnimId.current = anim.curveId
      for (const m of particleMeshes.current) {
        m.geometry.dispose()
        ;(m.material as THREE.Material).dispose()
      }
      for (const m of filamentMeshes.current) {
        m.geometry.dispose()
        ;(m.material as THREE.Material).dispose()
      }
      particleMeshes.current = []
      filamentMeshes.current = []
      if (groupRef.current) {
        while (groupRef.current.children.length > 0) groupRef.current.remove(groupRef.current.children[0])
      }
      const baseColor = anim.centerSphere.color
      const sphereGeom = new THREE.SphereGeometry(anim.centerSphere.radius, 24, 24)
      const sphereMat = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        blending: THREE.AdditiveBlending
      })
      const sm = new THREE.Mesh(sphereGeom, sphereMat)
      centerSphereRef.current = sm
      if (groupRef.current) groupRef.current.add(sm)

      const haloGeom = new THREE.SphereGeometry(anim.centerSphere.radius * 1.8, 16, 16)
      const haloMat = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
      })
      const hm = new THREE.Mesh(haloGeom, haloMat)
      haloRef.current = hm
      if (groupRef.current) groupRef.current.add(hm)

      for (let i = 0; i < 32; i++) {
        const pg = new THREE.SphereGeometry(0.04, 6, 6)
        const pm = new THREE.MeshBasicMaterial({
          color: baseColor,
          transparent: true,
          blending: THREE.AdditiveBlending
        })
        const pmMesh = new THREE.Mesh(pg, pm)
        particleMeshes.current.push(pmMesh)
        if (groupRef.current) groupRef.current.add(pmMesh)
      }

      for (let i = 0; i < 12; i++) {
        const tubeG = new THREE.TubeGeometry(
          new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3(0.1, 0, 0)),
          8, 0.02, 4, false
        )
        const tm = new THREE.MeshBasicMaterial({
          color: baseColor,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending
        })
        const tMesh = new THREE.Mesh(tubeG, tm)
        filamentMeshes.current.push(tMesh)
        if (groupRef.current) groupRef.current.add(tMesh)
      }
    }

    if (groupRef.current) groupRef.current.visible = inExpandPhase
    if (!inExpandPhase) return

    const phaseT = Math.min(1, (elapsed - 800) / 1500)
    const fadeIn = Math.min(1, phaseT * 4)
    const fadeOut = phaseT > 0.7 ? 1 - (phaseT - 0.7) / 0.3 : 1
    const alpha = fadeIn * fadeOut

    const center = anim.centerSphere.position

    if (centerSphereRef.current) {
      centerSphereRef.current.position.copy(center)
      const s = 0.7 + 0.3 * phaseT
      centerSphereRef.current.scale.set(s, s, s)
      ;(centerSphereRef.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * alpha
    }
    if (haloRef.current) {
      haloRef.current.position.copy(center)
      ;(haloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 * alpha
    }

    for (let i = 0; i < particleMeshes.current.length; i++) {
      const p = anim.particles[i]
      const angle = p.angle
      const orbitRadius = 1.2
      const n = p.offset.clone().normalize()
      let tangent = new THREE.Vector3(-n.y, n.x, 0)
      if (tangent.lengthSq() < 0.01) tangent.set(1, 0, 0)
      tangent.normalize()
      const bitangent = new THREE.Vector3().crossVectors(n, tangent).normalize()
      const offset = tangent.multiplyScalar(Math.cos(angle) * orbitRadius)
        .add(bitangent.multiplyScalar(Math.sin(angle) * orbitRadius))
      const worldPos = new THREE.Vector3(
        center.x + offset.x,
        center.y + offset.y,
        center.z + offset.z
      )
      particleMeshes.current[i].position.copy(worldPos)
      ;(particleMeshes.current[i].material as THREE.MeshBasicMaterial).opacity = alpha
    }

    for (let i = 0; i < filamentMeshes.current.length; i++) {
      const f = anim.filaments[i]
      const fp = f.position
      const pts = [
        center.clone(),
        center.clone().lerp(fp, 0.3).add(new THREE.Vector3(
          Math.sin(i * 1.7 + phaseT * 10) * 0.05,
          Math.cos(i * 2.3 + phaseT * 8) * 0.05,
          Math.sin(i * 3.1 + phaseT * 12) * 0.05
        )),
        center.clone().lerp(fp, 0.7).add(new THREE.Vector3(
          Math.cos(i * 2.1 + phaseT * 9) * 0.05,
          Math.sin(i * 1.9 + phaseT * 11) * 0.05,
          Math.cos(i * 2.7 + phaseT * 7) * 0.05
        )),
        fp.clone()
      ]
      const c = new THREE.CatmullRomCurve3(pts, false)
      const oldG = filamentMeshes.current[i].geometry as THREE.TubeGeometry
      filamentMeshes.current[i].geometry = new THREE.TubeGeometry(c, 16, 0.02, 4, false)
      oldG.dispose()
      ;(filamentMeshes.current[i].material as THREE.MeshBasicMaterial).opacity = 0.8 * alpha
    }
  })

  return <group ref={groupRef} />
}

function NetworkContent({
  network,
  onSelect
}: {
  network: MemoryNetwork
  onSelect: (id: number | null) => void
}) {
  const [curvesKey, setCurvesKey] = useState(0)
  const runtimes = useRef<Map<number, CurveRuntime>>(new Map())
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const hoveredId = useRef<number | null>(null)
  const expandWidthCache = useRef<Map<number, { startTime: number }>>(new Map())
  const { camera, gl } = useThree()

  useEffect(() => {
    const unsub = network.subscribe(() => {
      setCurvesKey(k => k + 1)
    })
    return unsub
  }, [network])

  const registerRuntime = useCallback((id: number, rt: CurveRuntime) => {
    runtimes.current.set(id, rt)
  }, [])

  useFrame((state) => {
    const time = state.clock.elapsedTime * 1000
    network.update(time)

    for (const [id, rt] of runtimes.current.entries()) {
      const curve = network.curves.get(id)
      if (!curve) continue
      const data = network.getCurveRenderData(curve)

      const needWidthChange =
        (curve.isHovered !== rt.lastHovered) ||
        (curve.isSelected !== rt.lastSelected) ||
        (data.pulse !== rt.lastPulse)

      const tgtWidth = data.width
      const curScale = rt.mesh.scale.x || 1
      const desiredScale = tgtWidth / rt.baseWidth

      if (needWidthChange || Math.abs(curScale - desiredScale) > 0.01 || curve.isSelected) {
        let finalScale = desiredScale
        if (curve.isSelected && network.expandAnimation && network.expandAnimation.curveId === id) {
          const elapsed = time - network.expandAnimation.startTime
          if (elapsed < 800) {
            const t = elapsed / 800
            const wave = Math.sin(t * Math.PI)
            const expandScale = (rt.baseWidth * 2 + (1.0 - rt.baseWidth * 2) * wave) / rt.baseWidth
            finalScale = expandScale
          }
        }
        const damped = curScale + (finalScale - curScale) * 0.25
        rt.mesh.scale.setScalar(damped)
        rt.glow.scale.setScalar(damped)
      }

      rt.mat.opacity = rt.mat.opacity + (data.opacity - rt.mat.opacity) * 0.3
      rt.glowMat.opacity = 0.3 * data.opacity

      const targetEmissive = curve.isHovered || curve.isSelected ? 1.5 : 0.7
      rt.mat.emissiveIntensity += (targetEmissive - rt.mat.emissiveIntensity) * 0.25

      if (curve.isHovered || curve.isSelected) {
        const lighter = data.glowColor
        rt.mat.emissive.lerp(lighter, 0.2)
        rt.glowMat.color.lerp(lighter, 0.2)
      } else {
        rt.mat.emissive.lerp(rt.baseColor, 0.2)
        rt.glowMat.color.lerp(rt.baseColor, 0.2)
      }

      rt.lastHovered = curve.isHovered
      rt.lastSelected = curve.isSelected
      rt.lastPulse = data.pulse
    }

    raycaster.current.setFromCamera(mouse.current, camera)
    const meshPairs = Array.from(runtimes.current.entries()).map(([id, rt]) => ({ id, mesh: rt.mesh }))
    const meshes = meshPairs.map(p => p.mesh)
    const intersects = raycaster.current.intersectObjects(meshes, false)

    let newHovered: number | null = null
    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh
      const found = meshPairs.find(p => p.mesh === hit)
      if (found) newHovered = found.id
    }
    if (newHovered !== hoveredId.current) {
      network.setHovered(newHovered)
      hoveredId.current = newHovered
      gl.domElement.style.cursor = newHovered !== null ? 'pointer' : 'grab'
    }
  })

  useEffect(() => {
    const canvas = gl.domElement
    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }
    canvas.addEventListener('mousemove', handleMove)
    return () => canvas.removeEventListener('mousemove', handleMove)
  }, [gl])

  const handleClick = useCallback((id: number) => {
    onSelect(id)
    network.setSelected(id)
  }, [network, onSelect])

  const curves = Array.from(network.curves.values())

  return (
    <group>
      <group key={'curves_' + curvesKey + '_' + network.curves.size}>
        {curves.map(curve => (
          <CurveTube
            key={curve.id}
            curve={curve}
            network={network}
            onClick={handleClick}
            registerRuntime={registerRuntime}
          />
        ))}
      </group>
      <IntersectionNodes network={network} />
      <ExpandScene network={network} />
    </group>
  )
}

function Scene({
  network,
  onSelect
}: {
  network: MemoryNetwork
  onSelect: (id: number | null) => void
}) {
  const rootRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (rootRef.current) {
      const breathScale = network.getBreathScale()
      rootRef.current.scale.setScalar(breathScale)
      rootRef.current.rotation.y = network.rotationAngle
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#a060ff" />
      <pointLight position={[-10, -5, 5]} intensity={0.8} color="#60a0ff" />
      <pointLight position={[0, -10, -10]} intensity={0.6} color="#ff60a0" />
      <BackgroundManager network={network} />
      <group ref={rootRef}>
        <NetworkContent network={network} onSelect={onSelect} />
      </group>
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        minDistance={3}
        maxDistance={40}
        enablePan={false}
      />
    </>
  )
}

function InfoPanel({
  intensity,
  age,
  hasSelection
}: {
  intensity: number
  age: number
  hasSelection: boolean
}) {
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    left: 24,
    top: 24,
    width: 200,
    height: 100,
    background: 'rgba(26, 26, 62, 0.7)',
    borderRadius: 12,
    padding: '16px 18px',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'all 0.4s ease-out',
    opacity: hasSelection ? 1 : 0.4,
    transform: hasSelection ? 'translateY(0)' : 'translateY(4px)',
    pointerEvents: 'none',
    zIndex: 10
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    opacity: 0.6,
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase'
  }
  const valueStyle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 600,
    lineHeight: 1.1,
    background: 'linear-gradient(135deg, #c080ff 0%, #80b0ff 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  }
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8
  }
  const unitStyle: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.5,
    marginLeft: 4
  }

  return (
    <div style={panelStyle}>
      <div style={rowStyle}>
        <div>
          <div style={labelStyle}>情感强度</div>
          <div style={valueStyle}>
            {hasSelection ? intensity : '—'}
            {hasSelection && <span style={unitStyle}>/ 10</span>}
          </div>
        </div>
      </div>
      <div>
        <div style={labelStyle}>创建时间</div>
        <div style={{ ...valueStyle, fontSize: 22 }}>
          {hasSelection ? `${age}s` : '—'}
          {hasSelection && <span style={unitStyle}>前</span>}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [network] = useState(() => new MemoryNetwork())
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [display, setDisplay] = useState<{ intensity: number; age: number; hasSel: boolean }>({
    intensity: 0,
    age: 0,
    hasSel: false
  })

  useEffect(() => {
    const id = setInterval(() => {
      const info = network.getSelectedInfo()
      if (info) {
        setDisplay({ intensity: info.intensity, age: info.age, hasSel: true })
      } else {
        setDisplay(d => d.hasSel ? d : { intensity: 0, age: 0, hasSel: false })
      }
    }, 200)
    return () => clearInterval(id)
  }, [network, selectedId])

  const handleSelect = useCallback((id: number | null) => {
    setSelectedId(id)
    if (id !== null) {
      const info = network.getSelectedInfo()
      if (info) setDisplay({ intensity: info.intensity, age: info.age, hasSel: true })
    }
  }, [network])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0b0b20' }}>
      <Canvas
        camera={{
          position: [0, 0, 10],
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene network={network} onSelect={handleSelect} />
      </Canvas>
      <InfoPanel
        intensity={display.intensity}
        age={display.age}
        hasSelection={display.hasSel}
      />
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        color: 'rgba(255,255,255,0.35)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 12,
        lineHeight: 1.6,
        pointerEvents: 'none',
        zIndex: 10
      }}>
        <div style={{ marginBottom: 2 }}>🖱️ 拖拽旋转 · 滚轮缩放</div>
        <div style={{ marginBottom: 2 }}>✨ 悬浮高亮相邻记忆 · 点击展开记忆场景</div>
        <div>🌊 每 30s 呼吸脉动 · 每 10s 新记忆生成</div>
      </div>
    </div>
  )
}
