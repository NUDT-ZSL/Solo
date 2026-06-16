import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../game/GameEngine';
import { Toolbar } from './Toolbar';
import {
  GameState,
  BuildingType,
  BUILDING_CONFIGS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '../game/entities';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const renderFrameRef = useRef<number>(0);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOverVisible, setGameOverVisible] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  useEffect(() => {
    const engine = new GameEngine();
    engineRef.current = engine;

    engine.setOnStateChange((state) => {
      setGameState(state);
    });

    setGameState(engine.getState());
    engine.start();

    const renderLoop = () => {
      const canvas = canvasRef.current;
      if (canvas && engineRef.current) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          engineRef.current.render(ctx);
        }
      }
      renderFrameRef.current = requestAnimationFrame(renderLoop);
    };
    renderFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      engine.stop();
      cancelAnimationFrame(renderFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameState?.gameOver) {
      setGameOverVisible(true);
      setTimeout(() => setPanelVisible(true), 100);
    } else {
      setGameOverVisible(false);
      setPanelVisible(false);
    }
  }, [gameState?.gameOver]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    engine.handleClick(x, y);
  }, []);

  const handleSelectBuilding = useCallback((type: BuildingType) => {
    if (!engineRef.current) return;
    const current = engineRef.current.getState().selectedBuilding;
    engineRef.current.selectBuilding(current === type ? null : type);
  }, []);

  const handleRestart = useCallback(() => {
    if (!engineRef.current) return;
    setGameOverVisible(false);
    setPanelVisible(false);
    setTimeout(() => {
      engineRef.current?.restart();
    }, 500);
  }, []);

  const buttonBaseStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease',
    fontFamily: 'sans-serif',
  };

  const renderBuildingIcon = (type: BuildingType) => {
    const size = 48;
    return (
      <svg width={size} height={size} viewBox="0 0 48 48">
        {type === 'seawall' && (
          <>
            <rect x="14" y="6" width="20" height="36" fill="#888888" stroke="#555" strokeWidth="2" />
            <line x1="16" y1="16" x2="32" y2="16" stroke="#666" strokeWidth="2" />
            <line x1="16" y1="26" x2="32" y2="26" stroke="#666" strokeWidth="2" />
            <line x1="16" y1="36" x2="32" y2="36" stroke="#666" strokeWidth="2" />
          </>
        )}
        {type === 'watchtower' && (
          <>
            <polygon points="24,4 40,40 8,40" fill="#1B5E20" stroke="#0D3D11" strokeWidth="2" />
            <rect x="18" y="22" width="12" height="12" fill="#2E7D32" />
            <circle cx="24" cy="28" r="3" fill="#FFEB3B" />
          </>
        )}
        {type === 'plantation' && (
          <>
            <rect x="6" y="14" width="36" height="24" fill="#D4A76A" stroke="#8B6914" strokeWidth="2" />
            <circle cx="13" cy="22" r="2.5" fill="#4CAF50" />
            <circle cx="24" cy="22" r="2.5" fill="#4CAF50" />
            <circle cx="35" cy="22" r="2.5" fill="#4CAF50" />
            <circle cx="13" cy="32" r="2.5" fill="#4CAF50" />
            <circle cx="24" cy="32" r="2.5" fill="#4CAF50" />
            <circle cx="35" cy="32" r="2.5" fill="#4CAF50" />
          </>
        )}
      </svg>
    );
  };

  if (!gameState) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0A1628',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0A1628',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
        overflow: 'hidden',
      }}
    >
      <Toolbar gameState={gameState} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: 20,
          gap: 20,
        }}
      >
        <div
          style={{
            position: 'relative',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 0 30px rgba(0, 191, 255, 0.2)',
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleCanvasClick}
            style={{
              display: 'block',
              cursor: gameState.selectedBuilding ? 'crosshair' : 'pointer',
            }}
          />
        </div>

        <div
          style={{
            width: 200,
            background: '#1A2A4A',
            borderRadius: 8,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              color: '#fff',
              fontSize: 16,
              fontWeight: 'bold',
              textAlign: 'center',
              paddingBottom: 8,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            建造菜单
          </div>

          {(Object.keys(BUILDING_CONFIGS) as BuildingType[]).map((type) => {
            const config = BUILDING_CONFIGS[type];
            const isSelected = gameState.selectedBuilding === type;
            const canAfford = gameState.energy >= config.cost;

            return (
              <div
                key={type}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <button
                  onClick={() => handleSelectBuilding(type)}
                  disabled={!canAfford}
                  onMouseDown={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = isSelected
                      ? 'scale(1.05)'
                      : 'scale(1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = isSelected
                      ? 'scale(1.05)'
                      : 'scale(1)';
                  }}
                  style={{
                    ...buttonBaseStyle,
                    background: isSelected ? '#4A6A8A' : '#2A3A5A',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    opacity: canAfford ? 1 : 0.4,
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                  }}
                >
                  {renderBuildingIcon(type)}
                </button>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                  {config.name}
                </div>
                <div
                  style={{
                    color: canAfford ? '#00FF88' : '#FF6B6B',
                    fontSize: 12,
                  }}
                >
                  消耗 {config.cost} 能量
                </div>
                <div
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 11,
                    textAlign: 'center',
                    lineHeight: 1.4,
                  }}
                >
                  {config.description}
                </div>
              </div>
            );
          })}

          <div
            style={{
              marginTop: 'auto',
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              存活周期: <span style={{ color: '#FFD700' }}>{gameState.cycleCount}</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              已建造: <span style={{ color: '#00FF88' }}>{gameState.buildingsBuilt}</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              已摧毁:{' '}
              <span style={{ color: '#FF6B6B' }}>
                {gameState.destroyedBuildings}/5
              </span>
            </div>
          </div>
        </div>
      </div>

      {gameOverVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.5s ease',
            opacity: gameOverVisible ? 1 : 0,
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: 40,
              minWidth: 360,
              textAlign: 'center',
              transform: panelVisible ? 'translateY(0)' : 'translateY(100px)',
              transition: 'transform 0.5s ease',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: 24,
                color: '#1A2A4A',
                fontSize: 28,
              }}
            >
              游戏结束
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#f5f5f5',
                  borderRadius: 8,
                }}
              >
                <span style={{ color: '#666', fontSize: 14 }}>总得分</span>
                <span style={{ color: '#FFD700', fontSize: 24, fontWeight: 'bold' }}>
                  {gameState.score}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#f5f5f5',
                  borderRadius: 8,
                }}
              >
                <span style={{ color: '#666', fontSize: 14 }}>存活周期</span>
                <span style={{ color: '#00BFFF', fontSize: 20, fontWeight: 'bold' }}>
                  {gameState.cycleCount}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#f5f5f5',
                  borderRadius: 8,
                }}
              >
                <span style={{ color: '#666', fontSize: 14 }}>建造数量</span>
                <span style={{ color: '#00FF88', fontSize: 20, fontWeight: 'bold' }}>
                  {gameState.buildingsBuilt}
                </span>
              </div>
            </div>

            <button
              onClick={handleRestart}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
              style={{
                padding: '14px 40px',
                fontSize: 18,
                fontWeight: 'bold',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #00BFFF, #000080)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                boxShadow: '0 4px 15px rgba(0, 191, 255, 0.4)',
              }}
            >
              再来一局
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        button:hover {
          transform: scale(1.05) !important;
        }
      `}</style>
    </div>
  );
};
