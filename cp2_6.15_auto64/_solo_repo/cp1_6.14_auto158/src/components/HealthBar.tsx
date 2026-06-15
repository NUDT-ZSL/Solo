import React, { useState, useEffect } from 'react'

interface HealthBarProps {
  current: number
  max: number
  shield?: number
  position: 'top' | 'bottom'
  playerName: string
  isCurrentPlayer?: boolean
}

export const HealthBar: React.FC<HealthBarProps> = ({
  current,
  max,
  shield = 0,
  position,
  playerName,
  isCurrentPlayer = false,
}) => {
  const healthPercent = Math.max(0, Math.min(100, (current / max) * 100))

  return (
    <div className={`health-bar-container ${position} ${isCurrentPlayer ? 'active' : ''}`}>
      <div className="player-name">{playerName}</div>
      <div className="health-bar-wrapper">
        <div className="health-bar-bg">
          <div
            className="health-bar-fill"
            style={{ width: `${healthPercent}%` }}
          />
          {shield > 0 && (
            <div
              className="shield-bar-fill"
              style={{ width: `${Math.min(100, (shield / max) * 100)}%` }}
            />
          )}
        </div>
        <span className="health-text">
          {current}/{max}
          {shield > 0 && <span className="shield-text"> +{shield}🛡</span>}
        </span>
      </div>
    </div>
  )
}
