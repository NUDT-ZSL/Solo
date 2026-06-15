import { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from './GameEngine';

interface GamePageProps {
  onGameOver: (nickname: string, score: number, kills: number, duration: number) => void;
  onBack: () => void;
}

export default function GamePage({ onGameOver, onBack }: GamePageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [scoreBounce, setScoreBounce] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [nickname, setNickname] = useState('');
  const [finalScore, setFinalScore] = useState(0);
  const [finalKills, setFinalKills] = useState(0);
  const [finalDuration, setFinalDuration] = useState(0);
  const rafRef = useRef<number>(0);

  const handleGameOver = useCallback((score: number, kills: number, duration: number) => {
    setFinalScore(score);
    setFinalKills(kills);
    setFinalDuration(duration);
    setGameEnded(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.start(handleGameOver);

    const scoreTicker = () => {
      if (engine.getState() && !engine.getState().gameOver) {
        const newScore = engine.getState().score;
        setDisplayScore((prev) => {
          if (newScore !== prev) {
            setScoreBounce(true);
            setTimeout(() => setScoreBounce(false), 200);
          }
          return newScore;
        });
      }
      rafRef.current = requestAnimationFrame(scoreTicker);
    };
    rafRef.current = requestAnimationFrame(scoreTicker);

    return () => {
      engine.stop();
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleGameOver]);

  const handleSaveAndBack = () => {
    onGameOver(nickname, finalScore, finalKills, finalDuration);
    onBack();
  };

  const handleRestart = () => {
    setGameEnded(false);
    setDisplayScore(0);
    setNickname('');
    if (engineRef.current) {
      engineRef.current.stop();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.start(handleGameOver);

    cancelAnimationFrame(rafRef.current);
    const scoreTicker = () => {
      if (engine.getState() && !engine.getState().gameOver) {
        const newScore = engine.getState().score;
        setDisplayScore((prev) => {
          if (newScore !== prev) {
            setScoreBounce(true);
            setTimeout(() => setScoreBounce(false), 200);
          }
          return newScore;
        });
      }
      rafRef.current = requestAnimationFrame(scoreTicker);
    };
    rafRef.current = requestAnimationFrame(scoreTicker);
  };

  return (
    <div className="game-wrapper" style={{ position: 'relative' }}>
      <div className={`hud-score${scoreBounce ? ' bounce' : ''}`}>
        得分: {displayScore}
      </div>
      <canvas ref={canvasRef} className="game-canvas" />
      {gameEnded && (
        <div className="game-overlay">
          <div className="score-panel">
            <h2>游戏结束</h2>
            <div className="score-value">{finalScore}</div>
            <div className="stat-line">击碎小行星: {finalKills}</div>
            <div className="stat-line">存活时间: {finalDuration}秒</div>
            <input
              type="text"
              placeholder="输入昵称..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={12}
            />
            <div>
              <button className="panel-btn" onClick={handleSaveAndBack}>
                保存并返回
              </button>
              <button className="panel-btn" onClick={handleRestart}>
                再来一局
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
