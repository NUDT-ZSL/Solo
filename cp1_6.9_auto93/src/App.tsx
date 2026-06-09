import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import ParticleSystem from './components/ParticleSystem'
import Sandglass from './components/Sandglass'

export default function App() {
  const [targetTime, setTargetTime] = useState(30)
  const [inputTime, setInputTime] = useState('30')
  const [remainingTime, setRemainingTime] = useState(30)
  const [isRunning, setIsRunning] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleStart = useCallback(() => {
    const val = parseInt(inputTime, 10)
    if (isNaN(val) || val < 10 || val > 60) return
    setTargetTime(val)
    setRemainingTime(val)
    setIsRunning(true)
    setIsResetting(false)
  }, [inputTime])

  const handleDoubleClickReset = useCallback(() => {
    setIsRunning(false)
    setIsResetting(true)
    setRemainingTime(targetTime)
    setTimeout(() => {
      setIsResetting(false)
    }, 2000)
  }, [targetTime])

  const handleTimeUp = useCallback(() => {
    setIsRunning(false)
    setIsResetting(true)
    setTimeout(() => {
      setIsResetting(false)
      setRemainingTime(targetTime)
    }, 2000)
  }, [targetTime])

  const progress = targetTime > 0 ? (targetTime - remainingTime) / targetTime : 0
  const shadowSoftness = Math.min(progress, 1)

  return (
    <div style={{ width: '100%', height: '100%', background: '#0b0f1c', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 10,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'row',
          gap: '12px',
          alignItems: 'center',
          width: 'auto',
          minWidth: '280px',
          '@media (max-width: 768px)': {
            width: '80%',
            flexDirection: 'column',
            left: '10%',
          },
        } as React.CSSProperties}
      >
        <input
          type="number"
          min={10}
          max={60}
          value={inputTime}
          onChange={(e) => setInputTime(e.target.value)}
          placeholder="10-60秒"
          disabled={isRunning}
          style={{
            width: '120px',
            height: '36px',
            padding: '0 12px',
            border: '1px solid #4a6fa5',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.6)',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
            fontFamily: 'Arial',
          }}
        />
        <button
          onClick={handleStart}
          disabled={isRunning}
          style={{
            height: '36px',
            padding: '0 20px',
            border: 'none',
            borderRadius: '8px',
            background: isRunning ? '#1a2a44' : '#2c4f7c',
            color: '#fff',
            fontSize: '14px',
            fontFamily: 'Arial',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (!isRunning) {
              ;(e.target as HTMLButtonElement).style.background = '#3d6ea0'
            }
          }}
          onMouseLeave={(e) => {
            if (!isRunning) {
              ;(e.target as HTMLButtonElement).style.background = '#2c4f7c'
            }
          }}
        >
          {isRunning ? '运行中...' : '开始计时'}
        </button>
      </div>

      <Canvas
        camera={{ position: [0, 260, 520], fov: 50 }}
        shadows
        gl={{ antialias: true }}
        style={{ background: '#0b0f1c' }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-300}
          shadow-camera-right={300}
          shadow-camera-top={300}
          shadow-camera-bottom={-300}
          shadow-camera-near={0.1}
          shadow-camera-far={2000}
          shadow-bias={-0.0001}
          shadow-radius={1 + shadowSoftness * 8}
        />

        <group position={[0, 0, 0]}>
          <Sandglass
            remainingTime={remainingTime}
            targetTime={targetTime}
            isResetting={isResetting}
            onDoubleClickReset={handleDoubleClickReset}
          />
          <ParticleSystem
            targetTime={targetTime}
            remainingTime={remainingTime}
            setRemainingTime={setRemainingTime}
            isRunning={isRunning}
            isResetting={isResetting}
            onTimeUp={handleTimeUp}
          />

          <Html
            position={[0, 240, 0]}
            center
            style={{
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontFamily: 'Arial',
                fontSize: '32px',
                color: '#ffffff',
                textShadow: '2px 2px 4px rgba(100,100,100,0.8)',
                transform: `translate(${progress * 20}px, ${-progress * 20}px)`,
                transition: 'transform 0.3s ease',
                userSelect: 'none',
                fontWeight: 'bold',
                letterSpacing: '2px',
              }}
            >
              {Math.ceil(remainingTime).toString().padStart(2, '0')}s
            </div>
          </Html>
        </group>

        <mesh
          rotation-x={-Math.PI / 2}
          position={[0, -200, 0]}
          receiveShadow
        >
          <circleGeometry args={[300, 64]} />
          <meshStandardMaterial
            color="#2a2f3a"
            transparent
            opacity={0.4}
          />
        </mesh>

        <OrbitControls
          enablePan={false}
          minDistance={200}
          maxDistance={1200}
          enableDamping
          dampingFactor={0.05}
          target={[0, 0, 0]}
        />
      </Canvas>

      <style>{`
        @media (max-width: 768px) {
          div[style*="position: absolute; top: 20px; left: 20px"] {
            width: 80% !important;
            flex-direction: column !important;
            left: 10% !important;
            top: 10px !important;
          }
        }
      `}</style>
    </div>
  )
}
