import React from 'react'

interface GameOverModalProps {
  winner: number | null
  playerIndex: number
  onRestart: () => void
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  playerIndex,
  onRestart,
}) => {
  const isVictory = winner === playerIndex
  const text = isVictory ? '胜利！' : '失败'
  const color = isVictory ? '#ffd700' : '#95a5a6'
  const shadow = isVictory ? '0 0 20px rgba(255, 215, 0, 0.8)' : 'none'

  return (
    <div className="game-over-overlay">
      <div className="game-over-content">
        <h1
          className="game-over-text"
          style={{
            color,
            textShadow: shadow,
          }}
        >
          {text}
        </h1>
        <p className="game-over-subtitle">
          {isVictory ? '你赢得了这场魔法对决！' : '再接再厉，下次一定能赢！'}
        </p>
        <button className="btn btn-primary btn-large" onClick={onRestart}>
          再来一局
        </button>
      </div>
    </div>
  )
}
