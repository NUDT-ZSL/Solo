import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import MainScene from './components/MainScene'

export interface ParticleData {
  position: [number, number, number]
  velocity: [number, number, number]
  targetHue: number
  colorCyclePeriod: number
  sizeFrequency: number
}

const PARTICLE_COUNT = 800
const BASE_RADIUS = 200
const WARM_COLOR = '#FF7733'

function generateParticles(): ParticleData[] {
  const particles: ParticleData[] = []
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = BASE_RADIUS * Math.cbrt(Math.random())
    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.sin(phi) * Math.sin(theta)
    const z = r * Math.cos(phi)

    particles.push({
      position: [x, y, z],
      velocity: [
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
      ],
      targetHue: Math.random() * 360,
      colorCyclePeriod: 5 + Math.random() * 5,
      sizeFrequency: 0.5 + Math.random() * 0.5,
    })
  }
  return particles
}

function App() {
  const [particles] = useState<ParticleData[]>(() => generateParticles())
  const [perturbation, setPerturbation] = useState<number>(1)
  const [stats, setStats] = useState<{ particleCount: number; avgConnections: number }>({
    particleCount: PARTICLE_COUNT,
    avgConnections: 0,
  })

  const handleStatsUpdate = useCallback((avgConnections: number) => {
    setStats((prev) => ({ ...prev, avgConnections }))
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 0, 250], fov: 60, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0B0D1A']} />
        <fog attach="fog" args={['#0B0D1A', 200, 600]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[100, 100, 100]} intensity={0.8} />
        <MainScene
          particles={particles}
          warmColor={WARM_COLOR}
          perturbation={perturbation}
          onStatsUpdate={handleStatsUpdate}
        />
      </Canvas>

      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          color: '#ffffff',
          minWidth: '240px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          zIndex: 1000,
        }}
      >
        <h3
          style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 600,
            opacity: 0.95,
            letterSpacing: '0.5px',
          }}
        >
          控制面板
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              opacity: 0.85,
            }}
          >
            扰动强度: {perturbation.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.01"
            value={perturbation}
            onChange={(e) => setPerturbation(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '4px',
              appearance: 'none',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              outline: 'none',
              cursor: 'pointer',
              accentColor: '#FF7733',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '4px',
              fontSize: '11px',
              opacity: 0.6,
            }}
          >
            <span>0</span>
            <span>2.5</span>
            <span>5</span>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '13px', opacity: 0.75 }}>粒子数量</span>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#7EC8E3',
              }}
            >
              {stats.particleCount}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '13px', opacity: 0.75 }}>平均连接数</span>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#FFB347',
              }}
            >
              {stats.avgConnections.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '12px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        拖拽旋转视角 · 滚轮缩放 · 点击粒子高亮
      </div>
    </div>
  )
}

export default App
