import { useEffect, useRef, useState } from 'react'
import { PhysicsEngine } from './game/PhysicsEngine'
import { GameRenderer } from './game/GameRenderer'
import { InputManager } from './game/InputManager'
import { ParameterPanel } from './ui/ParameterPanel'
import { DataPanel } from './ui/DataPanel'
import { useGameStore } from './store'
import type { JumpState } from './types'

const GAME_WIDTH = 800
const GAME_HEIGHT = 600
const FPS_SAMPLE_WINDOW = 60
const FPS_WARNING_THRESHOLD = 55
const SAMPLE_INTERVAL_MS = 1000

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const physicsRef = useRef<PhysicsEngine | null>(null)
  const rendererRef = useRef<GameRenderer | null>(null)
  const inputRef = useRef<InputManager | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const fpsSamplesRef = useRef<number[]>([])
  const sampleFramesRef = useRef<number>(0)
  const sampleStartRef = useRef<number>(0)
  const warningActiveRef = useRef<boolean>(false)
  const [currentJumpState, setCurrentJumpState] = useState<JumpState | null>(null)

  const params = useGameStore((s) => s.params)
  const addTrajectory = useGameStore((s) => s.addTrajectory)
  const setLowFpsWarning = useGameStore((s) => s.setLowFpsWarning)

  useEffect(() => {
    if (!canvasRef.current) return

    physicsRef.current = new PhysicsEngine()
    rendererRef.current = new GameRenderer(canvasRef.current)
    inputRef.current = new InputManager()
    inputRef.current.attach()

    const initialResult = physicsRef.current.update(
      0,
      params,
      0,
      false,
      false
    )
    rendererRef.current.render(initialResult.player, initialResult.platforms)

    lastTimeRef.current = performance.now()
    sampleStartRef.current = performance.now()
    sampleFramesRef.current = 0
    fpsSamplesRef.current = []
    warningActiveRef.current = false

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000)
      lastTimeRef.current = now

      sampleFramesRef.current += 1
      if (now - sampleStartRef.current >= SAMPLE_INTERVAL_MS) {
        const elapsedSec = (now - sampleStartRef.current) / 1000
        const instantFps = sampleFramesRef.current / elapsedSec
        fpsSamplesRef.current.push(instantFps)
        if (fpsSamplesRef.current.length > FPS_SAMPLE_WINDOW) {
          fpsSamplesRef.current.shift()
        }
        sampleFramesRef.current = 0
        sampleStartRef.current = now

        if (fpsSamplesRef.current.length >= FPS_SAMPLE_WINDOW) {
          const avg =
            fpsSamplesRef.current.reduce((a, b) => a + b, 0) / fpsSamplesRef.current.length
          const shouldWarn = avg < FPS_WARNING_THRESHOLD
          if (shouldWarn !== warningActiveRef.current) {
            warningActiveRef.current = shouldWarn
            setLowFpsWarning(shouldWarn)
          }
        }
      }

      if (physicsRef.current && inputRef.current && rendererRef.current) {
        const horizontal = inputRef.current.getHorizontalAxis()
        const jump = inputRef.current.consumeJump()
        const reset = inputRef.current.isResetPressed()

        const result = physicsRef.current.update(dt, params, horizontal, jump, reset)

        if (result.trajectoryCompleted) {
          addTrajectory(result.trajectoryCompleted)
        }

        setCurrentJumpState(result.currentJumpState)

        rendererRef.current.render(result.player, result.platforms)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      inputRef.current?.detach()
    }
  }, [params, addTrajectory, setLowFpsWarning])

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        backgroundColor: '#1A1A1A',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        boxSizing: 'border-box',
        gap: 20,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      }}
    >
      <ParameterPanel />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12
        }}
      >
        <div
          style={{
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 1
          }}
        >
          2D 平台跳跃手感调校器
        </div>
        <div
          style={{
            position: 'relative',
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            border: '2px solid #333'
          }}
        >
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            style={{
              display: 'block',
              width: GAME_WIDTH,
              height: GAME_HEIGHT
            }}
          />
        </div>
        <div style={{ color: '#666', fontSize: 12 }}>
          在左侧调整参数，使用 A/D 和空格操作角色，查看右侧数据面板
        </div>
      </div>

      <DataPanel currentJumpState={currentJumpState} />
    </div>
  )
}
