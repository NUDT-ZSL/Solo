import { useEffect, useRef, useState, useCallback } from 'react'
import { GameLoop, GameState, GameStats } from './gameLoop'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<GameLoop | null>(null)
  const [gamePhase, setGamePhase] = useState<'intro' | 'playing' | 'victory' | 'defeat'>('intro')
  const [stats, setStats] = useState<GameStats>({
    collectedCount: 0,
    portalsCleared: 0,
    lanternIntensity: 20,
    colorCounts: {}
  })

  const handleStateChange = useCallback((state: GameState, currentStats: GameStats) => {
    setStats(currentStats)
    if (state === 'victory') {
      setGamePhase('victory')
    } else if (state === 'defeat') {
      setGamePhase('defeat')
    }
  }, [])

  useEffect(() => {
    if (!canvasRef.current || gamePhase !== 'playing') return

    const game = new GameLoop(canvasRef.current, handleStateChange)
    gameLoopRef.current = game
    game.start()

    return () => {
      game.stop()
      gameLoopRef.current = null
    }
  }, [gamePhase, handleStateChange])

  const startGame = () => {
    setGamePhase('playing')
  }

  const restartGame = () => {
    setStats({
      collectedCount: 0,
      portalsCleared: 0,
      lanternIntensity: 20,
      colorCounts: {}
    })
    setGamePhase('playing')
  }

  const lanternPercent = Math.min(100, (stats.lanternIntensity / 100) * 100)

  return (
    <div className="game-container">
      <div className="game-wrapper">
        <canvas ref={canvasRef} className="game-canvas" />

        {gamePhase === 'playing' && (
          <div className="hud-overlay">
            <div className="hud-left">
              <div>灵魂摆渡</div>
              <div>记忆碎片: {stats.collectedCount}</div>
              <div>灯笼亮度</div>
              <div className="lantern-bar">
                <div className="lantern-fill" style={{ width: `${lanternPercent}%` }} />
              </div>
            </div>
            <div className="hud-right">
              <div>传送门: {stats.portalsCleared} / 3</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>点击河面改变航向</div>
            </div>
          </div>
        )}

        {gamePhase === 'intro' && (
          <div className="game-overlay">
            <h1>幽 河 流 光</h1>
            <h2>—— 灵 魂 摆 渡 ——</h2>
            <p className="story-text">
              你是幽冥之河上的摆渡人。<br />
              操控幽光小舟，拾起漂浮的记忆碎片，<br />
              点亮船头灯笼，开启通往下一段河道的传送门。<br />
              <span style={{ color: '#FFE66D' }}>通过 3 个传送门，便可抵达彼岸。</span>
            </p>
            <p style={{ marginTop: '16px', fontSize: '13px' }}>
              操作：点击河面任意位置改变航向
            </p>
            <button onClick={startGame}>启 航</button>
          </div>
        )}

        {gamePhase === 'victory' && (
          <div className="game-overlay">
            <h1 className="victory-title">抵 达 彼 岸</h1>
            <p className="story-text" style={{ color: '#66FCF1' }}>
              记忆之光汇聚成河，灵魂终得安息。
            </p>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-value">{stats.collectedCount}</div>
                <div className="stat-label">收集碎片</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.portalsCleared}</div>
                <div className="stat-label">穿越传送门</div>
              </div>
            </div>
            <button onClick={restartGame}>再 次 启 航</button>
          </div>
        )}

        {gamePhase === 'defeat' && (
          <div className="game-overlay">
            <h1 className="defeat-title">灯 火 熄 灭</h1>
            <p className="story-text" style={{ color: '#FF6B6B' }}>
              小舟沉入幽河深处，<br />
              未竟的旅程仍在等待下一位摆渡人……
            </p>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-value">{stats.collectedCount}</div>
                <div className="stat-label">收集碎片</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.portalsCleared}</div>
                <div className="stat-label">穿越传送门</div>
              </div>
            </div>
            <button onClick={restartGame}>重 新 启 航</button>
          </div>
        )}
      </div>
    </div>
  )
}
