import { useEffect, useRef } from 'react'
import { GameEngine, GameEngineCallbacks } from '../game/GameEngine'

interface GameCanvasProps {
  initialVx: number
  initialVy: number
  isLaunched: boolean
  isReset: boolean
  onLaunch: () => void
  onResetComplete: () => void
  callbacks: GameEngineCallbacks
}

export default function GameCanvas({
  initialVx,
  initialVy,
  isLaunched,
  isReset,
  onLaunch,
  onResetComplete,
  callbacks,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const hasLaunchedRef = useRef(false)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const updateSize = () => {
      const controlPanelWidth = 300
      canvas.width = window.innerWidth - controlPanelWidth
      canvas.height = window.innerHeight
      if (engineRef.current) {
        engineRef.current.resize(canvas.width, canvas.height)
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)

    engineRef.current = new GameEngine(canvas, callbacks)
    engineRef.current.start()

    return () => {
      window.removeEventListener('resize', updateSize)
      engineRef.current?.stop()
    }
  }, [callbacks])

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setInitialVelocity(initialVx, initialVy)
    }
  }, [initialVx, initialVy])

  useEffect(() => {
    if (isLaunched && !hasLaunchedRef.current && engineRef.current) {
      engineRef.current.launch()
      hasLaunchedRef.current = true
      onLaunch()
    }
  }, [isLaunched, onLaunch])

  useEffect(() => {
    if (isReset && engineRef.current) {
      engineRef.current.reset()
      hasLaunchedRef.current = false
      onResetComplete()
    }
  }, [isReset, onResetComplete])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        background: '#0a0a2a',
      }}
    />
  )
}
