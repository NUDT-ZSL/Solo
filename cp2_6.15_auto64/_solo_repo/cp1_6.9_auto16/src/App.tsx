import { useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import * as THREE from 'three'
import IceCrystal from './IceCrystal'
import TemperatureSlider from './TemperatureSlider'

export default function App() {
  const [temperature, setTemperature] = useState(-10)
  const containerRef = useRef<HTMLDivElement>(null)

  const ambientColor = temperature < 0
    ? new THREE.Color().lerpColors(
        new THREE.Color(0xE0F0FF),
        new THREE.Color(0xFFAA66),
        Math.max(0, (temperature + 20) / 20)
      )
    : new THREE.Color(0xFFAA66)

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(180deg, #0B0B2B 0%, #1A1A3A 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Canvas
        camera={{ position: [0, 15, 35], fov: 60, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.6} color={ambientColor} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.2}
          color={ambientColor}
          castShadow
        />
        <pointLight position={[-15, 10, -10]} intensity={0.5} color={0x88CCFF} />
        <pointLight position={[15, 8, 15]} intensity={0.4} color={0xFFAA66} />

        <IceCrystal temperature={temperature} />

        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={50}
          minPolarAngle={Math.PI / 2 - Math.PI / 6}
          maxPolarAngle={Math.PI / 2 + Math.PI / 4}
          enableDamping
          dampingFactor={0.05}
        />

        <fog attach="fog" args={['#0B0B2B', 40, 80]} />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 8,
            padding: '8px 14px',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            fontSize: 16,
            fontFamily: 'monospace',
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          FPS计数器
          <Stats
            className="custom-stats"
            style={{
              position: 'static !important',
              display: 'inline-block',
              marginLeft: 10,
              verticalAlign: 'middle',
            }}
          />
        </div>
      </div>

      <TemperatureSlider
        value={temperature}
        onChange={setTemperature}
        min={-30}
        max={10}
      />

      <style>{`
        .custom-stats > div {
          position: static !important;
        }
      `}</style>
    </div>
  )
}
