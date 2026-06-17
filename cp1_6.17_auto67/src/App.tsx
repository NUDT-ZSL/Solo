import { useEffect, useRef, useState } from 'react'
import { GrowthScene } from './components/GrowthScene'
import { ControlPanel } from './components/ControlPanel'
import { ParticleSystem } from './particle/ParticleSystem'
import { usePlantStore } from './store'

function App() {
  const [particleCount, setParticleCount] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const particleSystemRef = useRef<ParticleSystem | null>(null)
  const animationRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const isFirstRenderRef = useRef<boolean>(true)

  const { water, nutrients, updateGrowth, loadSavedSnapshots, isPanelOpen, togglePanel } = usePlantStore()

  const stage = usePlantStore((state) => state.stage)
  const growthProgress = usePlantStore((state) => state.growthProgress)
  const light = usePlantStore((state) => state.light)

  useEffect(() => {
    particleSystemRef.current = new ParticleSystem({
      maxParticles: 200,
      particleLifetime: 5,
      emissionRate: 0.5,
      potRadius: 1.5,
      soilY: 0.5,
    })

    loadSavedSnapshots()

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    lastTimeRef.current = performance.now()
    const gameLoop = (time: number) => {
      const delta = Math.min((time - lastTimeRef.current) / 16.67, 3)
      lastTimeRef.current = time

      if (particleSystemRef.current) {
        particleSystemRef.current.setWaterLevel(usePlantStore.getState().water)
        particleSystemRef.current.setNutrientLevel(usePlantStore.getState().nutrients)
      }

      updateGrowth(delta * 16.67)

      animationRef.current = requestAnimationFrame(gameLoop)
    }
    animationRef.current = requestAnimationFrame(gameLoop)

    isFirstRenderRef.current = false

    return () => {
      window.removeEventListener('resize', checkMobile)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setWaterLevel(water)
    }
  }, [water])

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setNutrientLevel(nutrients)
    }
  }, [nutrients])

  useEffect(() => {
    if (isFirstRenderRef.current) return
    if (stage === 'seed' && growthProgress === 0 && particleSystemRef.current) {
      particleSystemRef.current.reset()
    }
  }, [stage, growthProgress])

  const handleParticleCountChange = (count: number) => {
    setParticleCount(count)
  }

  if (isMobile) {
    return (
      <div style={mobileContainerStyle}>
        <button style={hamburgerStyle} onClick={togglePanel}>
          ☰
        </button>

        <div style={mobileSceneStyle}>
          {particleSystemRef.current && (
            <GrowthScene
              particleSystem={particleSystemRef.current}
              stage={stage}
              growthProgress={growthProgress}
              light={light}
              onParticleCountChange={handleParticleCountChange}
            />
          )}
        </div>

        {isPanelOpen && (
          <>
            <div style={mobileOverlayStyle} onClick={togglePanel} />
            <div style={mobileDrawerStyle}>
              <ControlPanel particleCount={particleCount} />
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div style={appContainerStyle}>
      <div style={sceneContainerStyle}>
        {particleSystemRef.current && (
          <GrowthScene
            particleSystem={particleSystemRef.current}
            stage={stage}
            growthProgress={growthProgress}
            light={light}
            onParticleCountChange={handleParticleCountChange}
          />
        )}
      </div>

      <div style={panelContainerStyle}>
        <ControlPanel particleCount={particleCount} />
      </div>
    </div>
  )
}

const appContainerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  backgroundColor: '#1A1A2E',
  overflow: 'hidden',
  margin: 0,
  padding: 0,
}

const sceneContainerStyle: React.CSSProperties = {
  flex: '0 0 70%',
  height: '100%',
  position: 'relative',
}

const panelContainerStyle: React.CSSProperties = {
  flex: '0 0 30%',
  height: '100%',
  padding: '20px',
  boxSizing: 'border-box',
  minWidth: '300px',
}

const mobileContainerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  position: 'relative',
  backgroundColor: '#1A1A2E',
  overflow: 'hidden',
}

const mobileSceneStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
}

const hamburgerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  zIndex: 100,
  width: '44px',
  height: '44px',
  borderRadius: '8px',
  backgroundColor: 'rgba(22, 33, 62, 0.9)',
  color: '#fff',
  fontSize: '24px',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const mobileOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 200,
}

const mobileDrawerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '100%',
  maxHeight: '80vh',
  backgroundColor: '#16213E',
  borderRadius: '16px 16px 0 0',
  zIndex: 201,
  overflow: 'hidden',
  animation: 'slideUp 0.3s ease',
}

export default App
