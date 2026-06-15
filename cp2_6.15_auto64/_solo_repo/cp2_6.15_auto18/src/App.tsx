import React, { useEffect, useRef, useState } from 'react'
import { SceneManager } from './modules/RenderingEngine/SceneManager'
import type { FrameData } from './modules/RenderingEngine/SceneManager'
import { UiOverlay, CollisionPulse } from './modules/RenderingEngine/UiOverlay'
import { SimulationController } from './modules/SimulationEngine/SimulationController'
import type { Galaxy, GalaxyType, SimulationParams } from './constants'
import { createGalaxy, DEFAULT_SIMULATION_PARAMS } from './constants'

export default function App() {
  const sceneContainerRef = useRef<HTMLDivElement>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)
  const simControllerRef = useRef<SimulationController | null>(null)

  const [galaxies, setGalaxies] = useState<Galaxy[]>([])
  const [selectedGalaxyIds, setSelectedGalaxyIds] = useState<string[]>([])
  const [params, setParams] = useState<SimulationParams>({ ...DEFAULT_SIMULATION_PARAMS })
  const [paused, setPaused] = useState(false)
  const [placementMode, setPlacementMode] = useState<GalaxyType | null>(null)
  const [collisionActive, setCollisionActive] = useState(false)
  const [collisionFlash, setCollisionFlash] = useState(false)
  const [totalParticles, setTotalParticles] = useState(0)
  const placementModeRef = useRef<GalaxyType | null>(null)

  useEffect(() => {
    if (!sceneContainerRef.current) return

    const scene = new SceneManager(sceneContainerRef.current)
    sceneManagerRef.current = scene

    const sim = new SimulationController()
    simControllerRef.current = sim
    sim.init([], DEFAULT_SIMULATION_PARAMS)

    sim.onFrame((data: FrameData) => {
      scene.updateFromFrameData(data)
      if (data.totalParticles !== totalParticles) {
        setTotalParticles(data.totalParticles)
      }
    })

    sim.onCollisionStart(() => {
      setCollisionActive(true)
      setCollisionFlash(true)
      setTimeout(() => setCollisionFlash(false), 800)
    })

    sim.onCollisionComplete(() => {
      setCollisionActive(false)
      setSelectedGalaxyIds([])
    })

    scene.setPlacementCallback((type, position) => {
      const galaxy = createGalaxy(type, position, 1.0)
      setGalaxies(prev => {
        const next = [...prev, galaxy]
        sim.addGalaxy(galaxy)
        scene.addGalaxyRender(galaxy)
        return next
      })
      setPlacementMode(null)
      placementModeRef.current = null
      scene.cancelPlacementMode()
    })

    scene.setGalaxySelectedCallback((galaxyId) => {
      setSelectedGalaxyIds(prev => {
        if (prev.includes(galaxyId)) {
          const next = prev.filter(id => id !== galaxyId)
          scene.setSelectedGalaxyIds(next)
          return next
        } else {
          const next = [...prev, galaxyId].slice(-2)
          scene.setSelectedGalaxyIds(next)
          return next
        }
      })
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && placementModeRef.current) {
        setPlacementMode(null)
        placementModeRef.current = null
        scene.cancelPlacementMode()
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        handleTogglePause()
      }
    }
    window.addEventListener('keydown', onKey)

    const handleTogglePause = () => {
      setPaused(p => {
        const willPaused = !p
        if (willPaused) {
          sim.pause()
        } else {
          sim.resume()
        }
        return willPaused
      })
    }

    window.addEventListener('contextmenu', (e) => {
      if (placementModeRef.current) {
        e.preventDefault()
        setPlacementMode(null)
        placementModeRef.current = null
        scene.cancelPlacementMode()
      }
    })

    return () => {
      window.removeEventListener('keydown', onKey)
      sim.destroy()
      scene.destroy()
    }
  }, [])

  useEffect(() => {
    placementModeRef.current = placementMode
  }, [placementMode])

  const handleSelectGalaxy = (id: string) => {
    setSelectedGalaxyIds(prev => {
      let next: string[]
      if (prev.includes(id)) {
        next = prev.filter(x => x !== id)
      } else {
        next = [...prev, id].slice(-2)
      }
      if (sceneManagerRef.current) {
        sceneManagerRef.current.setSelectedGalaxyIds(next)
      }
      return next
    })
  }

  const handleRemoveGalaxy = (id: string) => {
    setGalaxies(prev => {
      const next = prev.filter(g => g.id !== id)
      let tp = 0
      for (const g of next) tp += g.particleCount
      setTotalParticles(tp)
      return next
    })
    setSelectedGalaxyIds(prev => {
      const next = prev.filter(x => x !== id)
      if (sceneManagerRef.current) {
        sceneManagerRef.current.setSelectedGalaxyIds(next)
        sceneManagerRef.current.removeGalaxyRender(id)
      }
      return next
    })
  }

  const handleStartPlacement = (type: GalaxyType) => {
    setPlacementMode(type)
    placementModeRef.current = type
    if (sceneManagerRef.current) {
      sceneManagerRef.current.startPlacementMode(type)
    }
  }

  const handleCancelPlacement = () => {
    setPlacementMode(null)
    placementModeRef.current = null
    if (sceneManagerRef.current) {
      sceneManagerRef.current.cancelPlacementMode()
    }
  }

  const handleStartCollision = () => {
    if (selectedGalaxyIds.length !== 2) return
    if (simControllerRef.current) {
      simControllerRef.current.startCollision([selectedGalaxyIds[0], selectedGalaxyIds[1]])
    }
  }

  const handleUpdateParams = (p: Partial<SimulationParams>) => {
    setParams(prev => {
      const next = { ...prev, ...p }
      if (simControllerRef.current) {
        simControllerRef.current.updateParams(p)
      }
      return next
    })
  }

  const handleTogglePause = () => {
    setPaused(prev => {
      const will = !prev
      if (simControllerRef.current) {
        if (will) simControllerRef.current.pause()
        else simControllerRef.current.resume()
      }
      return will
    })
  }

  const handleReset = () => {
    setGalaxies([])
    setSelectedGalaxyIds([])
    setTotalParticles(0)
    setParams({ ...DEFAULT_SIMULATION_PARAMS })
    setCollisionActive(false)
    if (simControllerRef.current) {
      simControllerRef.current.destroy()
      const sim = new SimulationController()
      simControllerRef.current = sim
      sim.init([], params)
      sim.onFrame((data: FrameData) => {
        if (sceneManagerRef.current) {
          sceneManagerRef.current.updateFromFrameData(data)
        }
        if (data.totalParticles !== totalParticles) {
          setTotalParticles(data.totalParticles)
        }
      })
      sim.onCollisionStart(() => {
        setCollisionActive(true)
        setCollisionFlash(true)
        setTimeout(() => setCollisionFlash(false), 800)
      })
      sim.onCollisionComplete(() => {
        setCollisionActive(false)
        setSelectedGalaxyIds([])
      })
    }
    if (sceneManagerRef.current) {
      sceneManagerRef.current.reset()
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div
        ref={sceneContainerRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      <UiOverlay
        galaxies={galaxies}
        selectedGalaxyIds={selectedGalaxyIds}
        params={params}
        paused={paused}
        placementMode={placementMode}
        collisionActive={collisionActive}
        totalParticles={totalParticles}
        onTogglePause={handleTogglePause}
        onSelectGalaxy={handleSelectGalaxy}
        onStartPlacement={handleStartPlacement}
        onCancelPlacement={handleCancelPlacement}
        onRemoveGalaxy={handleRemoveGalaxy}
        onStartCollision={handleStartCollision}
        onUpdateParams={handleUpdateParams}
        onReset={handleReset}
      />
      <CollisionPulse active={collisionFlash} />
    </div>
  )
}
