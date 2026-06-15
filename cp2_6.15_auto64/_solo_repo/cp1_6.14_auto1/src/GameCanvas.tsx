import React, { useRef, useEffect, useCallback, useState } from 'react'
import {
  createGameState,
  updateGame,
  renderGame,
  fireBullet,
  resizeGame,
  type GameState,
} from './gameEngine'
import { GameUI, type GameUIState } from './uiComponents'

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameStateRef = useRef<GameState | null>(null)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const mouseDownRef = useRef(false)

  const [uiState, setUIState] = useState<GameUIState>({
    score: 0,
    health: 100,
    maxHealth: 100,
    weaponLevel: 1,
    minerals: { iron: 0, silicon: 0, rare: 0 },
    gameOver: false,
  })

  const updateUIFromState = useCallback((state: GameState) => {
    setUIState({
      score: state.score,
      health: state.ship.health,
      maxHealth: state.ship.maxHealth,
      weaponLevel: state.ship.weaponLevel,
      minerals: { ...state.ship.minerals },
      gameOver: state.gameOver,
    })
  }, [])

  const initGame = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w
    canvas.height = h
    gameStateRef.current = createGameState(w, h)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    initGame(canvas)

    const handleResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w
      canvas.height = h
      if (gameStateRef.current) {
        resizeGame(gameStateRef.current, w, h)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (gameStateRef.current) {
        gameStateRef.current.keys.add(key)
        if (key === 'r' && gameStateRef.current.gameOver) {
          initGame(canvas)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (gameStateRef.current) {
        gameStateRef.current.keys.delete(key)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (gameStateRef.current) {
        gameStateRef.current.mouseX = e.clientX
        gameStateRef.current.mouseY = e.clientY
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseDownRef.current = true
        if (gameStateRef.current) {
          fireBullet(gameStateRef.current)
        }
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseDownRef.current = false
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('contextmenu', handleContextMenu)

    let uiUpdateCounter = 0

    const gameLoop = (timestamp: number) => {
      const state = gameStateRef.current
      if (!state) {
        animFrameRef.current = requestAnimationFrame(gameLoop)
        return
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }

      let dt = (timestamp - lastTimeRef.current) / 1000
      lastTimeRef.current = timestamp

      dt = Math.min(dt, 0.05)

      if (mouseDownRef.current && !state.gameOver) {
        fireBullet(state)
      }

      updateGame(state, dt)

      const ctx = canvas.getContext('2d')
      if (ctx) {
        renderGame(ctx, state)
      }

      uiUpdateCounter++
      if (uiUpdateCounter >= 3) {
        uiUpdateCounter = 0
        updateUIFromState(state)
      }

      animFrameRef.current = requestAnimationFrame(gameLoop)
    }

    animFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [initGame, updateUIFromState])

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      cursor: 'crosshair',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
      <GameUI {...uiState} />
    </div>
  )
}

export default GameCanvas
