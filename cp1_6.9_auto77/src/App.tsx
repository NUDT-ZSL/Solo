import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, GradientTexture } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import Forest from '@/components/Forest'

function PerfMonitor({ crystalCount }: { crystalCount: number }) {
  const [fps, setFps] = useState(60)
  const framesRef = useRef(0)
  const lastRef = useRef(performance.now())

  useEffect(() => {
    let raf: number
    const tick = () => {
      framesRef.current++
      const now = performance.now()
      if (now - lastRef.current >= 1000) {
        setFps(framesRef.current)
        framesRef.current = 0
        lastRef.current = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: 16,
      padding: '8px 12px',
      background: 'rgba(10, 10, 42, 0.55)',
      backdropFilter: 'blur(6px)',
      borderRadius: 6,
      border: '1px solid rgba(124, 58, 237, 0.2)',
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: 12,
      fontFamily: "'Inter', -apple-system, sans-serif",
      lineHeight: 1.6,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      <div>FPS: <span style={{ color: fps >= 30 ? '#6ee7ff' : '#ff6b8a' }}>{fps}</span></div>
      <div>晶体: {crystalCount}</div>
    </div>
  )
}

function Tips() {
  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      right: 20,
      padding: '10px 14px',
      background: 'rgba(10, 10, 42, 0.55)',
      backdropFilter: 'blur(6px)',
      borderRadius: 6,
      border: '1px solid rgba(124, 58, 237, 0.2)',
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: 12,
      fontFamily: "'Inter', -apple-system, sans-serif",
      lineHeight: 1.8,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      <div>拖拽旋转视角</div>
      <div>滚轮缩放</div>
      <div>点击晶体引发共振</div>
    </div>
  )
}

function GroundPlane() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[12, 64]} />
        <meshBasicMaterial color="#1a002a" transparent opacity={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[0.02, 12, 64]} />
        <meshBasicMaterial color="#3b1d70" transparent opacity={0.12} side={2} />
      </mesh>
      <GroundGrid />
    </group>
  )
}

function GroundGrid() {
  const radius = 12
  const step = 1
  const lines: JSX.Element[] = []
  const points: [number, number, number][] = []

  for (let r = step; r <= radius; r += step) {
    const seg = Math.max(16, Math.floor(r * 4))
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2
      const a2 = ((i + 1) / seg) * Math.PI * 2
      points.push([Math.cos(a) * r, 0.002, Math.sin(a) * r])
      points.push([Math.cos(a2) * r, 0.002, Math.sin(a2) * r])
    }
  }

  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2
    points.push([0, 0.002, 0])
    points.push([Math.cos(ang) * radius, 0.002, Math.sin(ang) * radius])
  }

  const positions = new Float32Array(points.length * 3)
  points.forEach((p, i) => {
    positions[i * 3] = p[0]
    positions[i * 3 + 1] = p[1]
    positions[i * 3 + 2] = p[2]
  })

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#6d38c9" transparent opacity={0.2} />
    </lineSegments>
  )
}

export default function App() {
  const [crystalCount, setCrystalCount] = useState(50)

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0a0a2a' }}>
      <PerfMonitor crystalCount={crystalCount} />
      <Tips />
      <Canvas
        camera={{ position: [0, 5, 10], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{ background: 'linear-gradient(to bottom, #0a0a2a 0%, #1a002a 100%)' }}
      >
        <color attach="background" args={['#0a0a2a']} />
        <fog attach="fog" args={['#1a002a', 18, 35]} />

        <ambientLight intensity={0.4} color="#7c5cff" />
        <pointLight position={[8, 12, 6]} intensity={1.2} color="#8b5cf6" distance={40} decay={2} />
        <pointLight position={[-8, 8, -6]} intensity={0.9} color="#06b6d4" distance={35} decay={2} />
        <pointLight position={[0, 15, -10]} intensity={0.7} color="#ec4899" distance={40} decay={2} />
        <directionalLight position={[0, 10, 5]} intensity={0.3} color="#a78bfa" />

        <GroundPlane />
        <Forest onCountChange={setCrystalCount} />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3}
          maxDistance={20}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2 - 0.02}
          enableDamping
          dampingFactor={0.08}
        />

        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom intensity={0.6} luminanceThreshold={0.15} luminanceSmoothing={0.9} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
