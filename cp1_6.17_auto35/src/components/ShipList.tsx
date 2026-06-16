import React, { useState } from 'react'
import { SHIP_CONFIGS } from '../core/shipFactory'
import type { ShipType } from '../types'
import { useGame } from '../context/GameContext'

const typeColors: Record<ShipType, string> = {
  frigate: '#4FC3F7',
  destroyer: '#81C784',
  battleship: '#FF8A65',
  carrier: '#CE93D8'
}

const shipIcons: Record<ShipType, string> = {
  frigate: '🛸',
  destroyer: '🚀',
  battleship: '⚔️',
  carrier: '🛰️'
}

interface ShipListProps {
  onStartDrag: (type: ShipType) => void
  onEndDrag: () => void
}

export const ShipList: React.FC<ShipListProps> = ({ onStartDrag, onEndDrag }) => {
  const { ships, phase, engine, refreshUI } = useGame()
  const [selectedType, setSelectedType] = useState<ShipType | null>(null)

  const playerShips = ships.filter(s => s.faction === 'player')
  const deployedCount = playerShips.length
  const maxDeploy = 8

  const getDeployedOfType = (type: ShipType) =>
    playerShips.filter(s => s.type === type).length

  const handleDragStart = (e: React.DragEvent, type: ShipType) => {
    if (phase !== 'deploy') return
    e.dataTransfer.setData('shipType', type)
    e.dataTransfer.effectAllowed = 'copy'
    onStartDrag(type)
    setSelectedType(type)
  }

  const handleDragEnd = () => {
    onEndDrag()
    setSelectedType(null)
  }

  const removeShip = (shipId: string) => {
    if (phase !== 'deploy' || !engine) return
    engine.removeDeployedShip(shipId)
    refreshUI()
  }

  return (
    <div className="ship-list-panel">
      <div className="panel-header">
        <h2>舰队部署</h2>
        <div className="deploy-count">
          <span className="count">{deployedCount}</span>
          <span className="max">/ {maxDeploy}</span>
        </div>
      </div>

      <div className="ship-cards">
        {(Object.keys(SHIP_CONFIGS) as ShipType[]).map(type => {
          const config = SHIP_CONFIGS[type]
          const deployed = getDeployedOfType(type)
          const isSelected = selectedType === type

          return (
            <div
              key={type}
              draggable={phase === 'deploy' && deployed < 10}
              onDragStart={(e) => handleDragStart(e, type)}
              onDragEnd={handleDragEnd}
              className={`ship-card ${isSelected ? 'selected' : ''} ${phase !== 'deploy' ? 'disabled' : ''}`}
              style={{ '--ship-color': typeColors[type] } as React.CSSProperties}
            >
              <div className="card-icon">{shipIcons[type]}</div>
              <div className="card-name">{config.name}</div>
              <div className="card-stars">
                {'★'.repeat(config.starRating)}
                {'☆'.repeat(5 - config.starRating)}
              </div>
              <div className="card-stats">
                <div className="stat"><span>血量</span><b>{config.stats.maxHp}</b></div>
                <div className="stat"><span>攻击</span><b>{config.stats.attack}</b></div>
                <div className="stat"><span>射程</span><b>{config.stats.range}</b></div>
                <div className="stat"><span>速度</span><b>{config.stats.speed}</b></div>
              </div>
              <div className="card-skill">
                <div className="skill-icon" style={{ background: config.skills[0].color }}>
                  {config.skills[0].type === 'emp' ? '⚡' :
                   config.skills[0].type === 'repair' ? '💚' :
                   config.skills[0].type === 'airstrike' ? '💥' : '🛡️'}
                </div>
                <span>{config.skills[0].name}</span>
              </div>
              <div className="deployed-badge">已部署 {deployed}</div>
            </div>
          )
        })}
      </div>

      {playerShips.length > 0 && phase === 'deploy' && (
        <div className="deployed-list">
          <h3>已部署战舰</h3>
          <div className="deployed-items">
            {playerShips.map(ship => (
              <div key={ship.id} className="deployed-item"
                style={{ borderLeftColor: typeColors[ship.type] }}>
                <span className="name">{ship.name}</span>
                {ship.isFlagship && <span className="flagship-tag">旗舰</span>}
                <button onClick={() => removeShip(ship.id)} className="remove-btn">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === 'deploy' && (
        <button
          className="start-battle-btn"
          disabled={playerShips.length === 0}
          onClick={() => engine?.startBattle()}
        >
          ⚔️ 开始战斗
        </button>
      )}
    </div>
  )
}
