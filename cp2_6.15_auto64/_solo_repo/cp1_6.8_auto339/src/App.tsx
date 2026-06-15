import React, { useState, useCallback } from 'react';
import GameCanvas from './GameCanvas';
import ControlPanel from './ControlPanel';
import { GameState, createInitialState, getTotalLevels } from './GameLogic';
import { getLevelDef } from './GameLogic';

const App: React.FC = () => {
  const [levelIndex, setLevelIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(0));

  const handleStateUpdate = useCallback((newState: GameState) => {
    setGameState(newState);
  }, []);

  const handleReset = useCallback(() => {
    setGameState(createInitialState(levelIndex));
  }, [levelIndex]);

  const handleNextLevel = useCallback(() => {
    const next = levelIndex + 1;
    if (next < getTotalLevels()) {
      setLevelIndex(next);
      setGameState(createInitialState(next));
    }
  }, [levelIndex]);

  const handleSelectLevel = useCallback((idx: number) => {
    setLevelIndex(idx);
    setGameState(createInitialState(idx));
  }, []);

  const levelDef = getLevelDef(levelIndex);
  const totalLevels = getTotalLevels();

  const titleOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 20,
    left: 24,
    zIndex: 10,
    userSelect: 'none',
    pointerEvents: 'none',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 700,
    color: '#d0e0ff',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    textShadow: '0 0 20px rgba(80,150,255,0.4)',
    marginBottom: 4,
    letterSpacing: 2,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 13,
    color: '#7888a8',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  };

  const levelSelectorStyle: React.CSSProperties = {
    position: 'fixed',
    top: 20,
    right: 20,
    display: 'flex',
    gap: 6,
    zIndex: 10,
    userSelect: 'none',
  };

  const levelDotStyle = (idx: number): React.CSSProperties => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    border: idx === levelIndex ? '2px solid #88bbff' : '1.5px solid rgba(100,150,255,0.3)',
    background: idx === levelIndex ? '#4488cc' : 'rgba(30,30,60,0.6)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  const hintStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 20,
    left: 24,
    fontSize: 12,
    color: '#556688',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    zIndex: 10,
    userSelect: 'none',
    pointerEvents: 'none',
  };

  const wonOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5,5,20,0.5)',
    zIndex: 20,
    userSelect: 'none',
    animation: 'fadeIn 0.5s ease',
  };

  const wonTitleStyle: React.CSSProperties = {
    fontSize: 36,
    fontWeight: 700,
    color: '#88ffaa',
    textShadow: '0 0 30px rgba(80,255,120,0.5)',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    marginBottom: 12,
  };

  const wonSubStyle: React.CSSProperties = {
    fontSize: 16,
    color: '#a0b8d0',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  };

  const lostOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(5,5,20,0.5)',
    zIndex: 20,
    userSelect: 'none',
    animation: 'fadeIn 0.5s ease',
  };

  const lostTitleStyle: React.CSSProperties = {
    fontSize: 36,
    fontWeight: 700,
    color: '#ff8888',
    textShadow: '0 0 30px rgba(255,80,80,0.5)',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    marginBottom: 12,
  };

  const lostSubStyle: React.CSSProperties = {
    fontSize: 16,
    color: '#a0b8d0',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  };

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <GameCanvas gameState={gameState} onStateUpdate={handleStateUpdate} />

      <div style={titleOverlayStyle}>
        <div style={titleStyle}>星轨编织者</div>
        <div style={subtitleStyle}>{levelDef.name}</div>
      </div>

      <div style={levelSelectorStyle}>
        {Array.from({ length: totalLevels }, (_, i) => (
          <div
            key={i}
            style={levelDotStyle(i)}
            onClick={() => handleSelectLevel(i)}
            onMouseEnter={(e) => {
              if (i !== levelIndex) {
                (e.target as HTMLElement).style.background = 'rgba(60,80,120,0.6)';
              }
            }}
            onMouseLeave={(e) => {
              if (i !== levelIndex) {
                (e.target as HTMLElement).style.background = 'rgba(30,30,60,0.6)';
              }
            }}
          />
        ))}
      </div>

      <ControlPanel
        gameState={gameState}
        onReset={handleReset}
        onNextLevel={handleNextLevel}
        totalLevels={totalLevels}
      />

      {gameState.phase === 'idle' && (
        <div style={hintStyle}>
          拖拽绘制引力线 → 改变小行星方向 → 撞击星门解锁
        </div>
      )}

      {gameState.phase === 'won' && (
        <div style={wonOverlayStyle} onClick={handleReset}>
          <div style={wonTitleStyle}>✨ 通关成功 ✨</div>
          <div style={wonSubStyle}>
            {levelIndex < totalLevels - 1 ? '点击任意处继续，或使用下一关按钮' : '恭喜通关所有关卡！'}
          </div>
        </div>
      )}

      {gameState.phase === 'lost' && (
        <div style={lostOverlayStyle} onClick={handleReset}>
          <div style={lostTitleStyle}>💫 星轨断绝</div>
          <div style={lostSubStyle}>点击任意处重试</div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default App;
