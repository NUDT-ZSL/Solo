import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import FloatingParticles, { ParticleClickInfo } from './components/FloatingParticles'
import {
  EmotionData,
  EmotionDataGenerator,
  createInitialData
} from './utils/emotionDataGenerator'

interface ClickLabel {
  id: string
  screenX: number
  screenY: number
  type: string
  intensity: number
  color: string
  startTime: number
  worldPos: THREE.Vector3
}

const ControlsManager: React.FC<{
  controlsRef: React.MutableRefObject<any>
  resetTrigger: number
}> = ({ controlsRef, resetTrigger }) => {
  const { camera } = useThree()

  useEffect(() => {
    if (resetTrigger > 0 && controlsRef.current) {
      camera.position.set(0, 5, 10)
      camera.lookAt(0, 0, 0)
      controlsRef.current.reset()
      controlsRef.current.update()
    }
  }, [resetTrigger, camera, controlsRef])

  return null
}

const ClickLabels: React.FC<{
  labels: ClickLabel[]
}> = ({ labels }) => {
  const { camera, gl } = useThree()
  const [, forceUpdate] = useState(0)

  useFrame(() => {
    forceUpdate(n => n + 1)
  })

  const projectToScreen = useCallback((worldPos: THREE.Vector3): { x: number; y: number } => {
    const vec = worldPos.clone().project(camera)
    const rect = gl.domElement.getBoundingClientRect()
    return {
      x: (vec.x * 0.5 + 0.5) * rect.width,
      y: (-vec.y * 0.5 + 0.5) * rect.height
    }
  }, [camera, gl])

  return (
    <>
      {labels.map(label => {
        const now = performance.now()
        const age = (now - label.startTime) / 1500
        if (age >= 1) return null
        const pos = projectToScreen(label.worldPos)
        const opacity = age < 0.1 ? age / 0.1 : age > 0.8 ? (1 - age) / 0.2 : 1
        const yOffset = age * 30

        return (
          <div
            key={label.id}
            className="click-label"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y - yOffset}px`,
              opacity,
              borderColor: label.color,
              boxShadow: `0 0 12px ${label.color}55`
            }}
          >
            <span className="label-type" style={{ color: label.color }}>
              {label.type}
            </span>
            <span className="label-intensity">
              强度 {label.intensity.toFixed(2)}
            </span>
          </div>
        )
      })}
    </>
  )
}

const Scene: React.FC<{
  data: EmotionData[]
  paused: boolean
  onParticleClick: (info: ParticleClickInfo) => void
  controlsRef: React.MutableRefObject<any>
  resetTrigger: number
  clickLabels: ClickLabel[]
}> = ({ data, paused, onParticleClick, controlsRef, resetTrigger, clickLabels }) => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.6} />
      <FloatingParticles data={data} onParticleClick={onParticleClick} paused={paused} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        minDistance={5}
        maxDistance={20}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        enableDamping
        dampingFactor={0.08}
      />
      <ControlsManager controlsRef={controlsRef} resetTrigger={resetTrigger} />
      <ClickLabels labels={clickLabels} />
    </>
  )
}

const App: React.FC = () => {
  const [data, setData] = useState<EmotionData[]>([])
  const [paused, setPaused] = useState(false)
  const [resetTrigger, setResetTrigger] = useState(0)
  const [particleCount, setParticleCount] = useState(0)
  const [avgIntensity, setAvgIntensity] = useState(0)
  const [clickLabels, setClickLabels] = useState<ClickLabel[]>([])
  const controlsRef = useRef<any>(null)
  const generatorRef = useRef<EmotionDataGenerator | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [, forceRender] = useState(0)

  const handleAdd = useCallback((item: EmotionData) => {
    setData(prev => [...prev, item])
  }, [])

  const handleRemove = useCallback((id: string) => {
    setData(prev => prev.filter(d => d.id !== id))
  }, [])

  useEffect(() => {
    const initial = createInitialData(50)
    setData(initial)
    setParticleCount(initial.length)

    const generator = new EmotionDataGenerator(200, {
      onAdd: handleAdd,
      onRemove: handleRemove
    })
    generator.init(initial)
    generator.start()
    generatorRef.current = generator

    return () => {
      generator.destroy()
    }
  }, [handleAdd, handleRemove])

  useEffect(() => {
    if (!generatorRef.current) return
    if (paused) {
      generatorRef.current.pause()
    } else {
      generatorRef.current.resume()
    }
  }, [paused])

  useEffect(() => {
    setParticleCount(data.length)
  }, [data])

  useEffect(() => {
    const interval = setInterval(() => {
      if (data.length === 0) {
        setAvgIntensity(0)
        return
      }
      const sum = data.reduce((acc, d) => acc + d.intensity, 0)
      setAvgIntensity(sum / data.length)
    }, 1000)
    return () => clearInterval(interval)
  }, [data])

  const handleParticleClick = useCallback((info: ParticleClickInfo) => {
    const labelId = `label-${Date.now()}-${Math.random()}`
    setClickLabels(prev => [
      ...prev,
      {
        id: labelId,
        screenX: 0,
        screenY: 0,
        type: info.type,
        intensity: info.intensity,
        color: info.color,
        startTime: performance.now(),
        worldPos: info.position
      }
    ])
    setTimeout(() => {
      setClickLabels(prev => prev.filter(l => l.id !== labelId))
    }, 1600)
  }, [])

  const handleReset = () => {
    setResetTrigger(t => t + 1)
  }

  const handleTogglePause = () => {
    setPaused(p => !p)
  }

  useEffect(() => {
    const onResize = () => forceRender(n => n + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const avgIntensityPercent = useMemo(() => Math.min(100, Math.max(0, avgIntensity * 100)), [avgIntensity])

  return (
    <div className="app-container" ref={containerRef}>
      <div className="top-bar">
        <div className="glass-panel particle-count-panel">
          <span className="particle-count">{particleCount}</span>
          <span className="particle-suffix">颗情感浮标</span>
        </div>
        <div className="top-buttons">
          <button className="glass-button" onClick={handleReset}>
            重置视角
          </button>
          <button
            className={`glass-button ${paused ? 'active' : ''}`}
            onClick={handleTogglePause}
          >
            {paused ? '恢复注入' : '暂停注入'}
          </button>
        </div>
      </div>

      <div className="canvas-container" ref={canvasContainerRef}>
        <Canvas
          camera={{ position: [0, 5, 10], fov: 60, near: 0.1, far: 1000 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <color attach="background" args={[0x0a0a2a]} />
          <fog attach="fog" args={[0x0a0a2a, 15, 35]} />
          <Scene
            data={data}
            paused={paused}
            onParticleClick={handleParticleClick}
            controlsRef={controlsRef}
            resetTrigger={resetTrigger}
            clickLabels={clickLabels}
          />
        </Canvas>
      </div>

      <div className="bottom-bar">
        <div className="gradient-bar-wrapper">
          <div className="gradient-bar">
            <div
              className="gradient-indicator"
              style={{ left: `${avgIntensityPercent}%` }}
            />
          </div>
          <div className="gradient-labels">
            <span style={{ color: '#00BFFF' }}>消极</span>
            <span style={{ color: '#FFA500' }}>中性</span>
            <span style={{ color: '#DC143C' }}>强烈</span>
          </div>
        </div>
        <div className="avg-intensity">
          平均情感强度：<span className="avg-value">{avgIntensity.toFixed(2)}</span>
        </div>
      </div>

      <BackgroundGradient />
    </div>
  )
}

const BackgroundGradient: React.FC = () => (
  <div className="bg-gradient" />
)

export default App
