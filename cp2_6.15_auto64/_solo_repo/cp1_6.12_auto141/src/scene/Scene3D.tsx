import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { DataLoader, POIData } from './DataLoader'

interface Scene3DProps {
  heatmapEnabled: boolean
  heatRange: [number, number]
  onPoiClick: (poi: POIData | null, pos?: { x: number; y: number }) => void
  resetKey: number
}

function GridPlane({ size }: { size: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 512, 512)
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.15)'
    ctx.lineWidth = 1
    const step = 32
    for (let i = 0; i <= 512; i += step) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 512)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(512, i)
      ctx.stroke()
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    return tex
  }, [])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={texture} transparent color={0x1e293b} />
    </mesh>
  )
}

function HeatmapPlane({
  size,
  data,
  heatRange,
  enabled
}: {
  size: number
  data: POIData[]
  heatRange: [number, number]
  enabled: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null)
  const lastUpdateRef = useRef<number>(0)

  const renderHeatmap = useCallback(() => {
    const TEX_SIZE = 512
    const canvas = document.createElement('canvas')
    canvas.width = TEX_SIZE
    canvas.height = TEX_SIZE
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE)

    const filtered = data.filter((p) => p.heat >= heatRange[0] && p.heat <= heatRange[1])
    filtered.forEach((poi) => {
      const px = ((poi.x + size / 2) / size) * TEX_SIZE
      const py = ((-poi.y + size / 2) / size) * TEX_SIZE
      const normalizedHeat = poi.heat / 100
      const radius = 30
      const grad = ctx.createRadialGradient(px, py, 0, px, py, radius)
      let r = 0,
        g = 0,
        b = 0,
        a = 0
      if (normalizedHeat < 0.3) {
        r = 59
        g = 130
        b = 246
      } else if (normalizedHeat <= 0.7) {
        r = 251
        g = 191
        b = 36
      } else {
        r = 239
        g = 68
        b = 68
      }
      a = normalizedHeat * 0.8
      grad.addColorStop(0, `rgba(${r},${g},${b},${a})`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(px, py, radius, 0, Math.PI * 2)
      ctx.fill()
    })

    const blurred = document.createElement('canvas')
    blurred.width = TEX_SIZE
    blurred.height = TEX_SIZE
    const bctx = blurred.getContext('2d')!
    bctx.filter = 'blur(15px)'
    bctx.drawImage(canvas, 0, 0)

    const tex = new THREE.CanvasTexture(blurred)
    tex.needsUpdate = true
    return tex
  }, [data, heatRange, size])

  useEffect(() => {
    if (!enabled) {
      setTexture(null)
      return
    }
    const now = performance.now()
    if (now - lastUpdateRef.current < 500) return
    lastUpdateRef.current = now
    const tex = renderHeatmap()
    setTexture(tex)
    return () => {
      tex.dispose()
    }
  }, [enabled, renderHeatmap, data, heatRange])

  if (!enabled) return null

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function POIPoints({
  data,
  heatRange,
  onPoiClick
}: {
  data: POIData[]
  heatRange: [number, number]
  onPoiClick: (poi: POIData, pos: { x: number; y: number }) => void
}) {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const mouse = useMemo(() => new THREE.Vector2(), [])

  const filteredData = useMemo(
    () => data.filter((p) => p.heat >= heatRange[0] && p.heat <= heatRange[1]),
    [data, heatRange]
  )

  const { positions, colors, sizes, indices } = useMemo(() => {
    const positions = new Float32Array(filteredData.length * 3)
    const colors = new Float32Array(filteredData.length * 3)
    const sizes = new Float32Array(filteredData.length)
    const indices: number[] = []
    filteredData.forEach((poi, i) => {
      positions[i * 3] = poi.x
      positions[i * 3 + 1] = 0.05
      positions[i * 3 + 2] = poi.y
      colors[i * 3] = poi.color.r
      colors[i * 3 + 1] = poi.color.g
      colors[i * 3 + 2] = poi.color.b
      sizes[i] = 3 + (poi.heat / 100) * 3
      indices.push(poi.id)
    })
    return { positions, colors, sizes, indices }
  }, [filteredData])

  const pointTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.3, 'rgba(255,255,255,0.8)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(canvas)
  }, [])

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: pointTexture },
        cameraDistance: { value: 100 }
      },
      vertexShader: `
        attribute float size;
        uniform float cameraDistance;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float distFactor = clamp(cameraDistance / 100.0, 0.5, 2.0);
          gl_PointSize = size * distFactor * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          if (texColor.a < 0.1) discard;
          gl_FragColor = vec4(vColor, texColor.a);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [pointTexture])

  useFrame(() => {
    if (pointsRef.current) {
      const pos = new THREE.Vector3()
      pointsRef.current.getWorldPosition(pos)
      const dist = camera.position.distanceTo(pos)
      shaderMaterial.uniforms.cameraDistance.value = dist
    }
  })

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect
        ? target.getBoundingClientRect()
        : document.body.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      if (pointsRef.current) {
        const intersects = raycaster.intersectObject(pointsRef.current)
        if (intersects.length > 0) {
          const idx = intersects[0].index
          if (idx !== undefined) {
            const originalId = indices[idx]
            const poi = data.find((p) => p.id === originalId)
            if (poi) onPoiClick(poi, { x: e.clientX, y: e.clientY })
          }
        }
      }
    }
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.addEventListener('click', handleClick)
      return () => canvas.removeEventListener('click', handleClick)
    }
  }, [camera, raycaster, mouse, data, indices, onPoiClick])

  return (
    <points ref={pointsRef} material={shaderMaterial}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={colors.length / 3}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
          count={sizes.length}
        />
      </bufferGeometry>
    </points>
  )
}

function CameraController({ resetKey }: { resetKey: number }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    if (resetKey > 0) {
      camera.position.set(80, 80, 80)
      camera.lookAt(0, 0, 0)
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0)
        controlsRef.current.update()
      }
    }
  }, [resetKey, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      minDistance={50}
      maxDistance={200}
      target={[0, 0, 0]}
    />
  )
}

export default function Scene3D({
  heatmapEnabled,
  heatRange,
  onPoiClick,
  resetKey
}: Scene3DProps) {
  const [poiData, setPoiData] = useState<POIData[]>([])
  const planeSize = DataLoader.getPlaneSize()

  useEffect(() => {
    DataLoader.fetchData(3000).then(setPoiData)
  }, [])

  const handlePoiClick = useCallback(
    (poi: POIData, pos: { x: number; y: number }) => {
      onPoiClick(poi, pos)
    },
    [onPoiClick]
  )

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [80, 80, 80], fov: 50, near: 0.1, far: 1000 }}
        style={{ background: '#0f172a' }}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => onPoiClick(null)}
      >
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 150, 280]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 100, 50]} intensity={0.8} />
        <GridPlane size={planeSize} />
        <HeatmapPlane
          size={planeSize}
          data={poiData}
          heatRange={heatRange}
          enabled={heatmapEnabled}
        />
        <POIPoints data={poiData} heatRange={heatRange} onPoiClick={handlePoiClick} />
        <CameraController resetKey={resetKey} />
      </Canvas>
    </div>
  )
}
