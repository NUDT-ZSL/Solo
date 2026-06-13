import React, { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine, GameEngineState } from './game/GameEngine'
import { HUD } from './ui/HUD'
import { Inventory } from './ui/Inventory'
import { PuzzleModal } from './ui/PuzzleModal'
import { WinScreen } from './ui/WinScreen'
import { StartScreen } from './ui/StartScreen'
import { InteractionHint } from './ui/InteractionHint'
import { COLORS } from './game/constants'

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameEngineRef = useRef<GameEngine | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameState, setGameState] = useState<GameEngineState | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [hintText, setHintText] = useState('')

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const initGame = useCallback(() => {
    if (!canvasRef.current || gameEngineRef.current) return

    const engine = new GameEngine(canvasRef.current)
    gameEngineRef.current = engine

    engine.addListener((state) => {
      setGameState({ ...state })
    })

    setGameState(engine.getState())
    engine.start()
  }, [])

  useEffect(() => {
    if (gameStarted && canvasRef.current) {
      initGame()
      return () => {
        if (gameEngineRef.current) {
          gameEngineRef.current.stop()
          gameEngineRef.current = null
        }
      }
    }
  }, [gameStarted, initGame])

  useEffect(() => {
    if (!gameState || !gameEngineRef.current) return

    const room = gameState.currentRoom
    const player = gameState.player
    const puzzleManager = gameEngineRef.current.getPuzzleManager()

    let hasInteraction = false
    let text = ''

    if (room.puzzleId) {
      const puzzle = puzzleManager.getPuzzle(room.puzzleId)
      if (puzzle && !puzzle.solved) {
        hasInteraction = true
        text = '解开谜题'
      }
    }

    if (room.isFinalRoom && room.pedestals) {
      const shardsCollected = gameState.shardsCollected.length
      if (shardsCollected >= 5) {
        const nearPedestal = room.pedestals.some((p) => {
          const dx = Math.abs(player.x - p.x)
          const dy = Math.abs(player.y - p.y)
          return dx < 30 && dy < 30
        })
        if (nearPedestal) {
          hasInteraction = true
          text = '激活基座'
        }
      } else {
        hasInteraction = true
        text = `需要 ${5 - shardsCollected} 个记忆碎片`
      }
    }

    if (room.hasMemoryShard && !room.shardCollected) {
      const roomSize = gameEngineRef.current.getRenderer().getRoomSize()
      const shardX = isMobile ? 24 : 32
      const shardY = roomSize.height - (isMobile ? 30 : 40)
      const dx = Math.abs(player.x - shardX)
      const dy = Math.abs(player.y - shardY)
      if (dx < 30 && dy < 30) {
        hasInteraction = true
        text = '收集记忆碎片'
      }
    }

    setShowHint(hasInteraction)
    setHintText(text)
  }, [gameState, isMobile])

  const handleStart = () => {
    setGameStarted(true)
  }

  const handleClosePuzzle = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.closePuzzle()
    }
  }

  const handlePuzzleSolved = () => {
  }

  const handleRestart = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.stop()
      gameEngineRef.current = null
    }
    setGameState(null)
    setGameStarted(false)
    setTimeout(() => {
      setGameStarted(true)
    }, 100)
  }

  const activePuzzle = gameState?.activePuzzleId
    ? gameEngineRef.current?.getPuzzleManager().getPuzzle(gameState.activePuzzleId)
    : null

  return (
    <div style={styles.container}>
      <div style={styles.gameWrapper}>
        <canvas ref={canvasRef} style={styles.canvas} />

        {gameStarted && gameState && (
          <>
            <HUD
              loopCount={gameState.loopCount}
              timeRemaining={gameState.timeRemaining}
              shardCount={gameState.shardsCollected.length}
              isMobile={isMobile}
            />
            <Inventory shardsCollected={gameState.shardsCollected} isMobile={isMobile} />
            <InteractionHint text={hintText} visible={showHint} />
          </>
        )}

        {gameState?.gameState.showPuzzle && activePuzzle && gameEngineRef.current && (
          <PuzzleModal
            puzzle={activePuzzle}
            onSolve={handlePuzzleSolved}
            onClose={handleClosePuzzle}
            puzzleManager={gameEngineRef.current.getPuzzleManager()}
          />
        )}

        {gameState?.gameState.isWin && (
          <WinScreen loopCount={gameState.loopCount} onRestart={handleRestart} />
        )}

        {!gameStarted && <StartScreen onStart={handleStart} />}
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgDark,
    overflow: 'hidden',
  },
  gameWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    display: 'block',
    imageRendering: 'pixelated' as any,
    WebkitImageRendering: 'pixelated' as any,
  },
}

export default App
