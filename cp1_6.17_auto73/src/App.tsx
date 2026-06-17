import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  GameEngine,
  GRID_SIZE,
  CELL_SIZE,
  durationToFloors,
  type Building,
  type BuildingStyle
} from './GameEngine'
import { Toolbar, StylePreview, InfoPanel } from './UIComponents'

const GRID_WIDTH = GRID_SIZE * CELL_SIZE
const GRID_HEIGHT = GRID_SIZE * CELL_SIZE

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [currentStyle, setCurrentStyle] = useState<BuildingStyle>('residential')
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [styleTransitionKey, setStyleTransitionKey] = useState(0)
  const [pressProgress, setPressProgress] = useState<{
    visible: boolean
    x: number
    y: number
    progress: number
    floors: number
  } | null>(null)

  const pressStartRef = useRef<number>(0)
  const pressCellRef = useRef<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const buildingsRef = useRef<Building[]>([])
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    buildingsRef.current = buildings
  }, [buildings])

  useEffect(() => {
    const engine = new GameEngine(GRID_SIZE)
    engineRef.current = engine

    const unsubscribe = engine.subscribe((event) => {
      if (event.type === 'BUILDING_PLACED') {
        setBuildings((prev) => [...prev, event.building])
      } else if (event.type === 'STYLE_CHANGED') {
        setBuildings(event.buildings)
        setStyleTransitionKey((k) => k + 1)
      }
    })

    const state = engine.getState()
    setBuildings(state.buildings)
    setCurrentStyle(state.currentStyle)

    return unsubscribe
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = GRID_WIDTH
    canvas.height = GRID_HEIGHT

    ctx.fillStyle = '#C8B07B'
    ctx.fillRect(0, 0, GRID_WIDTH, GRID_HEIGHT)

    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 1

    for (let x = 0; x <= GRID_SIZE; x++) {
      ctx.beginPath()
      ctx.moveTo(x * CELL_SIZE + 0.5, 0)
      ctx.lineTo(x * CELL_SIZE + 0.5, GRID_HEIGHT)
      ctx.stroke()
    }

    for (let y = 0; y <= GRID_SIZE; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * CELL_SIZE + 0.5)
      ctx.lineTo(GRID_WIDTH, y * CELL_SIZE + 0.5)
      ctx.stroke()
    }
  }, [])

  const getCellFromEvent = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): { x: number; y: number } | null => {
      const target = e.currentTarget
      const rect = target.getBoundingClientRect()
      const x = Math.floor((e.clientX - rect.left) / CELL_SIZE)
      const y = Math.floor((e.clientY - rect.top) / CELL_SIZE)

      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
        return null
      }
      return { x, y }
    },
    []
  )

  const updatePressProgress = useCallback(() => {
    if (!pressCellRef.current) return

    const duration = Date.now() - pressStartRef.current
    const clampedDuration = Math.max(0, Math.min(3000, duration))
    const progress = Math.min(1, clampedDuration / 3000)
    const floors = durationToFloors(clampedDuration + 500)

    setPressProgress({
      visible: true,
      x: pressCellRef.current.x,
      y: pressCellRef.current.y,
      progress,
      floors
    })

    animationFrameRef.current = requestAnimationFrame(updatePressProgress)
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const cell = getCellFromEvent(e)
      if (!cell) return

      const existingBuilding = buildingsRef.current.find(
        (b) => b.x === cell.x && b.y === cell.y
      )

      if (existingBuilding) {
        setSelectedBuilding(existingBuilding)
        return
      }

      pressStartRef.current = Date.now()
      pressCellRef.current = cell
      isDraggingRef.current = false

      setPressProgress({
        visible: true,
        x: cell.x,
        y: cell.y,
        progress: 0,
        floors: 1
      })

      animationFrameRef.current = requestAnimationFrame(updatePressProgress)
    },
    [getCellFromEvent, updatePressProgress]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!pressCellRef.current) return

      const cell = getCellFromEvent(e)
      if (!cell) return

      if (
        cell.x !== pressCellRef.current.x ||
        cell.y !== pressCellRef.current.y
      ) {
        isDraggingRef.current = true
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
        setPressProgress(null)
      }
    },
    [getCellFromEvent]
  )

  const handleMouseUp = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (!pressCellRef.current) {
      setPressProgress(null)
      return
    }

    const duration = Date.now() - pressStartRef.current

    if (isDraggingRef.current) {
      pressCellRef.current = null
      setPressProgress(null)
      return
    }

    const { x, y } = pressCellRef.current
    const floors = durationToFloors(duration)

    if (engineRef.current?.canPlaceBuilding(x, y)) {
      engineRef.current?.placeBuilding(x, y, floors)
    }

    pressCellRef.current = null
    setPressProgress(null)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    pressCellRef.current = null
    isDraggingRef.current = false
    setPressProgress(null)
  }, [])

  const handleStyleSelect = useCallback((style: BuildingStyle) => {
    engineRef.current?.setCurrentStyle(style)
    setCurrentStyle(style)
  }, [])

  const handleApplyStyle = useCallback((style: BuildingStyle) => {
    engineRef.current?.setCurrentStyle(style)
    setCurrentStyle(style)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedBuilding(null)
  }, [])

  return (
    <div className="app-container">
      <div className="game-wrapper">
        <Toolbar
          currentStyle={currentStyle}
          onStyleSelect={handleStyleSelect}
          buildingCount={buildings.length}
        />

        <div className="center-panel">
          <div
            className="grid-container"
            style={{ width: GRID_WIDTH, height: GRID_HEIGHT }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <canvas
              ref={canvasRef}
              className="grid-canvas"
              style={{ width: GRID_WIDTH, height: GRID_HEIGHT }}
            />
            <div className="grid-overlay" />

            {buildings.map((building) => (
              <BuildingCell
                key={building.id}
                building={building}
                transitionKey={styleTransitionKey}
                onClick={() => setSelectedBuilding(building)}
              />
            ))}

            {pressProgress && pressProgress.visible && (
              <PressProgressIndicator
                x={pressProgress.x}
                y={pressProgress.y}
                progress={pressProgress.progress}
                floors={pressProgress.floors}
              />
            )}

            {selectedBuilding && (
              <InfoPanel
                building={selectedBuilding}
                onClose={handleClosePanel}
                styleName={engineRef.current?.getStyleName(selectedBuilding.style) || ''}
              />
            )}
          </div>
        </div>

        <StylePreview
          currentStyle={currentStyle}
          onApplyStyle={handleApplyStyle}
          hasBuildings={buildings.length > 0}
        />
      </div>
    </div>
  )
}

interface BuildingCellProps {
  building: Building
  transitionKey: number
  onClick: () => void
}

function BuildingCell({ building, transitionKey, onClick }: BuildingCellProps) {
  const color = GameEngine.floorsToColor(building.floors, building.style)
  const buildingHeight = CELL_SIZE * 0.3 + building.floors * (CELL_SIZE * 0.45)
  const top = building.y * CELL_SIZE + (CELL_SIZE - buildingHeight)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick()
  }

  return (
    <div
      className="building-cell"
      style={{
        left: building.x * CELL_SIZE,
        top,
        width: CELL_SIZE,
        height: buildingHeight,
        animationDelay: '0s'
      }}
      onClick={handleClick}
    >
      <div
        key={`${building.id}-${transitionKey}`}
        className="building-block"
        style={{
          backgroundColor: color,
          transition: 'background-color 0.5s ease'
        }}
      />
      <div className="floors-indicator">{building.floors}层</div>
    </div>
  )
}

interface PressProgressIndicatorProps {
  x: number
  y: number
  progress: number
  floors: number
}

function PressProgressIndicator({ x, y, progress, floors }: PressProgressIndicatorProps) {
  const centerX = x * CELL_SIZE + CELL_SIZE / 2
  const centerY = y * CELL_SIZE + CELL_SIZE / 2
  const radius = 12
  const circumference = 2 * Math.PI * radius
  const offset = circumference - progress * circumference

  const color = progress < 0.5 ? '#8BC34A' : progress < 0.85 ? '#FF9800' : '#D32F2F'

  return (
    <div
      className="press-progress"
      style={{
        left: centerX - 20,
        top: centerY - 20,
        width: 40,
        height: 40
      }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 20 20)"
          style={{ transition: 'stroke 0.1s ease' }}
        />
      </svg>
      <div className="press-progress-text" style={{ color }}>
        {floors}
      </div>
    </div>
  )
}
