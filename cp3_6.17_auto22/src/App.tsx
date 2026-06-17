import { useState, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import ParticleField from './ParticleField'
import ControlPanel from './ControlPanel'

function App() {
  const [thrustStrength, setThrustStrength] = useState(1.5)
  const [particleSize, setParticleSize] = useState(3)
  const [lineThreshold, setLineThreshold] = useState(30)

  const [isDragging, setIsDragging] = useState(false)
  const [mouseNDC, setMouseNDC] = useState({ x: 0, y: 0 })
  
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true)
      updateMousePosition(e)
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      updateMousePosition(e)
    }
  }, [isDragging])

  const updateMousePosition = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    
    setMouseNDC({ x, y })
  }

  const handleRelease = useCallback(() => {
  }, [])

  const handleThrustStrengthChange = useCallback((value: number) => {
    setThrustStrength(value)
  }, [])

  const handleParticleSizeChange = useCallback((value: number) => {
    setParticleSize(value)
  }, [])

  const handleLineThresholdChange = useCallback((value: number) => {
    setLineThreshold(value)
  }, [])

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: '#000',
    position: 'relative',
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseUp}
    >
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        frameloop="always"
      >
        <color attach="background" args={['#000000']} />
        <ParticleField
          thrustStrength={thrustStrength}
          particleSize={particleSize}
          lineThreshold={lineThreshold}
          isDragging={isDragging}
          mouseNDC={mouseNDC}
          onRelease={handleRelease}
        />
      </Canvas>

      <ControlPanel
        thrustStrength={thrustStrength}
        particleSize={particleSize}
        lineThreshold={lineThreshold}
        onThrustStrengthChange={handleThrustStrengthChange}
        onParticleSizeChange={handleParticleSizeChange}
        onLineThresholdChange={handleLineThresholdChange}
      />

      <div style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: '12px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        textAlign: 'right',
        userSelect: 'none',
        pointerEvents: 'none',
      }}>
        <div style={{ color: '#fdd835', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
          流体粒子扭曲特效
        </div>
        <div style={{ opacity: 0.7 }}>
          Fluid Particle Distortion Effect
        </div>
      </div>
    </div>
  )
}

export default App
