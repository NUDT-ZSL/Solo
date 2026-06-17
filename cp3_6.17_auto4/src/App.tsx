import { useState, useEffect, useCallback, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import ParticleField from './ParticleField'
import ControlPanel from './ControlPanel'

function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [releaseTime, setReleaseTime] = useState(0)
  const [thrustStrength, setThrustStrength] = useState(1.5)
  const [particleSize, setParticleSize] = useState(3)
  const [linkThreshold, setLinkThreshold] = useState(30)
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  })

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    setIsMouseDown(true)
    const ndcX = (e.clientX / window.innerWidth) * 2 - 1
    const ndcY = -(e.clientY / window.innerHeight) * 2 + 1
    setMousePos({ x: ndcX, y: ndcY })
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const ndcX = (e.clientX / window.innerWidth) * 2 - 1
    const ndcY = -(e.clientY / window.innerHeight) * 2 + 1
    setMousePos({ x: ndcX, y: ndcY })
  }, [])

  const handlePointerUp = useCallback(() => {
    if (isMouseDown) {
      setIsMouseDown(false)
      setReleaseTime(performance.now())
    }
  }, [isMouseDown])

  const cameraProps = useMemo(() => ({
    left: -viewportSize.width / 2,
    right: viewportSize.width / 2,
    top: viewportSize.height / 2,
    bottom: -viewportSize.height / 2,
    near: -1000,
    far: 1000,
    position: [0, 0, 100] as [number, number, number],
  }), [viewportSize])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Canvas
        orthographic
        camera={cameraProps}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#000000',
        }}
      >
        <color attach="background" args={['#000000']} />
        <ParticleField
          mousePos={mousePos}
          isMouseDown={isMouseDown}
          releaseTime={releaseTime}
          thrustStrength={thrustStrength}
          particleSize={particleSize}
          linkThreshold={linkThreshold}
          viewportSize={viewportSize}
        />
      </Canvas>

      <ControlPanel
        thrustStrength={thrustStrength}
        particleSize={particleSize}
        linkThreshold={linkThreshold}
        onThrustStrengthChange={setThrustStrength}
        onParticleSizeChange={setParticleSize}
        onLinkThresholdChange={setLinkThreshold}
      />

      <div
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '12px',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          textAlign: 'right',
          lineHeight: '1.6',
        }}
      >
        <div>Fluid Particle Field</div>
        <div>800 Particles · 50FPS+</div>
      </div>
    </div>
  )
}

export default App
