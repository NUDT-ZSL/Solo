import { useEffect, useRef, useState } from 'react'
import { Player } from './Player'
import { PlatformSystem, PlatformCell } from './Platform'
import { Renderer } from './Renderer'
import {
  playJumpSound,
  playLandSound,
  playEnergyCollectSound,
  playQuantumFlashSound,
  playGameOverSound,
  playRedHitSound
} from './audio'

const BASE_WIDTH = 800
const BASE_HEIGHT = 600
const TARGET_FPS = 60
const FRAME_TIME = 1000 / TARGET_FPS

type GameState = 'start' | 'playing' | 'gameover'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playerRef = useRef<Player | null>(null)
  const platformRef = useRef<PlatformSystem | null>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const gameStateRef = useRef<GameState>('start')
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const accTimeRef = useRef<number>(0)
  const prevOnGroundRef = useRef<boolean>(false)
  const prevQuantumRef = useRef<boolean>(false)
  const prevEnergyRef = useRef<number>(0)
  const lastHitCellRef = useRef<string | null>(null)

  const [, forceUpdate] = useState(0)
  const [scale, setScale] = useState(1)
  const [displaySize, setDisplaySize] = useState({ w: BASE_WIDTH, h: BASE_HEIGHT })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1

    playerRef.current = new Player(BASE_WIDTH, BASE_HEIGHT)
    platformRef.current = new PlatformSystem(BASE_WIDTH, BASE_HEIGHT)
    rendererRef.current = new Renderer(canvas, BASE_WIDTH, BASE_HEIGHT)
    rendererRef.current.resize(BASE_WIDTH, BASE_HEIGHT, dpr)

    const handleResize = () => {
      const screenW = window.innerWidth
      let newScale = 1
      if (screenW < 600) {
        newScale = screenW / BASE_WIDTH
      } else if (screenW < BASE_WIDTH + 40) {
        newScale = (screenW - 40) / BASE_WIDTH
      }
      const screenH = window.innerHeight
      const maxH = screenH - 40
      if (BASE_HEIGHT * newScale > maxH) {
        newScale = maxH / BASE_HEIGHT
      }
      newScale = Math.max(0.3, newScale)
      setScale(newScale)
      setDisplaySize({
        w: Math.round(BASE_WIDTH * newScale),
        h: Math.round(BASE_HEIGHT * newScale)
      })
      forceUpdate(n => n + 1)
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !rendererRef.current) return
    const dpr = window.devicePixelRatio || 1
    rendererRef.current.resize(BASE_WIDTH, BASE_HEIGHT, dpr)
  }, [scale])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (gameStateRef.current === 'start') {
          gameStateRef.current = 'playing'
          playerRef.current?.reset()
          platformRef.current?.reset()
          rendererRef.current?.splashEffects.splice(0)
          rendererRef.current?.particles.splice(0)
          lastHitCellRef.current = null
          return
        }
        if (gameStateRef.current === 'gameover') {
          gameStateRef.current = 'playing'
          playerRef.current?.reset()
          platformRef.current?.reset()
          rendererRef.current?.splashEffects.splice(0)
          rendererRef.current?.particles.splice(0)
          lastHitCellRef.current = null
          return
        }
        if (gameStateRef.current === 'playing') {
          const player = playerRef.current
          if (player && player.state.onGround && !player.state.isJumping) {
            player.jump()
            playJumpSound()
          }
        }
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault()
        if (playerRef.current) playerRef.current.leftPressed = true
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault()
        if (playerRef.current) playerRef.current.rightPressed = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        if (playerRef.current) playerRef.current.leftPressed = false
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        if (playerRef.current) playerRef.current.rightPressed = false
      }
    }

    const handleClick = () => {
      if (gameStateRef.current === 'start') {
        gameStateRef.current = 'playing'
        playerRef.current?.reset()
        platformRef.current?.reset()
        rendererRef.current?.splashEffects.splice(0)
        rendererRef.current?.particles.splice(0)
        lastHitCellRef.current = null
        return
      }
      if (gameStateRef.current === 'gameover') {
        gameStateRef.current = 'playing'
        playerRef.current?.reset()
        platformRef.current?.reset()
        rendererRef.current?.splashEffects.splice(0)
        rendererRef.current?.particles.splice(0)
        lastHitCellRef.current = null
        return
      }
      if (gameStateRef.current === 'playing') {
        const player = playerRef.current
        if (player && player.state.onGround && !player.state.isJumping) {
          player.jump()
          playJumpSound()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    canvas.addEventListener('click', handleClick)

    const player = playerRef.current!
    const platform = platformRef.current!
    const renderer = rendererRef.current!

    prevOnGroundRef.current = player.state.onGround
    prevQuantumRef.current = player.state.quantumFlash
    prevEnergyRef.current = player.state.energy

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const delta = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp
      accTimeRef.current += delta

      while (accTimeRef.current >= FRAME_TIME) {
        accTimeRef.current -= FRAME_TIME
        const dt = FRAME_TIME / 1000

        if (gameStateRef.current === 'playing') {
          const { landedY, hitCell, hitUnstable } = platform.checkCollision(
            player.state.x,
            player.state.y,
            player.getWidth(),
            player.getHeight()
          )

          const scrollSpeed = platform.getScrollSpeed()
          const wasJumping = player.state.isJumping
          const prevEnergy = player.state.energy
          const prevQuantum = player.state.quantumFlash

          const justJumped = player.update(dt, landedY, scrollSpeed, hitUnstable)

          if (justJumped) {
            playJumpSound()
          }

          if (player.state.onGround && !prevOnGroundRef.current) {
            if (hitCell) {
              if (hitUnstable && !player.state.quantumFlash) {
                playRedHitSound()
                platform.destroyCell(hitCell)
                player.loseEnergyOnRed()
              } else {
                playLandSound()
                renderer.addSplash(hitCell)
                if (hitCell.id !== lastHitCellRef.current) {
                  lastHitCellRef.current = hitCell.id
                }
              }
            }
          }

          if (player.state.energy > prevEnergy && player.state.energy > 0) {
            playEnergyCollectSound()
          }

          if (player.state.quantumFlash && !prevQuantum) {
            playQuantumFlashSound()
          }

          prevOnGroundRef.current = player.state.onGround
          prevQuantumRef.current = player.state.quantumFlash
          prevEnergyRef.current = player.state.energy

          const wasDead = player.state.isDead
          platform.update(dt)

          if (player.state.isDead && !wasDead) {
            gameStateRef.current = 'gameover'
            playGameOverSound()
            player.state.totalScore += player.state.energy * 10
          }

          renderer.updateParticles(dt)
          renderer.updateSplashes(player.state.quantumFlash)

          if (player.state.quantumFlash) {
            renderer.updateQuantumParticles(player.state.x, player.state.y)
          }

          void wasJumping
        }

        renderer.render(
          player.state,
          platform.cells as PlatformCell[],
          player.getFlashAlpha(),
          player.state.quantumFlash,
          gameStateRef.current
        )
      }

      animFrameRef.current = requestAnimationFrame(gameLoop)
    }

    animFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 12
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: displaySize.w,
          height: displaySize.h,
          borderRadius: 8,
          boxShadow: '0 0 40px rgba(100, 150, 255, 0.4), 0 0 80px rgba(200, 100, 255, 0.2)',
          cursor: 'pointer'
        }}
      />
      <div
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontFamily: 'monospace',
          fontSize: Math.max(10, 12 * scale),
          textAlign: 'center'
        }}
      >
        操作: ← → 方向键移动 | 空格/点击跳跃
      </div>
    </div>
  )
}
