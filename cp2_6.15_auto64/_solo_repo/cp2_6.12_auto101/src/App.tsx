import { useState, useRef, useCallback, createContext, useContext, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import GalaxyModule from './modules/GalaxyModule'
import ShipController from './modules/ShipController'
import EffectsModule from './modules/EffectsModule'
import ControlPanel from './components/ControlPanel'
import HUD from './components/HUD'
import * as THREE from 'three'

export interface GalaxyParams {
  armCount: number
  rotationSpeed: number
  particleScale: number
}

export interface ShipState {
  position: { x: number; y: number; z: number }
  speed: number
}

interface AppContextType {
  galaxyParams: GalaxyParams
  setGalaxyParams: (params: Partial<GalaxyParams>) => void
  shipState: ShipState
  setShipState: (state: ShipState) => void
  triggerSupernova: () => void
  supernovaPosition: THREE.Vector3 | null
  flashIntensity: number
  cameraShake: number
}

const AppContext = createContext<AppContextType | null>(null)

export const useAppContext = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

export default function App() {
  const [galaxyParams, setGalaxyParamsState] = useState<GalaxyParams>({
    armCount: 3,
    rotationSpeed: 0.5,
    particleScale: 1.0,
  })

  const [shipState, setShipState] = useState<ShipState>({
    position: { x: 0, y: 0, z: 0 },
    speed: 0,
  })

  const [supernovaPosition, setSupernovaPosition] = useState<THREE.Vector3 | null>(null)
  const [flashIntensity, setFlashIntensity] = useState(0)
  const [cameraShake, setCameraShake] = useState(0)

  const galaxyRef = useRef<{
    getRandomStar: () => { position: THREE.Vector3; index: number } | null
    highlightStar: (index: number) => void
    getStarPositions: () => Float32Array
  } | null>(null)

  const setGalaxyParams = useCallback((params: Partial<GalaxyParams>) => {
    setGalaxyParamsState(prev => ({ ...prev, ...params }))
  }, [])

  const triggerSupernova = useCallback(() => {
    if (!galaxyRef.current) return
    const star = galaxyRef.current.getRandomStar()
    if (!star) return

    setSupernovaPosition(star.position.clone())
    galaxyRef.current.highlightStar(star.index)

    setFlashIntensity(0.8)
    setCameraShake(0.02)

    const flashTimer = setInterval(() => {
      setFlashIntensity(prev => {
        const next = prev - 0.04
        if (next <= 0) {
          clearInterval(flashTimer)
          return 0
        }
        return next
      })
    }, 25)

    const shakeTimer = setInterval(() => {
      setCameraShake(prev => {
        const next = prev - 0.001
        if (next <= 0) {
          clearInterval(shakeTimer)
          return 0
        }
        return next
      })
    }, 30)

    setTimeout(() => {
      setSupernovaPosition(null)
    }, 2500)
  }, [])

  const contextValue = useMemo<AppContextType>(() => ({
    galaxyParams,
    setGalaxyParams,
    shipState,
    setShipState,
    triggerSupernova,
    supernovaPosition,
    flashIntensity,
    cameraShake,
  }), [galaxyParams, setGalaxyParams, shipState, triggerSupernova, supernovaPosition, flashIntensity, cameraShake])

  return (
    <AppContext.Provider value={contextValue}>
      <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#0a0a1a' }}>
        <Canvas
          camera={{
            fov: 75,
            near: 0.1,
            far: 2000,
          }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#0a0a1a']} />
          <fog attach="fog" args={['#0a0a1a', 30, 150]} />
          <ambientLight intensity={0.05} />

          <ShipController cameraShake={cameraShake} />
          <GalaxyModule ref={galaxyRef} />
          <EffectsModule />

          <EffectComposer>
            <Bloom
              intensity={1.2}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
          </EffectComposer>
        </Canvas>

        <HUD />
        <ControlPanel />

        {flashIntensity > 0 && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'white',
              opacity: flashIntensity,
              pointerEvents: 'none',
              zIndex: 100,
              transition: 'opacity 0.1s linear',
            }}
          />
        )}
      </div>
    </AppContext.Provider>
  )
}
