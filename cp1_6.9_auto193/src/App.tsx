import React, { useState, useEffect, useRef, useCallback } from 'react'
import Scene from './components/Scene'
import UI from './components/UI'
import type { SandParticle } from './utils/physics'
import { generateInitialTerrain } from './utils/physics'
import { exportTerrain, importTerrain, triggerFileInput } from './utils/io'

const App: React.FC = () => {
  const initialParticles = useRef<SandParticle[]>(generateInitialTerrain())
  const [particles, setParticles] = useState<SandParticle[]>(initialParticles.current)
  const [brushSize, setBrushSize] = useState<number>(8)
  const [fps, setFps] = useState<number>(60)
  const [isResetting, setIsResetting] = useState(false)
  const [resetProgress, setResetProgress] = useState(0)
  const resetAnimRef = useRef<number | null>(null)

  const handleReset = useCallback(() => {
    if (isResetting) return
    setIsResetting(true)
    setResetProgress(0)

    const startTime = performance.now()
    const duration = 500

    const animate = () => {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      setResetProgress(t)

      if (t < 1) {
        resetAnimRef.current = requestAnimationFrame(animate)
      } else {
        initialParticles.current = generateInitialTerrain()
        setParticles(initialParticles.current.map(p => ({ ...p })))
        setIsResetting(false)
        setResetProgress(0)
      }
    }

    resetAnimRef.current = requestAnimationFrame(animate)
  }, [isResetting])

  const handleSave = useCallback(() => {
    exportTerrain(particles)
  }, [particles])

  const handleLoad = useCallback(async () => {
    try {
      const file = await triggerFileInput()
      const loadedParticles = await importTerrain(file)
      setParticles(loadedParticles)
      initialParticles.current = loadedParticles.map(p => ({ ...p, x: p.initialX, y: p.initialY, z: p.initialZ }))
    } catch (e) {
      console.error('Load failed:', e)
    }
  }, [])

  const handleFPSUpdate = useCallback((newFps: number) => {
    setFps(newFps)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      switch (e.key.toLowerCase()) {
        case 'r':
          handleReset()
          break
        case 's':
          handleSave()
          break
        case 'l':
          handleLoad()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleReset, handleSave, handleLoad])

  useEffect(() => {
    return () => {
      if (resetAnimRef.current !== null) {
        cancelAnimationFrame(resetAnimRef.current)
      }
    }
  }, [])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
        }}
      >
        <Scene
          particles={particles}
          setParticles={setParticles}
          brushSize={brushSize}
          isResetting={isResetting}
          resetProgress={resetProgress}
          initialParticles={initialParticles.current}
          onFPSUpdate={handleFPSUpdate}
        />
      </div>

      <UI
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        onReset={handleReset}
        onSave={handleSave}
        onLoad={handleLoad}
        fps={fps}
      />
    </div>
  )
}

export default App
