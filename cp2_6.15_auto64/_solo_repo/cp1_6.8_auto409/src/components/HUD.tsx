import React from 'react'

interface HUDProps {
  health: number
  energy: number
  score: number
  gameOver: boolean
  onRestart: () => void
}

const HUD: React.FC<HUDProps> = ({ health, energy, score, gameOver, onRestart }) => {
  return (
    <>
      <div className="hud-top-left">
        <div className="health-section">
          <div className="health-label">HP</div>
          <div className="health-rings">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`health-ring ${i <= health ? 'health-ring-active' : 'health-ring-empty'}`}
              />
            ))}
          </div>
        </div>
        <div className="energy-section">
          <div className="energy-label">ENERGY</div>
          <div className="energy-track">
            <div
              className="energy-fill"
              style={{ width: `${energy}%` }}
            />
            <div className={`energy-glow ${energy >= 100 ? 'energy-glow-full' : ''}`} style={{ width: `${energy}%` }} />
          </div>
          <div className="energy-text">{Math.floor(energy)}%</div>
        </div>
        <div className="score-section">
          <span className="score-label">SCORE</span>
          <span className="score-value">{score.toLocaleString()}</span>
        </div>
      </div>

      {gameOver && (
        <div className="game-over-panel">
          <div className="game-over-box">
            <div className="game-over-title">GAME OVER</div>
            <div className="game-over-score">{score.toLocaleString()}</div>
            <button className="restart-btn" onClick={onRestart}>
              重新开始
            </button>
          </div>
        </div>
      )}

      <div className="hud-bottom-center">
        <div className="controls-hint">
          WASD 移动 · 空格 射击 · Q/E 技能
        </div>
      </div>
    </>
  )
}

export default HUD
