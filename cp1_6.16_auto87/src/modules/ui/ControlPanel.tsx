import React, { useEffect, useRef } from 'react'
import { GameEngine, GameStats } from '../game/GameEngine'

interface ControlPanelProps {
  engine: GameEngine
  refreshTrigger: number
  onEndTurn: () => void
  onStateChange: () => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  engine,
  refreshTrigger,
  onEndTurn,
  onStateChange
}) => {
  const state = engine.getState()
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [state.battleLog.length, refreshTrigger])

  const playerUnits = state.units.filter(u => u.side === 'player')
  const enemyUnits = state.units.filter(u => u.side === 'enemy')

  const handleRestart = () => {
    window.location.reload()
  }

  return (
    <div className="control-panel">
      <div className="panel-section turn-info">
        <h2 className="section-title">⚔ 军情简报</h2>
        <div className="turn-display">
          <div className="turn-number">第 {state.turnNumber} 回合</div>
          <div className={`turn-side ${state.currentTurn}`}>
            {state.currentTurn === 'player' ? '🗡 我方行动' : '🛡 敌方行动'}
          </div>
        </div>
        <div className="moves-remaining">
          剩余行动次数: <span className="highlight">{state.movesRemaining}</span>
        </div>
      </div>

      <div className="panel-section army-stats">
        <h2 className="section-title">🏰 兵力部署</h2>
        <div className="army-row player">
          <span className="army-label">我方</span>
          <span className="army-count">{playerUnits.length} 人</span>
        </div>
        <div className="army-row enemy">
          <span className="army-label">敌方</span>
          <span className="army-count">{enemyUnits.length} 人</span>
        </div>
        <div className="terrain-legend">
          <h3>地形图例</h3>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#8FBC8F' }}></span>
            <span>平原</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#2E8B57' }}></span>
            <span>森林（防御+20%，移动消耗+1）</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#4682B4' }}></span>
            <span>河流（不可通行）</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#D2B48C' }}></span>
            <span>高地（攻击+20%）</span>
          </div>
        </div>
      </div>

      <div className="panel-section battle-log">
        <h2 className="section-title">📜 战报</h2>
        <div className="log-container" ref={logRef}>
          {state.battleLog.map(entry => (
            <div key={entry.id} className="log-entry">
              {entry.message}
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section actions">
        {!state.gameOver && state.currentTurn === 'player' && (
          <button className="btn btn-primary end-turn-btn" onClick={onEndTurn}>
            ⚔ 结束回合
          </button>
        )}
        {state.gameOver && (
          <button className="btn btn-primary restart-btn" onClick={handleRestart}>
            🔄 重新开始
          </button>
        )}
      </div>
    </div>
  )
}

export default ControlPanel
