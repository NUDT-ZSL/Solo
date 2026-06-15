import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from './store'
import { GameEngine } from './game/GameEngine'
import MainMenu from './components/MainMenu'
import UpgradePanel from './components/UpgradePanel'
import StatusBar from './components/StatusBar'

export default function App() {
  const gamePhase = useGameStore((s) => s.gamePhase)
  const upgradePanelOpen = useGameStore((s) => s.upgradePanelOpen)
  const selectedGalaxy = useGameStore((s) => s.selectedGalaxy)
  const asteroidsDestroyed = useGameStore((s) => s.asteroidsDestroyed)
  const experience = useGameStore((s) => s.experience)
  const totalMinerals = useGameStore((s) => s.totalMinerals)
  const setGamePhase = useGameStore((s) => s.setGamePhase)
  const restartGame = useGameStore((s) => s.restartGame)
  const goToMenu = useGameStore((s) => s.goToMenu)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)

  useEffect(() => {
    if (gamePhase === 'playing') {
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      const engine = new GameEngine(canvas, selectedGalaxy)
      engineRef.current = engine
      engine.start()

      return () => {
        engine.stop()
        engineRef.current = null
      }
    }
  }, [gamePhase, selectedGalaxy])

  useEffect(() => {
    if (gamePhase === 'playing' && engineRef.current) {
      engineRef.current.syncFromStore()
    }
  }, [upgradePanelOpen, gamePhase])

  const handleRestart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop()
      engineRef.current = null
    }
    restartGame()
  }, [restartGame])

  const handleGoMenu = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop()
      engineRef.current = null
    }
    goToMenu()
  }, [goToMenu])

  if (gamePhase === 'menu' || gamePhase === 'galaxy-select') {
    return <MainMenu />
  }

  if (gamePhase === 'game-over') {
    const totalMined = totalMinerals.iron + totalMinerals.copper + totalMinerals.crystal

    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)', zIndex: 100,
      }}>
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: 800, height: 800,
            marginLeft: -400, marginTop: -400,
            background: 'radial-gradient(ellipse, rgba(101,31,255,0.15), rgba(0,229,255,0.05), transparent)',
            animation: 'nebulaRotate 60s linear infinite',
          }} />
        </div>

        <div style={{
          width: 380, padding: '40px 36px',
          background: '#1c1c1c', borderRadius: 20,
          boxShadow: '0 0 40px rgba(0,0,0,0.5), 0 0 80px rgba(101,31,255,0.1)',
          textAlign: 'center', position: 'relative', zIndex: 1,
          animation: 'fadeIn 0.5s ease-out',
        }}>
          <h2 style={{
            fontSize: 26, fontWeight: 700, marginBottom: 24,
            background: 'linear-gradient(135deg, #00e5ff, #651fff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            任务结束
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              <span style={{ color: '#aaa' }}>采集矿物总量</span>
              <span style={{ color: '#00e5ff', fontWeight: 600 }}>{totalMined}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              <span style={{ color: '#aaa' }}>击碎陨石数</span>
              <span style={{ color: '#00e5ff', fontWeight: 600 }}>{asteroidsDestroyed}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
              <span style={{ color: '#aaa' }}>获得经验值</span>
              <span style={{ color: '#651fff', fontWeight: 600 }}>{experience}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleRestart}
              style={{
                flex: 1, padding: '12px 0', border: 'none', borderRadius: 8,
                background: 'linear-gradient(135deg, #2e7d32, #43a047)',
                color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              再来一局
            </button>
            <button
              onClick={handleGoMenu}
              style={{
                flex: 1, padding: '12px 0', border: 'none', borderRadius: 8,
                background: 'linear-gradient(135deg, #1565c0, #1e88e5)',
                color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              返回主菜单
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0,
          cursor: 'none',
        }}
      />

      {upgradePanelOpen && <UpgradePanel />}
      <StatusBar />
    </div>
  )
}
