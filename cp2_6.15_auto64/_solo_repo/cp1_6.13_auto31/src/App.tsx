import { useRef, useEffect, useCallback } from 'react'
import { useLevelStore } from '@/store/useLevelStore'
import { GameEngine } from '@/engine/GameEngine'
import { GameRenderer } from '@/engine/GameRenderer'
import { CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SIZE } from '@/types'
import ComponentPanel from '@/editor/ComponentPanel'
import EditorCanvas from '@/editor/EditorCanvas'
import PropertyPanel from '@/editor/PropertyPanel'

function findSpawnPoint(elements: { type: string; x: number; y: number; width: number }[]): { x: number; y: number } {
  const flag = elements.find(el => el.type === 'flag')
  if (flag) {
    return { x: flag.x, y: flag.y - PLAYER_SIZE }
  }
  const grounds = elements.filter(el => el.type === 'ground')
  if (grounds.length > 0) {
    const first = grounds[0]
    return { x: first.x + first.width / 2 - PLAYER_SIZE / 2, y: first.y - PLAYER_SIZE }
  }
  return { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - PLAYER_SIZE - 40 }
}

export default function App() {
  const testCanvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const rendererRef = useRef<GameRenderer | null>(null)
  const animFrameRef = useRef<number>(0)

  const elements = useLevelStore(s => s.elements)
  const isTestMode = useLevelStore(s => s.isTestMode)
  const setTestMode = useLevelStore(s => s.setTestMode)
  const setLeftPanelCollapsed = useLevelStore(s => s.setLeftPanelCollapsed)
  const setRightPanelCollapsed = useLevelStore(s => s.setRightPanelCollapsed)

  const startGameLoop = useCallback(() => {
    const canvas = testCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const spawn = findSpawnPoint(elements)
    const engine = new GameEngine(elements, spawn)
    engineRef.current = engine
    rendererRef.current = new GameRenderer(ctx)

    const loop = () => {
      engine.update()
      rendererRef.current?.render(engine)
      animFrameRef.current = requestAnimationFrame(loop)
    }
    loop()
  }, [elements])

  const stopGameLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }
    engineRef.current = null
    rendererRef.current = null
  }, [])

  useEffect(() => {
    if (isTestMode) {
      startGameLoop()
    } else {
      stopGameLoop()
    }
    return () => {
      stopGameLoop()
    }
  }, [isTestMode, startGameLoop, stopGameLoop])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTestMode) return
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault()
      }

      if (e.key === 'Escape') {
        setTestMode(false)
        return
      }

      if (e.key === 'r' || e.key === 'R') {
        const spawn = findSpawnPoint(elements)
        engineRef.current?.reset(spawn)
        return
      }

      engineRef.current?.keys.add(e.key)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      engineRef.current?.keys.delete(e.key)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isTestMode, setTestMode, elements])

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      if (w < 1024) {
        setLeftPanelCollapsed(true)
        setRightPanelCollapsed(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setLeftPanelCollapsed, setRightPanelCollapsed])

  if (isTestMode) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e1e24',
      }}>
        <canvas
          ref={testCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 12,
          fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
        }}>
          <div style={{
            padding: '6px 16px',
            background: 'rgba(27, 27, 33, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 6,
            color: '#aaa',
            fontSize: 12,
          }}>
            方向键移动 | 空格跳跃 | R 重置 | ESC 返回
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#1e1e24',
      fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        background: 'rgba(27, 27, 33, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#e0e0e0',
            letterSpacing: 1,
          }}>
            LevelForge
          </span>
          <span style={{
            fontSize: 12,
            color: '#555',
          }}>
            2D 平台跳跃关卡设计器
          </span>
        </div>
        <button
          onClick={() => setTestMode(true)}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#3b82f6',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#2563eb'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#3b82f6'
          }}
        >
          测试模式
        </button>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: 12,
        padding: 12,
        overflow: 'auto',
      }}>
        <ComponentPanel />
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <EditorCanvas />
        </div>
        <PropertyPanel />
      </div>
    </div>
  )
}
