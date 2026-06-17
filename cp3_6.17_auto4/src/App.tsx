import { useState, useCallback, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import ParticleField from './ParticleField'
import ControlPanel from './ControlPanel'

function CameraSetup() {
  const { camera, size } = useThree()
  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.left = -size.width / 2
      camera.right = size.width / 2
      camera.top = size.height / 2
      camera.bottom = -size.height / 2
      camera.updateProjectionMatrix()
    }
  }, [camera, size])
  return null
}

function App() {
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [forceStrength, setForceStrength] = useState(1.5)
  const [particleSize, setParticleSize] = useState(3)
  const [linkThreshold, setLinkThreshold] = useState(30)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left - rect.width / 2
        const y = -(e.clientY - rect.top - rect.height / 2)
        setMouseX(x)
        setMouseY(y)
      }
    },
    []
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button === 0) {
        setIsDragging(true)
      }
    },
    []
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#000000',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <Canvas
        orthographic
        camera={{ position: [0, 0, 100] }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <CameraSetup />
        <color attach="background" args={[0x000000]} />
        <ParticleField
          mouseX={mouseX}
          mouseY={mouseY}
          isDragging={isDragging}
          forceStrength={forceStrength}
          particleSize={particleSize}
          linkThreshold={linkThreshold}
        />
      </Canvas>

      <ControlPanel
        forceStrength={forceStrength}
        particleSize={particleSize}
        linkThreshold={linkThreshold}
        onForceStrengthChange={setForceStrength}
        onParticleSizeChange={setParticleSize}
        onLinkThresholdChange={setLinkThreshold}
      />
    </div>
  )
}

export default App
