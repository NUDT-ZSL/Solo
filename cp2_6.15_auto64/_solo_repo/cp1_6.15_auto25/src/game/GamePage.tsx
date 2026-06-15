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
  const lastScoreRef = useRef(0);

  const handleGameOver = useCallback((score: number, kills: number, duration: number) => {
    setFinalScore(score);
    setFinalKills(kills);
    setFinalDuration(duration);
    setGameEnded(true);
  }, []);

  const triggerScoreBounce = useCallback(() => {
    setScoreBounce(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setScoreBounce(true);
        setTimeout(() => setScoreBounce(false), 200);
      });
    });
  }, []);

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (engineRef.current) {
      engineRef.current.stop();
    }
    cancelAnimationFrame(rafRef.current);

    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.start(handleGameOver);
    lastScoreRef.current = 0;

    const scoreTicker = () => {
      if (engine.getState() && !engine.getState().gameOver) {
        const newScore = engine.getState().score;
        if (newScore !== lastScoreRef.current) {
          lastScoreRef.current = newScore;
          setDisplayScore(newScore);
          triggerScoreBounce();
        }
      }
      rafRef.current = requestAnimationFrame(scoreTicker);
    };
    rafRef.current = requestAnimationFrame(scoreTicker);
  }, [handleGameOver, triggerScoreBounce]);

  useEffect(() => {
    startGame();
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
      cancelAnimationFrame(rafRef.current);
    };
  }, [startGame]);

  const handleSaveAndBack = () => {
    onGameOver(nickname, finalScore, finalKills, finalDuration);
    onBack();
  };

  const handleRestart = () => {
    setGameEnded(false);
    setDisplayScore(0);
    setNickname('');
    startGame();
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
