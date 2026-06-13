import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameData } from './types';
import { GameEngine } from './game/GameEngine';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_BG, COLOR_BORDER } from './constants';
import HUD from './ui/HUD';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);

  const handleStateChange = useCallback((data: GameData) => {
    setGameData(data);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine();
    engineRef.current = engine;
    engine.init(canvasRef.current, handleStateChange);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleStateChange]);

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restart();
    }
  };

  const isDead = gameData?.status === 'dead';

  return (
    <div style={containerStyle}>
      <div style={gameWrapperStyle}>
        <div style={canvasContainerStyle}>
          <HUD data={gameData ?? {
            status: 'playing',
            player: { x: 0, y: 0, hp: 100, maxHp: 100, attack: 10, gold: 0, speed: 2, inventory: [], radius: 8 },
            currentRoomId: 0,
            rooms: [],
            seed: 0,
            unlockedItems: [],
            frameCount: 0,
            transitionAlpha: 1,
            damageFlash: 0,
          }} />
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={canvasStyle}
          />
          {isDead && (
            <div style={restartButtonContainerStyle}>
              <button onClick={handleRestart} style={restartButtonStyle}>
                重新开始
              </button>
            </div>
          )}
        </div>
        <div style={controlsHintStyle}>
          WASD 移动 · E 打开宝箱 · 到达门口进入下一房间
        </div>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  background: COLOR_BG,
  margin: 0,
  padding: 0,
};

const gameWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
};

const canvasContainerStyle: React.CSSProperties = {
  position: 'relative',
  border: `4px solid ${COLOR_BORDER}`,
  borderRadius: 4,
  overflow: 'hidden',
  boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 80px rgba(0,0,0,0.4)',
};

const canvasStyle: React.CSSProperties = {
  display: 'block',
  background: COLOR_BG,
};

const restartButtonContainerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 140,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 20,
};

const restartButtonStyle: React.CSSProperties = {
  padding: '12px 32px',
  fontSize: 20,
  fontFamily: 'sans-serif',
  background: 'linear-gradient(180deg, #cc3333, #991111)',
  color: '#ffffff',
  border: '2px solid #ff4444',
  borderRadius: 6,
  cursor: 'pointer',
  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  transition: 'transform 0.1s, box-shadow 0.1s',
};

const controlsHintStyle: React.CSSProperties = {
  color: '#555566',
  fontSize: 13,
  fontFamily: 'monospace',
  letterSpacing: 1,
};

export default App;
