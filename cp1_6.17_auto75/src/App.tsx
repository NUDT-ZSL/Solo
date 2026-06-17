import { useState, useEffect, useRef } from 'react'
import { GrowthScene } from './components/GrowthScene'
import { ControlPanel } from './components/ControlPanel'
import { usePlantStore } from './store'
import { ParticleSystem } from './particle/ParticleSystem'

export function App() {
  const [isMobile, setIsMobile] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [showError, setShowError] = useState(false)
  const particleSystemRef = useRef<ParticleSystem | null>(null)
  const animationIdRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const hasLoadedRef = useRef(false)
  const prevProgressRef = useRef(0)

  const {
    water,
    nutrient,
    light,
    growthProgress,
    currentStage,
    fruitSize,
    particleCount,
    errorMessage,
    updateGrowth,
    setParticleCount,
    resetPlant,
    getSnapshots,
    getErrorMessage,
    clearErrorMessage
  } = usePlantStore()

  useEffect(() => {
    if (errorMessage) {
      setShowError(true)
      const timer = setTimeout(() => {
        setShowError(false)
        clearErrorMessage()
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage, clearErrorMessage])

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

    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      try {
        const snapshots = getSnapshots()
        const existingSnapshot = snapshots.find(s => s.exists)
        if (existingSnapshot) {
          const { loadSnapshot } = usePlantStore.getState()
          const result = loadSnapshot(existingSnapshot.index)
          if (!result.success) {
            console.warn('快照加载失败，使用默认状态:', result.message)
            particleSystemRef.current.setWater(50)
            particleSystemRef.current.setNutrient(30)
          } else {
            const state = usePlantStore.getState()
            particleSystemRef.current.setWater(state.water)
            particleSystemRef.current.setNutrient(state.nutrient)
          }
        } else {
          particleSystemRef.current.setWater(water)
          particleSystemRef.current.setNutrient(nutrient)
        }
      } catch (e) {
        console.warn('加载快照时出错，使用默认状态')
        particleSystemRef.current.setWater(50)
        particleSystemRef.current.setNutrient(30)
      }
    }

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
    if (prevProgressRef.current > 0 && growthProgress === 0) {
      if (particleSystemRef.current) {
        particleSystemRef.current.reset()
        particleSystemRef.current.setWater(50)
        particleSystemRef.current.setNutrient(30)
      }
    }
    prevProgressRef.current = growthProgress
  }, [growthProgress])

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

      {showError && errorMessage && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(220, 38, 38, 0.95)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            zIndex: 1000,
            fontSize: '14px',
            maxWidth: '400px',
            textAlign: 'center',
            animation: 'slideDown 0.3s ease'
          }}
        >
          ⚠️ {errorMessage}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
