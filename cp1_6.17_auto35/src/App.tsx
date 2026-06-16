import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { GameProvider, useGame } from './context/GameContext'
import { SceneCanvas } from './components/SceneCanvas'
import { ShipList } from './components/ShipList'
import { BattleControls } from './components/BattleControls'
import { BattleLog } from './components/BattleLog'
import { ResultPanel } from './components/ResultPanel'
import type { ShipType } from './types'

const AppInner: React.FC = () => {
  const { phase, engine, refreshUI } = useGame()
  const [draggingType, setDraggingType] = useState<ShipType | null>(null)
  const [gameKey, setGameKey] = useState(0)

  const handleDragEnd = useCallback((gridX: number, gridZ: number) => {
    if (!engine || !draggingType) return
    engine.deployPlayerShip(draggingType, gridX, gridZ)
    setDraggingType(null)
    refreshUI()
  }, [engine, draggingType, refreshUI])

  const handleShipClick = useCallback((shipId: string) => {
    engine?.selectShip(shipId)
  }, [engine])

  const handleCanvasClick = useCallback(() => {
    engine?.selectShip(null)
  }, [engine])

  const handlePlayAgain = useCallback(() => {
    setGameKey(k => k + 1)
  }, [])

  const showDeployPanel = phase === 'deploy'

  return (
    <div className="app-container" key={gameKey}>
      <header className="app-header">
        <h1 className="game-title">
          <span className="title-icon">⭐</span>
          星舰竞技场
          <span className="title-sub">战术布阵与自动对战</span>
        </h1>
        <div className="phase-indicator">
          {phase === 'deploy' && <span className="phase deploy-phase">🛠️ 部署阶段</span>}
          {phase === 'battle' && <span className="phase battle-phase">⚔️ 战斗中...</span>}
          {phase === 'result' && <span className="phase result-phase">🏁 结算阶段</span>}
          {phase === 'replay' && <span className="phase replay-phase">🎬 回放中</span>}
        </div>
      </header>

      <div className="main-content">
        {showDeployPanel && (
          <aside className="left-panel">
            <ShipList
              onStartDrag={(t) => setDraggingType(t)}
              onEndDrag={() => setDraggingType(null)}
            />
          </aside>
        )}

        <main className="center-panel">
          <div className="canvas-wrapper">
            <SceneCanvas
              draggingType={draggingType}
              onDragEnd={handleDragEnd}
              onShipClick={handleShipClick}
              onCanvasClick={handleCanvasClick}
            />
            {phase === 'deploy' && (
              <div className="deploy-tips">
                <p>💡 拖拽左侧战舰卡片到 <span style={{ color: '#4FC3F7' }}>蓝色部署区</span>（战场下方）</p>
                <p>🎖️ 战列舰将自动成为旗舰</p>
              </div>
            )}
          </div>

          {phase === 'battle' && (
            <div className="bottom-panels">
              <BattleControls />
              <BattleLog />
            </div>
          )}

          {phase === 'result' && (
            <div className="result-bottom-panel">
              <BattleLog />
            </div>
          )}
        </main>

        {!showDeployPanel && phase === 'battle' && (
          <aside className="right-panel">
            <div className="mini-info">
              <h4>作战提示</h4>
              <ul>
                <li>🔵 点击己方战舰查看详情和释放技能</li>
                <li>⚡ 技能冷却结束后可手动释放</li>
                <li>📡 紧急召回可将受损战舰撤至后方</li>
                <li>🏆 保护旗舰存活是胜利关键</li>
              </ul>
            </div>
          </aside>
        )}
      </div>

      {phase === 'result' && <ResultPanel onPlayAgain={handlePlayAgain} />}
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <GameProvider>
      <AppInner />
    </GameProvider>
  )
}

export default App
