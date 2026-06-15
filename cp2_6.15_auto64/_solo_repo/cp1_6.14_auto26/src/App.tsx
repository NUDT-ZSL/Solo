import React, { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine, GameEngineState } from './game/GameEngine'
import { HUD } from './ui/HUD'
import { Inventory } from './ui/Inventory'
import { PuzzleModal } from './ui/PuzzleModal'
import { WinScreen } from './ui/WinScreen'
import { StartScreen } from './ui/StartScreen'
import { InteractionHint } from './ui/InteractionHint'
import { COLORS, ROOM_WIDTH, ROOM_HEIGHT, MOBILE_ROOM_WIDTH, MOBILE_ROOM_HEIGHT } from './game/constants'

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameWrapperRef = useRef<HTMLDivElement>(null)
  const gameEngineRef = useRef<GameEngine | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameState, setGameState] = useState<GameEngineState | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [hintText, setHintText] = useState('')
  const [canvasStyle, setCanvasStyle] = useState<React.CSSProperties>({})

  const updateCanvasStyle = useCallback(() => {
    if (!gameWrapperRef.current) return

    const wrapperWidth = gameWrapperRef.current.clientWidth
    const wrapperHeight = gameWrapperRef.current.clientHeight
    const isMobile = wrapperWidth < 768

    const baseWidth = isMobile ? MOBILE_ROOM_WIDTH : ROOM_WIDTH
    const baseHeight = isMobile ? MOBILE_ROOM_HEIGHT : ROOM_HEIGHT

    const scaleX = wrapperWidth / baseWidth
    const scaleY = wrapperHeight / baseHeight
    const scale = Math.min(scaleX, scaleY, 3)

    const displayWidth = Math.floor(baseWidth * scale)
    const displayHeight = Math.floor(baseHeight * scale)

    setCanvasStyle({
      width: `${displayWidth}px`,
      height: `${displayHeight}px`,
      imageRendering: 'pixelated',
      display: 'block',
    })
  }, [])

  useEffect(() => {
    updateCanvasStyle()
    window.addEventListener('resize', updateCanvasStyle)
    return () => window.removeEventListener('resize', updateCanvasStyle)
  }, [updateCanvasStyle])

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
      const timer = setTimeout(() => {
        initGame()
      }, 50)
      return () => {
        clearTimeout(timer)
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
    const renderer = gameEngineRef.current.getRenderer()
    const roomSize = renderer.getRoomSize()
    const isMobile = renderer.getIsMobile()

    let hasInteraction = false
    let text = ''

    if (room.hasMemoryShard && !room.shardCollected) {
      const shardX = isMobile ? 24 : 32
      const shardY = roomSize.height - (isMobile ? 30 : 40)
      const dx = Math.abs(player.x - shardX)
      const dy = Math.abs(player.y - shardY)
      if (dx < 40 && dy < 40) {
        hasInteraction = true
        text = '收集记忆碎片'
      }
    }

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
        const ps = isMobile ? 15 : 20
        const nearPedestal = room.pedestals.some((p) => {
          const px = isMobile
            ? Math.floor(p.x * 0.75 * (MOBILE_ROOM_WIDTH / ROOM_WIDTH))
            : p.x
          const py = isMobile
            ? Math.floor(p.y * 0.75 * (MOBILE_ROOM_HEIGHT / ROOM_HEIGHT))
            : p.y
          const dx = Math.abs(player.x - px)
          const dy = Math.abs(player.y - py)
          return dx < 30 + ps && dy < 30 + ps
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

    setShowHint(hasInteraction)
    setHintText(text)
  }, [gameState])

  const handleStart = () => {
    setGameStarted(true)
  }

  const handleClosePuzzle = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.closePuzzle()
    }
  }

  const handlePuzzleSolved = () => {}

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

  const isMobile = gameState?.isMobile ?? false

  return (
    <div style={styles.container}>
      <div ref={gameWrapperRef} style={styles.gameWrapper}>
        <canvas ref={canvasRef} style={canvasStyle} />

        {gameStarted && gameState && (
          <>
            <HUD
              loopCount={gameState.loopCount}
              timeRemaining={gameState.timeRemaining}
              shardCount={gameState.shardsCollected.length}
              isWarning={gameState.isWarning}
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
    overflow: 'hidden',
  },
}

export default App
