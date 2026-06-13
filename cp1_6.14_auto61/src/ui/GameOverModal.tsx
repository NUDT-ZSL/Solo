import React from 'react';

interface GameOverModalProps {
  score: number;
  onRestart: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ score, onRestart }) => {
  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        <h1 className="game-over-title">游戏结束</h1>
        <div className="final-score">
          <span className="score-label">最终得分</span>
          <span className="score-value">{score}</span>
        </div>
        <button className="restart-button" onClick={onRestart}>
          重新开始
        </button>
      </div>
    </div>
  );
};

export default GameOverModal;
