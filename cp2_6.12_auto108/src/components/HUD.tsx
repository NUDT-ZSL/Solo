import './HUD.css'

interface HUDProps {
  score: number
  speed: number
  fuel: number
  highScore: number
  isGameOver: boolean
  finalScore: number
  onRestart: () => void
}

export default function HUD({
  score,
  speed,
  fuel,
  highScore,
  isGameOver,
  finalScore,
  onRestart,
}: HUDProps) {
  return (
    <>
      <div className="hud-top-left">
        <div className="hud-item">
          <span className="hud-label">速度</span>
          <span className="hud-value speed">{speed.toFixed(2)}</span>
        </div>
      </div>

      <div className="hud-top-right">
        <div className="hud-item">
          <span className="hud-label">分数</span>
          <span className="hud-value score">{score}</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">最高分</span>
          <span className="hud-value highscore">{highScore}</span>
        </div>
      </div>

      {isGameOver && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2 className="game-over-title">游戏结束</h2>
            <p className="game-over-score">最终得分: {finalScore}</p>
            <p className="game-over-highscore">历史最高: {highScore}</p>
            <button className="btn-restart" onClick={onRestart}>
              再来一局
            </button>
          </div>
        </div>
      )}
    </>
  )
}
