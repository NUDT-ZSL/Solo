import { useState, useRef, useEffect, useCallback } from 'react'
import { SimulationEngine } from './physics/SimulationEngine'
import { WaveSceneRenderer } from './scene/WaveSceneRenderer'
import { ControlPanel } from './controls/ControlPanel'
import type { SimulationParams, ParticleState, AppConfig } from './types'

interface AppProps {
  config: AppConfig
}

function App({ config }: AppProps) {
  const [params, setParams] = useState<SimulationParams>({
    frequency: config.baseFrequency,
    anisotropyStrength: 1.0,
    waveType: 'P',
    isRunning: false,
  })

  const [particleState, setParticleState] = useState<ParticleState | null>(null)
  const [particleCount, setParticleCount] = useState<number>(2000)
  const [currentFps, setCurrentFps] = useState<number>(60)

  const simulationEngineRef = useRef<SimulationEngine>(new SimulationEngine(2000))
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(performance.now())

  const handleFrequencyChange = useCallback((value: number) => {
    setParams((prev) => ({ ...prev, frequency: value }))
  }, [])

  const handleAnisotropyChange = useCallback((value: number) => {
    setParams((prev) => ({ ...prev, anisotropyStrength: value }))
  }, [])

  const handleWaveTypeChange = useCallback((value: 'P' | 'S') => {
    setParams((prev) => ({ ...prev, waveType: value }))
  }, [])

  const handleToggleRunning = useCallback(() => {
    setParams((prev) => ({ ...prev, isRunning: !prev.isRunning }))
  }, [])

  useEffect(() => {
    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = currentTime

      const engine = simulationEngineRef.current
      const output = engine.update(deltaTime, params)

      setParticleState(output.particles)
      setParticleCount(output.particleCount)
      setCurrentFps(engine.getCurrentFps())

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    lastTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [params])

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#0a0e27',
      }}
    >
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <WaveSceneRenderer
          particleState={particleState}
          particleCount={particleCount}
        />
      </div>
      <div
        style={{
          width: '320px',
          flexShrink: 0,
          padding: '16px',
          boxSizing: 'border-box',
        }}
      >
        <ControlPanel
          params={params}
          onFrequencyChange={handleFrequencyChange}
          onAnisotropyChange={handleAnisotropyChange}
          onWaveTypeChange={handleWaveTypeChange}
          onToggleRunning={handleToggleRunning}
          currentFps={currentFps}
          particleCount={particleCount}
        />
      </div>
    </div>
  )
}

export default App
