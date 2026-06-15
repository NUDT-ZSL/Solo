import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameData } from './types';
import { GameEngine, OnStateChange } from './game/GameEngine';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLOR_BG, COLOR_BORDER } from './constants';
import HUD, { createHUDPropsFromGameData } from './ui/HUD';

const initialGameData: GameData = {
  status: 'playing',
  player: {
    x: 0, y: 0, hp: 100, maxHp: 100,
    attack: 10, gold: 0, speed: 2,
    inventory: [], radius: 8,
  },
  currentRoomId: 0,
  rooms: [],
  seed: 0,
  unlockedItems: [],
  frameCount: 0,
  transitionAlpha: 1,
  damageFlash: 0,
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameData, setGameData] = useState<GameData>(initialGameData);
  const [engineReady, setEngineReady] = useState(false);

  const handleStateChange: OnStateChange = useCallback(() => {
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (engineRef.current) return;

    const engine = new GameEngine();
    engineRef.current = engine;

    const callback: OnStateChange = (data) => {
      setGameData(data);
      handleStateChange(data);
    };

    try {
      engine.init(canvasRef.current, callback);
      setGameData(engine.getData());
      setEngineReady(true);
    } catch (err) {
      console.error('GameEngine init failed:', err);
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
      setEngineReady(false);
    };
  }, [handleStateChange]);

  const handleRestart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.restart();
      setGameData(engineRef.current.getData());
    }
  }, []);

  const isDead = gameData.status === 'dead';

  const hudProps = createHUDPropsFromGameData(gameData);

  return (
    <div style={containerStyle}>
      <div style={gameWrapperStyle}>
        <div style={canvasContainerStyle}>
          <HUD {...hudProps} />
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={canvasStyle}
          />
          {isDead && engineReady && (
            <div style={restartButtonContainerStyle}>
              <button onClick={handleRestart} style={restartButtonStyle}>
                重新开始
              </button>
            </div>
          )}
        </div>
        <div style={controlsHintStyle}>
          <span style={controlsKeyStyle}>WASD</span>
          <span>移动</span>
          <span style={controlsKeyStyle}>E</span>
          <span>开宝箱</span>
          <span style={controlsKeyStyle}>门口</span>
          <span>进入下一层</span>
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
  padding: '20px 0',
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
  borderRadius: 6,
  overflow: 'hidden',
  boxShadow: '0 0 40px rgba(0,0,0,0.8), 0 0 80px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.02)',
};

const canvasStyle: React.CSSProperties = {
  display: 'block',
  background: COLOR_BG,
  imageRendering: 'pixelated',
};

const restartButtonContainerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 140,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 20,
};

const restartButtonStyle: React.CSSProperties = {
  padding: '14px 40px',
  fontSize: 20,
  fontFamily: "'Segoe UI', sans-serif",
  background: 'linear-gradient(180deg, #cc3333, #881111)',
  color: '#ffffff',
  border: '2px solid #ff6666',
  borderRadius: 8,
  cursor: 'pointer',
  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
  letterSpacing: 2,
  userSelect: 'none',
};

const controlsHintStyle: React.CSSProperties = {
  color: '#555566',
  fontSize: 12,
  fontFamily: 'monospace',
  letterSpacing: 0.5,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 4,
  opacity: 0.85,
};

const controlsKeyStyle: React.CSSProperties = {
  color: '#888899',
  background: 'rgba(255,255,255,0.06)',
  padding: '2px 8px',
  borderRadius: 3,
  marginRight: 2,
  marginLeft: 8,
  fontWeight: 'bold',
  border: '1px solid rgba(255,255,255,0.05)',
};

export default App;
