import { useState, useEffect, useCallback } from 'react'
import PrismScene from './components/PrismScene'
import UIOverlay from './components/UIOverlay'

export type LightMode = 'white' | 'colorful' | 'gradient'

export default function App() {
  const [lightMode, setLightMode] = useState<LightMode>('white')
  const [bloomEnabled, setBloomEnabled] = useState(true)
  const [resetKey, setResetKey] = useState(0)
  const [fps, setFps] = useState(0)
  const [particleCount, setParticleCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleResetView = useCallback(() => {
    setResetKey(k => k + 1)
  }, [])

  const handleToggleBloom = useCallback(() => {
    setBloomEnabled(v => !v)
  }, [])

  const handleToggleLightMode = useCallback(() => {
    setLightMode(m => {
      if (m === 'white') return 'colorful'
      if (m === 'colorful') return 'gradient'
      return 'white'
    })
  }, [])

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.sceneWrapper,
        transform: mounted ? 'scale(1)' : 'scale(0.8)',
        opacity: mounted ? 1 : 0,
      }}>
        <PrismScene
          key={resetKey}
          lightMode={lightMode}
          bloomEnabled={bloomEnabled}
          onFpsUpdate={setFps}
          onParticleCount={setParticleCount}
        />
      </div>
      <UIOverlay
        lightMode={lightMode}
        bloomEnabled={bloomEnabled}
        fps={fps}
        particleCount={particleCount}
        mounted={mounted}
        onResetView={handleResetView}
        onToggleLightMode={handleToggleLightMode}
        onToggleBloom={handleToggleBloom}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    minWidth: '1024px',
    background: 'linear-gradient(180deg, #0B0E1A 0%, #05070D 100%)',
    overflow: 'hidden',
  },
  sceneWrapper: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    height: '100%',
    transition: 'transform 1s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 1s ease',
  },
}
