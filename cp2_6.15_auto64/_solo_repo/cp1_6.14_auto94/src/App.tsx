import React, { useState, useCallback, useEffect } from 'react'
import { plants, type Plant, type Season } from './plantData'
import PlantSelector from './components/PlantSelector'
import SceneContainer from './components/SceneContainer'
import type { PlacedPlant } from './components/SceneContainer'
import SeasonSelector from './components/SeasonSelector'

const App: React.FC = () => {
  const [selectedPlants, setSelectedPlants] = useState<PlacedPlant[]>([])
  const [history, setHistory] = useState<string[][]>([])
  const [season, setSeason] = useState<Season>('spring')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const generatePosition = useCallback((): [number, number, number] => {
    const x = (Math.random() - 0.5) * 16
    const z = (Math.random() - 0.5) * 16
    return [x, 0, z]
  }, [])

  const handleSelect = useCallback((plant: Plant) => {
    const instanceId = `${plant.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const position = generatePosition()
    const newPlaced: PlacedPlant = { plant, instanceId, position }

    setSelectedPlants((prev) => {
      const next = [...prev, newPlaced]
      if (next.length > 30) {
        return next.slice(-30)
      }
      return next
    })

    setHistory((prev) => [...prev, selectedPlants.map((p) => p.instanceId)])
  }, [generatePosition, selectedPlants])

  const handleClearAll = useCallback(() => {
    setHistory((prev) => [...prev, selectedPlants.map((p) => p.instanceId)])
    setSelectedPlants([])
  }, [selectedPlants])

  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    const prevIds = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setSelectedPlants((current) => {
      return current.filter((p) => prevIds.includes(p.instanceId))
    })
  }, [history])

  const selectedIds = selectedPlants.map((p) => p.plant.id)

  if (isMobile) {
    return (
      <div style={styles.mobileContainer}>
        <div style={styles.mobileTop}>
          <PlantSelector
            plants={plants}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onClearAll={handleClearAll}
            onUndo={handleUndo}
            canUndo={history.length > 0}
          />
        </div>
        <div style={styles.mobileScene}>
          <div style={styles.seasonBar}>
            <SeasonSelector season={season} onChange={setSeason} />
          </div>
          <React.Suspense fallback={<div style={styles.loading}>加载3D场景...</div>}>
            <SceneContainer selectedPlants={selectedPlants} season={season} />
          </React.Suspense>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <PlantSelector
          plants={plants}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onClearAll={handleClearAll}
          onUndo={handleUndo}
          canUndo={history.length > 0}
        />
      </div>
      <div style={styles.main}>
        <div style={styles.seasonBar}>
          <SeasonSelector season={season} onChange={setSeason} />
        </div>
        <div style={styles.sceneWrapper}>
          <React.Suspense fallback={<div style={styles.loading}>加载3D场景...</div>}>
            <SceneContainer selectedPlants={selectedPlants} season={season} />
          </React.Suspense>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: '#f0f4f0',
    overflow: 'hidden'
  },
  sidebar: {
    width: 240,
    flexShrink: 0,
    padding: 12,
    height: '100%'
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 12px 12px 0',
    height: '100%',
    overflow: 'hidden'
  },
  seasonBar: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 12,
    zIndex: 5,
    position: 'relative'
  },
  sceneWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#636e72',
    fontSize: 16
  },
  mobileContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    background: '#f0f4f0',
    overflow: 'hidden'
  },
  mobileTop: {
    height: 56,
    flexShrink: 0,
    overflow: 'hidden'
  },
  mobileScene: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '0 8px 8px'
  }
}

export default App
