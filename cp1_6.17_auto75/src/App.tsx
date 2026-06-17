import { useState, useEffect, useRef } from 'react'
import { GrowthScene } from './components/GrowthScene'
import { ControlPanel } from './components/ControlPanel'
import { usePlantStore } from './store'
import { ParticleSystem } from './particle/ParticleSystem'

export function App() {
  const [isMobile, setIsMobile] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const particleSystemRef = useRef<ParticleSystem | null>(null)
  const animationIdRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  const {
    water,
    nutrient,
    light,
    growthProgress,
    currentStage,
    fruitSize,
    particleCount,
    updateGrowth,
    setParticleCount
  } = usePlantStore()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    particleSystemRef.current = new ParticleSystem()
    particleSystemRef.current.setWater(water)
    particleSystemRef.current.setNutrient(nutrient)

    return () => {
      particleSystemRef.current = null
    }
  }, [])

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setWater(water)
    }
  }, [water])

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setNutrient(nutrient)
    }
  }, [nutrient])

  useEffect(() => {
    const animate = (time: number) => {
      const deltaTime = Math.min((time - lastTimeRef.current) / 1000, 0.1)
      lastTimeRef.current = time

      updateGrowth(deltaTime)

      if (particleSystemRef.current) {
        const count = particleSystemRef.current.getParticleCount()
        if (count !== particleCount) {
          setParticleCount(count)
        }
      }

      animationIdRef.current = requestAnimationFrame(animate)
    }

    animationIdRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationIdRef.current)
    }
  }, [updateGrowth, setParticleCount, particleCount])

  const layoutStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    height: '100%',
    background: '#1A1A2E',
    overflow: 'hidden'
  }

  const sceneContainerStyle: React.CSSProperties = isMobile
    ? {
        flex: 1,
        position: 'relative',
        width: '100%',
        height: '100%'
      }
    : {
        flex: '0 0 70%',
        position: 'relative',
        height: '100%'
      }

  const panelContainerStyle: React.CSSProperties = isMobile
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none'
      }
    : {
        flex: '0 0 30%',
        padding: '20px',
        boxSizing: 'border-box',
        minWidth: '300px'
      }

  return (
    <div style={layoutStyle}>
      <div style={sceneContainerStyle}>
        <GrowthScene
          particleSystem={particleSystemRef.current}
          growthProgress={growthProgress}
          currentStage={currentStage}
          fruitSize={fruitSize}
          lightLevel={light}
        />

        {isMobile && (
          <button
            onClick={() => setIsPanelOpen(true)}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)',
              border: 'none',
              color: 'white',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              zIndex: 50
            }}
          >
            ☰
          </button>
        )}
      </div>

      <div style={panelContainerStyle}>
        <ControlPanel
          isMobile={isMobile}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
        />
      </div>
    </div>
  )
}
