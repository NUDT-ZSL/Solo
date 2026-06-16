import React, { useState } from 'react'
import { useGame } from '../context/GameContext'
import type { Ship } from '../types'

export const BattleControls: React.FC = () => {
  const { engine, phase, selectedShipId, ships, refreshTrigger, aiState } = useGame()
  const [airstrikeMode, setAirstrikeMode] = useState(false)
  const _ = refreshTrigger

  const selectedShip: Ship | undefined = ships.find(s => s.id === selectedShipId)
  const isPlayerSelected = selectedShip?.faction === 'player'

  const playerAlive = ships.filter(s => s.faction === 'player' && s.status.alive).length
  const playerTotal = ships.filter(s => s.faction === 'player').length
  const enemyAlive = ships.filter(s => s.faction === 'enemy' && s.status.alive).length
  const enemyTotal = ships.filter(s => s.faction === 'enemy').length

  const handleUseSkill = () => {
    if (!engine || !selectedShip) return
    const skill = selectedShip.skills[0]
    if (!skill || skill.currentCooldown > 0) return

    if (skill.type === 'airstrike') {
      setAirstrikeMode(true)
    } else {
      engine.useSelectedShipSkill(0)
    }
  }

  const handleRecall = () => {
    engine?.recallSelectedShip()
  }

  const handleSpeedChange = (speed: number) => {
    engine?.setReplaySpeed(speed)
  }

  const togglePause = () => {
    engine?.togglePause()
  }

  const tacticName = (t: string) => ({
    focus_fire: '集中火力',
    encircle: '包围战术',
    defensive: '防守阵型'
  }[t] || t)

  if (phase !== 'battle') return null

  return (
    <div className="battle-controls">
      <div className="faction-status">
        <div className="status-player">
          <span className="label">我方</span>
          <span className="value">{playerAlive} / {playerTotal}</span>
          <div className="hp-bar">
            <div className="fill" style={{ width: `${(playerAlive / Math.max(1, playerTotal)) * 100}%` }} />
          </div>
        </div>
        <div className="vs">VS</div>
        <div className="status-enemy">
          <span className="label">敌方</span>
          <span className="value">{enemyAlive} / {enemyTotal}</span>
          <div className="hp-bar enemy">
            <div className="fill" style={{ width: `${(enemyAlive / Math.max(1, enemyTotal)) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="tactic-display">
        <div className="tactic-item">
          <span>我方战术：</span>
          <b style={{ color: '#4FC3F7' }}>{tacticName(aiState?.playerTactic || 'focus_fire')}</b>
        </div>
        <div className="tactic-item">
          <span>敌方战术：</span>
          <b style={{ color: '#FF5252' }}>{tacticName(aiState?.enemyTactic || 'focus_fire')}</b>
        </div>
      </div>

      {selectedShip && isPlayerSelected && (
        <div className="selected-ship-panel">
          <div className="ship-info-header">
            <h4>{selectedShip.name}</h4>
            {selectedShip.isFlagship && <span className="flagship-badge">旗舰</span>}
          </div>
          <div className="ship-hp-display">
            <div className="hp-label">
              血量：{Math.round(selectedShip.hp)} / {selectedShip.maxHp}
            </div>
            <div className="hp-bar-large">
              <div
                className="fill"
                style={{
                  width: `${(selectedShip.hp / selectedShip.maxHp) * 100}%`,
                  background: selectedShip.hp / selectedShip.maxHp > 0.5
                    ? 'linear-gradient(90deg, #4CAF50, #8BC34A)'
                    : selectedShip.hp / selectedShip.maxHp > 0.25
                      ? 'linear-gradient(90deg, #FFC107, #FF9800)'
                      : 'linear-gradient(90deg, #F44336, #E91E63)'
                }}
              />
            </div>
          </div>

          <div className="ship-actions">
            {selectedShip.skills.map((skill, idx) => {
              const ready = skill.currentCooldown <= 0
              const cooldownPct = Math.max(0, (skill.cooldown - skill.currentCooldown) / skill.cooldown) * 100
              return (
                <button
                  key={skill.id}
                  className={`skill-btn ${ready ? 'ready' : 'cd'}`}
                  onClick={handleUseSkill}
                  disabled={!ready}
                  style={{ '--skill-color': skill.color } as React.CSSProperties}
                  title={skill.description}
                >
                  <div className="skill-icon-large">
                    {skill.type === 'emp' ? '⚡' :
                     skill.type === 'repair' ? '💚' :
                     skill.type === 'airstrike' ? '💥' : '🛡️'}
                  </div>
                  <span className="skill-name">{skill.name}</span>
                  {!ready && (
                    <div className="cooldown-overlay" style={{ height: `${100 - cooldownPct}%` }}>
                      <span className="cd-text">{skill.currentCooldown.toFixed(1)}s</span>
                    </div>
                  )}
                </button>
              )
            })}

            <button
              className="recall-btn"
              onClick={handleRecall}
              title="紧急召回至后方"
            >
              📡 紧急召回
            </button>
          </div>
        </div>
      )}

      <div className="speed-controls">
        <button onClick={togglePause}>
          {engine?.isReplayPaused() ? '▶️ 继续' : '⏸️ 暂停'}
        </button>
        <button onClick={() => handleSpeedChange(0.5)}>0.5x</button>
        <button className="active">1x</button>
        <button onClick={() => handleSpeedChange(2)}>2x</button>
      </div>

      {airstrikeMode && (
        <div className="airstrike-overlay">
          <div className="airstrike-tip">🎯 点击战场选择齐射目标区域</div>
          <button onClick={() => setAirstrikeMode(false)} className="cancel-btn">取消</button>
        </div>
      )}
    </div>
  )
}
