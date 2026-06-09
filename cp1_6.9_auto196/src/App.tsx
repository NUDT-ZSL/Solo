import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import TerrainView from './TerrainView'
import UIOverlay from './UIOverlay'
import {
  PlantType,
  CellData,
  TerrainData,
  generateTerrainData,
  interpolateTerrainData,
} from './terrainGenerator'

const App: React.FC = () => {
  const [plantType, setPlantType] = useState<PlantType>('ginkgo')
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null)
  const [highlightedCellId, setHighlightedCellId] = useState<number | null>(null)
  const [transitionProgress, setTransitionProgress] = useState<number>(1)

  const targetPlantRef = useRef<PlantType>('ginkgo')
  const sourceTerrainRef = useRef<TerrainData | null>(null)
  const targetTerrainRef = useRef<TerrainData | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const initialTerrain = useMemo(
    () => generateTerrainData('ginkgo', 42),
    []
  )

  const [displayTerrain, setDisplayTerrain] = useState<TerrainData>(initialTerrain)

  const TRANSITION_DURATION = 1000

  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  const runTransition = useCallback(
    (from: TerrainData, to: TerrainData) => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }

      sourceTerrainRef.current = from
      targetTerrainRef.current = to
      startTimeRef.current = performance.now()
      setTransitionProgress(0)

      const animate = () => {
        const elapsed = performance.now() - startTimeRef.current
        const rawProgress = Math.min(1, elapsed / TRANSITION_DURATION)
        const easedProgress = easeInOutCubic(rawProgress)

        if (sourceTerrainRef.current && targetTerrainRef.current) {
          const interpolated = interpolateTerrainData(
            sourceTerrainRef.current,
            targetTerrainRef.current,
            easedProgress
          )
          setDisplayTerrain(interpolated)
        }

        setTransitionProgress(rawProgress)

        if (rawProgress < 1) {
          animFrameRef.current = requestAnimationFrame(animate)
        } else {
          if (targetTerrainRef.current) {
            setDisplayTerrain(targetTerrainRef.current)
          }
          animFrameRef.current = null
        }
      }

      animFrameRef.current = requestAnimationFrame(animate)
    },
    []
  )

  const handlePlantChange = useCallback(
    (newType: PlantType) => {
      if (newType === plantType) return

      targetPlantRef.current = newType
      const newTerrain = generateTerrainData(newType, Date.now() & 0xffff)
      const currentTerrain = displayTerrain

      setPlantType(newType)
      setSelectedCell(null)
      setHighlightedCellId(null)
      runTransition(currentTerrain, newTerrain)
    },
    [plantType, displayTerrain, runTransition]
  )

  const handleCellClick = useCallback((cell: CellData) => {
    setSelectedCell(cell)
    setHighlightedCellId(cell.id)

    window.setTimeout(() => {
      setHighlightedCellId((prev) => (prev === cell.id ? null : prev))
    }, 1500)
  }, [])

  const handleResetView = useCallback(() => {
    setZoomLevel(1)
    setSelectedCell(null)
    setHighlightedCellId(null)
  }, [])

  const handleZoomChange = useCallback((zoom: number) => {
    setZoomLevel(zoom)
  }, [])

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0B0C10 0%, #1F2833 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 60% at 50% 40%, rgba(100, 181, 246, 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 30% 70%, rgba(255, 215, 0, 0.03) 0%, transparent 50%),
            radial-gradient(ellipse 50% 50% at 70% 80%, rgba(255, 138, 101, 0.04) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(100, 181, 246, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100, 181, 246, 0.015) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'absolute', inset: 0 }}>
        <TerrainView
          terrainData={displayTerrain}
          highlightedCellId={highlightedCellId}
          onCellClick={handleCellClick}
          zoomLevel={zoomLevel}
          onZoomChange={handleZoomChange}
        />
      </div>

      <UIOverlay
        plantType={plantType}
        onPlantChange={handlePlantChange}
        zoomLevel={zoomLevel}
        selectedCell={selectedCell}
        onResetView={handleResetView}
      />

      {transitionProgress < 1 && transitionProgress > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          <div
            style={{
              width: 200,
              height: 2,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${transitionProgress * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #64B5F6, #FFD700)',
                transition: 'width 0.05s linear',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
