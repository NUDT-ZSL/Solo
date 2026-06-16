import React, { useState, useCallback, useRef, useEffect } from 'react';
import GameBoard from './ui/GameBoard';
import UIPanel from './ui/UIPanel';
import Leaderboard from './ui/Leaderboard';
import { GameEngine } from './game/GameEngine';
import { GameStatus } from './game/types';

const API_BASE = '/api';

export default function App() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [playerName, setPlayerName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 999999));
  const [level, setLevel] = useState(1);
  const engineRef = useRef<GameEngine | null>(null);

  const startGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.destroy();
    }
    const eng = new GameEngine(seed, level);
    engineRef.current = eng;
    setEngine(eng);
    setGameStatus('playing');
    setGameStarted(true);
    setPlayerName(nameInput.trim() || '无名冒险者');
  }, [seed, level, nameInput]);

  const handleWin = useCallback(() => {
    setGameStatus('won');
    const eng = engineRef.current;
    if (eng) {
      fetch(`${API_BASE}/save-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: playerName || '无名冒险者',
          steps: eng.getLevel(),
          level: eng.getLevel(),
        }),
      }).catch(() => {});
    }
  }, [playerName]);

  const handleLose = useCallback(() => {
    setGameStatus('lost');
  }, []);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  if (!gameStarted) {
    return (
      <div className="app-start-screen">
        <h1 className="title">暗影地牢</h1>
        <p className="subtitle">在黑暗中探索，感知即生存</p>
        <div className="start-form">
          <div className="form-row">
            <label>冒险者名称</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="输入你的名字"
              maxLength={12}
            />
          </div>
          <div className="form-row">
            <label>种子</label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
            />
          </div>
          <div className="form-row">
            <label>难度层数</label>
            <input
              type="number"
              min={1}
              max={10}
              value={level}
              onChange={(e) => setLevel(Math.max(1, Math.min(10, Number(e.target.value))))}
            />
          </div>
          <button className="start-btn" onClick={startGame}>
            进入地牢
          </button>
        </div>
        <button className="lb-btn" onClick={() => setShowLeaderboard(true)}>
          排行榜
        </button>
        {showLeaderboard && (
          <div className="lb-modal">
            <div className="lb-modal-content">
              <Leaderboard />
              <button className="close-btn" onClick={() => setShowLeaderboard(false)}>
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-game-screen">
      <div className="game-area">
        <div className="left-panel">
          <UIPanel engine={engine!} />
        </div>
        <div className="center-canvas">
          {engine && (
            <GameBoard engine={engine} onWin={handleWin} onLose={handleLose} />
          )}
        </div>
        <div className="right-panel">
          <div className="controls-hint">
            <h3>操作指南</h3>
            <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</div>
            <div><kbd>F</kbd> 闪光弹</div>
            <div><kbd>E</kbd> 回声探测</div>
          </div>
          <button className="restart-btn" onClick={startGame}>
            重新开始
          </button>
          <button className="lb-btn-sm" onClick={() => setShowLeaderboard(true)}>
            排行榜
          </button>
        </div>
      </div>
      {showLeaderboard && (
        <div className="lb-modal">
          <div className="lb-modal-content">
            <Leaderboard />
            <button className="close-btn" onClick={() => setShowLeaderboard(false)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
