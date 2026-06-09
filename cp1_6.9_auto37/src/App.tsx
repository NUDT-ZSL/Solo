import { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import RockModel from './components/RockModel'
import ParticleSystem, { type ParticleSpawn } from './components/ParticleSystem'

interface CuttingEvent {
  position: THREE.Vector3
  normal: THREE.Vector3
  innerColor: THREE.Color
  timestamp: number
}

function DynamicLight({ lightAngle }: { lightAngle: number }) {
  const angleRad = (lightAngle * Math.PI) / 180
  const radius = 15
  const hue = 30 + ((lightAngle + 90) / 180) * 180
  const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.6)

  return (
    <>
      <directionalLight
        position={[
          Math.sin(angleRad) * radius,
          10,
          Math.cos(angleRad) * radius,
        ]}
        color={color}
        intensity={1.5}
        castShadow
      />
      <ambientLight intensity={0.25} color="#333366" />
      <hemisphereLight args={['#8899ff', '#112244', 0.5]} />
    </>
  )
}

function Scene({
  lightAngle,
  onCutting,
  resetTrigger,
  particles,
}: {
  lightAngle: number
  onCutting: (e: CuttingEvent) => void
  resetTrigger: number
  particles: ParticleSpawn[]
}) {
  return (
    <>
      <DynamicLight lightAngle={lightAngle} />
      <RockModel onCutting={onCutting} resetTrigger={resetTrigger} />
      <ParticleSystem particles={particles} />
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={40}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI - 0.1}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  )
}

export default function App() {
  const [lightAngle, setLightAngle] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadOpacity, setLoadOpacity] = useState(1)
  const [resetTrigger, setResetTrigger] = useState(0)
  const [particles, setParticles] = useState<ParticleSpawn[]>([])
  const lastCutTime = useRef(0)
  const particleIdRef = useRef(0)

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setLoadOpacity(0)
    }, 800)
    const hideTimer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 180 - 90
    const clamped = Math.max(-90, Math.min(90, x))
    setLightAngle(clamped)
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  const handleReset = () => {
    setResetTrigger((prev) => prev + 1)
    setParticles([])
  }

  const handleCutting = useCallback((event: CuttingEvent) => {
    const now = performance.now()
    if (now - lastCutTime.current < 30) return
    lastCutTime.current = now

    const count = 20 + Math.floor(Math.random() * 11)
    const newParticles: ParticleSpawn[] = []
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.5
      const speed = 1 + Math.random() * 2
      newParticles.push({
        id: particleIdRef.current++,
        position: event.position.clone(),
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.cos(phi) * speed + 1,
          Math.sin(phi) * Math.sin(theta) * speed
        ),
        color: event.innerColor.clone(),
        size: 0.05 + Math.random() * 0.1,
        birthTime: now,
        lifetime: 1500,
      })
    }
    setParticles((prev) => [...prev, ...newParticles].slice(-500))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now()
      setParticles((prev) => prev.filter((p) => now - p.birthTime < p.lifetime))
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const sliderX = 100 + lightAngle * 0.89
  const sliderY = 35 - Math.sqrt(Math.max(0, 80 * 80 - (lightAngle * 0.89) * (lightAngle * 0.89)))

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#0a0a1a' }}>
      <Canvas
        camera={{ position: [10, 10, 10], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl, scene }) => {
          scene.background = new THREE.Color('#0a0a1a')
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        }}
      >
        <fog attach="fog" args={['#0a0a1a', 20, 50]} />
        <Scene
          lightAngle={lightAngle}
          onCutting={handleCutting}
          resetTrigger={resetTrigger}
          particles={particles}
        />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          padding: 16,
          backgroundColor: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: 12,
          color: '#fff',
          fontFamily: "'Courier New', monospace",
          fontSize: 14,
          letterSpacing: 1,
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <div style={{ marginBottom: 12, opacity: 0.9 }}>光照角度</div>
        <div style={{ position: 'relative', width: 200, height: 40 }}>
          <svg width="200" height="40" viewBox="0 0 200 40">
            <defs>
              <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#66aaff" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#ffaa66" />
              </linearGradient>
            </defs>
            <path
              d="M 20 35 A 80 80 0 0 1 180 35"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d={`M 20 35 A 80 80 0 0 1 ${sliderX} ${sliderY}`}
              fill="none"
              stroke="url(#arcGrad)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle
              cx={sliderX}
              cy={sliderY}
              r="8"
              fill="#ffffff"
              opacity="0.9"
              style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8))' }}
            />
          </svg>
        </div>
        <div style={{ marginTop: 8, textAlign: 'center', fontSize: 16, fontWeight: 'bold' }}>
          {lightAngle.toFixed(0)}°
        </div>
      </div>

      <button
        onClick={handleReset}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s ease',
          fontSize: 20,
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.3)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.1)'
        }}
        title="重置岩层"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>

      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(10, 10, 26, 0.9)',
            opacity: loadOpacity,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          <div
            style={{
              color: '#aaddff',
              fontFamily: "'Courier New', monospace",
              fontSize: 18,
              letterSpacing: 2,
              textShadow: '0 0 20px rgba(170, 221, 255, 0.6)',
              animation: 'glowPulse 1.5s ease-in-out infinite',
            }}
          >
            正在生成幻光岩层…
          </div>
        </div>
      )}

      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; text-shadow: 0 0 10px rgba(170, 221, 255, 0.4); }
          50% { opacity: 1; text-shadow: 0 0 30px rgba(170, 221, 255, 0.9); }
        }
      `}</style>
    </div>
  )
}
