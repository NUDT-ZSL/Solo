import { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { TreeSystem } from './treeSystem'
import { Particles } from './particles'

function FpsTracker({ onFps }: { onFps: (fps: number) => void }) {
  const framesRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  useFrame(() => {
    framesRef.current++
    const now = performance.now()
    if (now - lastTimeRef.current >= 500) {
      const fps = Math.round((framesRef.current * 1000) / (now - lastTimeRef.current))
      onFps(fps)
      framesRef.current = 0
      lastTimeRef.current = now
    }
  })

  return null
}

function CameraSetup() {
  const { camera } = useThree()
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      camera.position.set(4, 2.5, 6)
      camera.lookAt(0, 0.5, 0)
      initialized.current = true
    }
  }, [camera])

  return null
}

function Scene({
  leafSegments,
  onPolygonCount
}: {
  leafSegments: number
  onPolygonCount: (count: number) => void
}) {
  return (
    <>
      <CameraSetup />
      <ambientLight intensity={0.35} color={0x8899bb} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.2}
        color={0xfff0e0}
        castShadow
      />
      <directionalLight
        position={[-6, 8, -4]}
        intensity={0.5}
        color={0x88aaff}
      />
      <pointLight position={[0, 2, 0]} intensity={0.4} color={0xffcc88} distance={8} />
      <hemisphereLight args={[0x6688cc, 0x221133, 0.4]} />

      <fog attach="fog" args={[0x0A0A1A, 8, 25]} />

      <Particles bounds={14} />
      <TreeSystem leafSegments={leafSegments} onPolygonCount={onPolygonCount} />

      <OrbitControls
        enableDamping
        dampingFactor={0.95}
        zoomDampingFactor={0.9}
        minDistance={3}
        maxDistance={15}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.55}
        enablePan={false}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
      />
    </>
  )
}

export default function App() {
  const [fps, setFps] = useState(60)
  const [polygonCount, setPolygonCount] = useState(0)
  const [leafSegments, setLeafSegments] = useState(32)
  const fpsHistory = useRef<number[]>([])
  const lastDowngrade = useRef<number>(0)

  const handleFps = useCallback((currentFps: number) => {
    setFps(currentFps)
    fpsHistory.current.push(currentFps)
    if (fpsHistory.current.length > 12) fpsHistory.current.shift()

    const now = Date.now()
    if (now - lastDowngrade.current > 5000) {
      const avg = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
      if (avg < 30 && leafSegments > 16) {
        setLeafSegments(16)
        lastDowngrade.current = now
      }
    }
  }, [leafSegments])

  const handlePolygonCount = useCallback((count: number) => {
    setPolygonCount(count)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0A0A1A' }}>
      <Canvas
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1
        }}
        camera={{ fov: 50, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={[0x0A0A1A]} />
        <FpsTracker onFps={handleFps} />
        <Scene leafSegments={leafSegments} onPolygonCount={handlePolygonCount} />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          padding: '12px 18px',
          background: 'rgba(10, 10, 26, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '10px',
          border: '1px solid rgba(136, 204, 255, 0.15)',
          color: '#E0E0FF',
          fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
          fontSize: '13px',
          lineHeight: '1.7',
          minWidth: '180px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: fps >= 50 ? '#44FF88' : fps >= 30 ? '#FFDD44' : '#FF5566',
            boxShadow: `0 0 8px ${fps >= 50 ? '#44FF88' : fps >= 30 ? '#FFDD44' : '#FF5566'}`
          }} />
          <span style={{ fontWeight: 600, letterSpacing: '0.5px' }}>
            FPS: <span style={{ color: fps >= 50 ? '#88FFAA' : fps >= 30 ? '#FFEE88' : '#FF8899' }}>{fps}</span>
          </span>
        </div>
        <div style={{ opacity: 0.85 }}>
          <span style={{ color: '#88CCFF' }}>多边形:</span>{' '}
          <span style={{ color: '#CCFFCC' }}>{polygonCount.toLocaleString()}</span>
        </div>
        <div style={{ opacity: 0.85 }}>
          <span style={{ color: '#CC88FF' }}>叶片段数:</span>{' '}
          <span style={{ color: leafSegments === 32 ? '#88FFAA' : '#FFEE88' }}>{leafSegments}</span>
          {leafSegments < 32 && (
            <span style={{ color: '#FFDD44', marginLeft: '6px', fontSize: '11px' }}>⚡ 低质量</span>
          )}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 20px',
          background: 'rgba(10, 10, 26, 0.6)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          borderRadius: '20px',
          border: '1px solid rgba(136, 204, 255, 0.12)',
          color: 'rgba(224, 224, 255, 0.7)',
          fontFamily: "-apple-system, 'Segoe UI', sans-serif",
          fontSize: '12px',
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '0.3px'
        }}
      >
        🖱️ 拖拽旋转 · 滚轮缩放 · <span style={{ color: '#FFD700' }}>点击树叶</span>观察数据流
      </div>
    </div>
  )
}
