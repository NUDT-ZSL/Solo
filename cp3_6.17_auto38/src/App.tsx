import React, { useState, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import ParticleField from './ParticleField'
import ControlPanel from './ControlPanel'

const App: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [thrustStrength, setThrustStrength] = useState(1.5)
  const [particleSize, setParticleSize] = useState(3)
  const [lineThreshold, setLineThreshold] = useState(30)

  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    setMousePos({ x, y })
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsMouseDown(true)
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsMouseDown(false)
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#000000',
        cursor: isMouseDown ? 'grabbing' : 'default',
      }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <Canvas
        camera={{ position: [0, 0, 500], fov: 60, near: 1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#000000' }}
      >
        <color attach="background" args={['#000000']} />
        <ParticleField
          mousePos={mousePos}
          isMouseDown={isMouseDown}
          thrustStrength={thrustStrength}
          particleSize={particleSize}
          lineThreshold={lineThreshold}
        />
      </Canvas>

      <ControlPanel
        thrustStrength={thrustStrength}
        onThrustStrengthChange={setThrustStrength}
        particleSize={particleSize}
        onParticleSizeChange={setParticleSize}
        lineThreshold={lineThreshold}
        onLineThresholdChange={setLineThreshold}
      />
    </div>
  )
}

export default App
