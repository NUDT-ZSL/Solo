import { useEffect, useState } from 'react';
import { useGameStore } from './useGameStore';
import GameCanvas from './GameCanvas';
import HUD from './HUD';

function App() {
  const { phase, fadeOpacity, titleVisible, startGame, setFadeOpacity, restartGame } = useGameStore();
  const [showTitle, setShowTitle] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      useGameStore.getState().completeTitleAnimation();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    setFadeOpacity(0);
    setTimeout(() => {
      setShowTitle(false);
      startGame();
    }, 300);
  };

  const handleRestart = () => {
    restartGame();
    setShowTitle(true);
    setFadeOpacity(1);
    setTimeout(() => {
      useGameStore.getState().completeTitleAnimation();
    }, 2000);
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      <div className="game-canvas-wrapper">
        <GameCanvas />
      </div>

      {phase !== 'title' && <HUD formatTime={formatTime} />}

      {showTitle && (
        <div
          className="title-screen"
          style={{ opacity: fadeOpacity }}
        >
          <h1 className="title-text">星际陨石</h1>
          <p className="subtitle-text">ASTEROID STRIKE 3D</p>
          <button className="game-btn visible" onClick={handleStart}>
            开始游戏
          </button>
          <div className="controls-hint" style={{ position: 'absolute', bottom: 60, opacity: 0.7 }}>
            WASD 移动 · Q/E 翻滚 · 鼠标瞄准 · 空格射击 · 拖拽旋转视角
          </div>
        </div>
      )}

      {phase === 'gameover' && (
        <div className="game-over-screen">
          <div className="score-panel">
            <h2 className="panel-title">游戏结束</h2>
            <div className="panel-row">
              <span className="panel-label">击毁陨石</span>
              <span className="panel-value">{useGameStore.getState().destroyedCount}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">存活时间</span>
              <span className="panel-value">{formatTime(useGameStore.getState().elapsedTime)}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">总得分</span>
              <span className="panel-value total">{useGameStore.getState().score}</span>
            </div>
            <div className="panel-footer">
              <button className="game-btn" onClick={handleRestart}>
                重新开始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
