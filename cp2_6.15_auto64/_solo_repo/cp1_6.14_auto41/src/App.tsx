import React, { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine, type GameState } from './GameEngine'
import { GameUI } from './UI'
import { LEVELS } from './LevelData'

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [echoCount, setEchoCount] = useState(0)
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!canvasRef.current) return

    const engine = new GameEngine(canvasRef.current)
    engineRef.current = engine

    engine.onStateChange = (state: GameState) => {
      setGameState({ ...state })
    }

    setGameState({ ...engine.state })
    engine.start()

    const uiTimer = setInterval(() => {
      if (engineRef.current) {
        setEchoCount(engineRef.current.getEchoCount())
        forceTick((t) => t + 1)
      }
    }, 100)

    return () => {
      clearInterval(uiTimer)
      engine.destroy()
    }
  }, [])

  const handleSelectLevel = useCallback((index: number) => {
    engineRef.current?.selectLevel(index)
  }, [])

  const handleGoToMenu = useCallback(() => {
    engineRef.current?.goToMenu()
  }, [])

  const handleUseHourglass = useCallback(() => {
    engineRef.current?.useHourglass()
  }, [])

  const currentLevel = gameState ? LEVELS[gameState.currentLevelIndex] : null
  const puzzleManager = engineRef.current?.puzzleManager
  const activatedCount = puzzleManager ? puzzleManager.countActivated() : 0
  const requiredCount = currentLevel?.requiredActivations ?? 0

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#0a0a1a',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />

      {gameState && (
        <GameUI
          gameState={gameState}
          onSelectLevel={handleSelectLevel}
          onGoToMenu={handleGoToMenu}
          onUseHourglass={handleUseHourglass}
          echoCount={echoCount}
          activatedCount={activatedCount}
          requiredCount={requiredCount}
          currentLevelName={currentLevel?.name ?? ''}
          currentLevelHint={currentLevel?.hint ?? ''}
        />
      )}
    </div>
  )
}

export default App
