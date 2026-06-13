import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import EditorPanel from './components/EditorPanel'
import ParticleScene from './components/ParticleScene'
import { Preset, getDefaultPreset } from './data/presets'
import './styles.css'

function App() {
  const defaultPreset = getDefaultPreset()

  const [particleCount, setParticleCount] = useState(defaultPreset.particleCount)
  const [speed, setSpeed] = useState(defaultPreset.speed)
  const [direction, setDirection] = useState(defaultPreset.direction)
  const [size, setSize] = useState(defaultPreset.size)
  const [color, setColor] = useState(defaultPreset.color)

  const handlePresetLoad = (preset: Preset) => {
    setParticleCount(preset.particleCount)
    setSpeed(preset.speed)
    setDirection(preset.direction)
    setSize(preset.size)
    setColor(preset.color)
  }

  return (
    <div className="app-container">
      <EditorPanel
        particleCount={particleCount}
        speed={speed}
        direction={direction}
        size={size}
        color={color}
        onParticleCountChange={setParticleCount}
        onSpeedChange={setSpeed}
        onDirectionChange={setDirection}
        onSizeChange={setSize}
        onColorChange={setColor}
        onPresetLoad={handlePresetLoad}
      />
      <div className="canvas-container">
        <Canvas
          camera={{ position: [0, 0, 15], fov: 60 }}
          gl={{ antialias: true, alpha: true }}
        >
          <color attach="background" args={['#0f172a']} />
          <ParticleScene
            particleCount={particleCount}
            speed={speed}
            direction={direction}
            size={size}
            color={color}
          />
        </Canvas>
      </div>
    </div>
  )
}

export default App
