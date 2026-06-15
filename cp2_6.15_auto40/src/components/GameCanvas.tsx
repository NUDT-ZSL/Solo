import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../game/GameEngine';
import type { Difficulty } from './DifficultySelect';

interface GameCanvasProps {
  difficulty: Difficulty;
  nickname: string;
  onGameOver: (score: number) => void;
  audioUrl?: string;
}

const difficultyMultiplier: Record<Difficulty, number> = {
  easy: 0.7,
  normal: 1.0,
  hard: 1.4,
};

const GameCanvas: React.FC<GameCanvasProps> = ({ difficulty, nickname, onGameOver, audioUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [score, setScore] = useState(0);

  const handleScoreChange = useCallback((newScore: number) => {
    setScore(newScore);
  }, []);

  const handleGameEnd = useCallback((result: { score: number; duration: number }) => {
    onGameOver(result.score);
  }, [onGameOver]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine({
      canvas: canvasRef.current,
      audioUrl: audioUrl,
      onScoreChange: handleScoreChange,
      onGameEnd: handleGameEnd,
    });

    engineRef.current = engine;

    (engine as any).trackSpeed = 80 * difficultyMultiplier[difficulty];

    engine.start();

    return () => {
      engine.destroy();
    };
  }, [difficulty, audioUrl, handleScoreChange, handleGameEnd]);

  return (
    <div className="game-canvas-container">
      <div className="game-info-bar">
        <div className="game-info-item">
          <div className="game-info-label">玩家</div>
          <div className="game-info-value">{nickname}</div>
        </div>
        <div className="game-info-item">
          <div className="game-info-label">得分</div>
          <div className="game-info-value">{score.toLocaleString()}</div>
        </div>
        <div className="game-info-item">
          <div className="game-info-label">难度</div>
          <div className="game-info-value">
            {difficulty === 'easy' ? '简单' : difficulty === 'normal' ? '普通' : '困难'}
          </div>
        </div>
      </div>
      <div className="game-track">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', borderRadius: '14px' }}
        />
      </div>
    </div>
  );
};

export default GameCanvas;
