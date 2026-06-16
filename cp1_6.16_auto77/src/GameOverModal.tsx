import React from 'react';
import './GameOverModal.css';

interface GameOverModalProps {
  score: number;
  wave: number;
  merges: number;
  luck: number;
  leaderboard: any[];
  onRestart: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  wave,
  merges,
  luck,
  leaderboard,
  onRestart,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">游戏结束</h2>

        <div className="score-section">
          <h3>本次得分</h3>
          <div className="final-score">{score}</div>
          <div className="score-breakdown">
            <div className="score-item">
              <span>波次 ({wave}波 × 50)</span>
              <span>{wave * 50}</span>
            </div>
            <div className="score-item">
              <span>合成 ({merges}次 × 10)</span>
              <span>{merges * 10}</span>
            </div>
            <div className="score-item">
              <span>气运值 ({luck} × 2)</span>
              <span>{luck * 2}</span>
            </div>
          </div>
        </div>

        <div className="leaderboard-section">
          <h3>排行榜</h3>
          <div className="leaderboard-list">
            {leaderboard.slice(0, 10).map((entry, index) => (
              <div key={entry.id} className="leaderboard-item">
                <span className={`rank rank-${index + 1}`}>{index + 1}</span>
                <span className="player-name">{entry.name}</span>
                <span className="player-score">{entry.score}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="restart-button" onClick={onRestart}>
          再来一局
        </button>
      </div>
    </div>
  );
};

export default GameOverModal;
