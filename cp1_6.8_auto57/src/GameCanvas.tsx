import { useEffect, useRef, useCallback } from 'react'
import { GameEngine } from './GameEngine'
import { useGameStore } from './store'

interface GameCanvasProps {
  engineRef: React.MutableRefObject<GameEngine | null>
}

export default function GameCanvas({ engineRef }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const setScore = useGameStore(s => s.setScore)
  const setEnergy = useGameStore(s => s.setEnergy)
  const setBoosting = useGameStore(s => s.setBoosting)
  const setGameState = useGameStore(s => s.setGameState)
  const gameState = useGameStore(s => s.gameState)

  const initEngine = useCallback(() => {
    if (!canvasRef.current) return
    const engine = new GameEngine(canvasRef.current)
    engine.setCallbacks({
      onScoreUpdate: setScore,
      onEnergyUpdate: setEnergy,
      onBoostChange: setBoosting,
      onGameOver: () => setGameState('gameover'),
    })
    engineRef.current = engine
    return engine
  }, [setScore, setEnergy, setBoosting, setGameState, engineRef])

  useEffect(() => {
    const engine = initEngine()
    if (!engine) return

    let menuAnimId: number
    const menuLoop = () => {
      engine.renderMenu()
      menuAnimId = requestAnimationFrame(menuLoop)
    }
    menuAnimId = requestAnimationFrame(menuLoop)

    const handleResize = () => {
      engine.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(menuAnimId)
      window.removeEventListener('resize', handleResize)
      engine.destroy()
    }
  }, [initEngine])

  useEffect(() => {
    if (gameState === 'playing' && engineRef.current) {
      engineRef.current.restart()
    }
  }, [gameState, engineRef])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'block',
      }}
    />
  )
}
