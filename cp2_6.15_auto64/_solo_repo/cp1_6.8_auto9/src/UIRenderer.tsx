import React, { useEffect, useRef, useCallback } from 'react';
import { GameEngine, GameSnapshot, GameState, Dimension } from './GameEngine';

const engine = new GameEngine();

export const UIRenderer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = React.useState<GameSnapshot>({
    gameState: GameState.Menu,
    currentDimension: Dimension.Reality,
    currentLevel: 0,
    timeRemaining: 0,
    fragmentsCollected: 0,
    totalFragments: 0,
    playerHealth: 5,
    maxHealth: 5,
    bossHealth: 0,
    bossMaxHealth: 0,
    isMobile: false,
    transitionProgress: 0,
    levelName: '',
    isPortalActive: false,
    bossWeakPointExposed: false,
  });
  const joystickRef = useRef<{ active: boolean; startX: number; startY: number; dx: number; dy: number }>({
    active: false, startX: 0, startY: 0, dx: 0, dy: 0,
  });

  useEffect(() => {
    if (canvasRef.current) {
      engine.init(canvasRef.current);
      engine.setOnStateChange(setSnapshot);
      engine.start();
    }
    const handleKey = () => engine.handleKeyPress();
    window.addEventListener('keydown', handleKey);
    return () => {
      engine.stop();
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const handleCanvasClick = useCallback(() => {
    engine.handleCanvasClick(0, 0);
  }, []);

  const handleSwitchDimension = useCallback(() => {
    engine.requestDimensionSwitch();
  }, []);

  const handleAttack = useCallback(() => {
    engine.requestAttack();
  }, []);

  const handleDecoy = useCallback(() => {
    engine.requestDecoy();
  }, []);

  const handleJoystickStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    joystickRef.current = { active: true, startX: touch.clientX, startY: touch.clientY, dx: 0, dy: 0 };
  }, []);

  const handleJoystickMove = useCallback((e: React.TouchEvent) => {
    if (!joystickRef.current.active) return;
    const touch = e.touches[0];
    const dx = (touch.clientX - joystickRef.current.startX) / 50;
    const dy = (touch.clientY - joystickRef.current.startY) / 50;
    joystickRef.current.dx = Math.max(-1, Math.min(1, dx));
    joystickRef.current.dy = Math.max(-1, Math.min(1, dy));
    engine.setTouchJoystick(joystickRef.current.dx, joystickRef.current.dy);
  }, []);

  const handleJoystickEnd = useCallback(() => {
    joystickRef.current = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
    engine.setTouchJoystick(0, 0);
  }, []);

  const formatTime = (ms: number): string => {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const isInGame = snapshot.gameState === GameState.Playing ||
    snapshot.gameState === GameState.DimensionTransition ||
    snapshot.gameState === GameState.BossFight ||
    snapshot.gameState === GameState.LevelTransition;

  const isBossFight = snapshot.gameState === GameState.BossFight;

  return (
    <div ref={containerRef} style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: '#1a1a1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          display: 'block',
          cursor: 'pointer',
        }}
      />

      {isInGame && (
        <>
          {/* Level Info - Top */}
          <div style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            pointerEvents: 'none',
            zIndex: 10,
          }}>
            <div style={{
              fontFamily: '"KaiTi", "STKaiti", serif',
              fontSize: 18,
              color: '#e8dcc8',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              marginBottom: 4,
            }}>
              第 {snapshot.currentLevel} 关 · {snapshot.levelName}
            </div>
            {snapshot.isPortalActive && (
              <div style={{
                fontFamily: '"KaiTi", "STKaiti", serif',
                fontSize: 13,
                color: '#6a9aff',
                textShadow: '0 0 8px rgba(100,150,255,0.5)',
                animation: 'pulse 1.5s infinite',
              }}>
                ✦ 传送门已开启 ✦
              </div>
            )}
          </div>

          {/* Dimension Indicator - Bottom Left */}
          <div style={{
            position: 'absolute',
            bottom: 24,
            left: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            pointerEvents: 'none',
            zIndex: 10,
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: snapshot.currentDimension === Dimension.Reality
                ? 'conic-gradient(from 0deg, #e8dcc8 0%, #3a3020 50%, #e8dcc8 100%)'
                : 'conic-gradient(from 0deg, #4a6a9a 0%, #8af 50%, #4a6a9a 100%)',
              border: '2px solid rgba(255,255,255,0.3)',
              animation: 'spin 4s linear infinite',
              boxShadow: snapshot.currentDimension === Dimension.Reality
                ? '0 0 12px rgba(200,180,140,0.4)'
                : '0 0 12px rgba(100,150,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: '"KaiTi", serif',
                fontSize: 12,
                color: '#fff',
                textShadow: '0 0 4px rgba(0,0,0,0.8)',
              }}>
                {snapshot.currentDimension === Dimension.Reality ? '现' : '镜'}
              </span>
            </div>
            <div style={{
              fontFamily: '"KaiTi", serif',
              fontSize: 13,
              color: snapshot.currentDimension === Dimension.Reality ? '#c8b8a0' : '#7a9ac0',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            }}>
              {snapshot.currentDimension === Dimension.Reality ? '现实之境' : '镜中之世'}
            </div>
          </div>

          {/* Timer & Fragments - Bottom Right */}
          <div style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
            pointerEvents: 'none',
            zIndex: 10,
          }}>
            <div style={{
              fontFamily: '"KaiTi", serif',
              fontSize: 22,
              color: snapshot.timeRemaining < 10000 ? '#cc3333' : '#e8dcc8',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}>
              {formatTime(snapshot.timeRemaining)}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{
                fontFamily: '"KaiTi", serif',
                fontSize: 13,
                color: '#ffd700',
                textShadow: '0 0 6px rgba(255,215,0,0.4)',
              }}>
                ◆ {snapshot.fragmentsCollected}/{snapshot.totalFragments}
              </span>
              <div style={{
                width: 100,
                height: 8,
                background: 'rgba(0,0,0,0.5)',
                borderRadius: 4,
                overflow: 'hidden',
                border: '1px solid rgba(255,215,0,0.3)',
              }}>
                <div style={{
                  width: `${snapshot.totalFragments > 0 ? (snapshot.fragmentsCollected / snapshot.totalFragments) * 100 : 0}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ffd700, #ffaa00)',
                  borderRadius: 4,
                  transition: 'width 0.3s ease',
                  boxShadow: '0 0 6px rgba(255,215,0,0.6)',
                }} />
              </div>
            </div>
          </div>

          {/* Boss Health Bar */}
          {isBossFight && snapshot.bossMaxHealth > 0 && (
            <div style={{
              position: 'absolute',
              top: 60,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 300,
              pointerEvents: 'none',
              zIndex: 10,
            }}>
              <div style={{
                fontFamily: '"KaiTi", serif',
                fontSize: 14,
                color: '#e8dcc8',
                textAlign: 'center',
                marginBottom: 4,
                textShadow: '0 0 8px rgba(0,0,0,0.8)',
              }}>
                镜魔
              </div>
              <div style={{
                width: '100%',
                height: 12,
                background: 'rgba(0,0,0,0.6)',
                borderRadius: 6,
                overflow: 'hidden',
                border: '1px solid rgba(200,200,200,0.3)',
              }}>
                <div style={{
                  width: `${(snapshot.bossHealth / snapshot.bossMaxHealth) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #cc2222, #ff4444)',
                  borderRadius: 6,
                  transition: 'width 0.5s ease',
                  boxShadow: '0 0 8px rgba(255,50,50,0.5)',
                }} />
              </div>
              {snapshot.bossWeakPointExposed && (
                <div style={{
                  textAlign: 'center',
                  marginTop: 6,
                  fontFamily: '"KaiTi", serif',
                  fontSize: 13,
                  color: '#ff4444',
                  animation: 'pulse 0.8s infinite',
                  textShadow: '0 0 10px rgba(255,50,50,0.8)',
                }}>
                  ⚡ 弱点暴露！攻击镜面裂纹！⚡
                </div>
              )}
            </div>
          )}

          {/* Desktop Controls Hint */}
          {!snapshot.isMobile && isInGame && (
            <div style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: '"KaiTi", serif',
              fontSize: 11,
              color: 'rgba(200,190,170,0.5)',
              pointerEvents: 'none',
              zIndex: 10,
            }}>
              空格:切换维度 | ←→:移动 | ↑:跳跃 {isBossFight ? '| E:攻击 | Q:误导' : ''}
            </div>
          )}

          {/* Mobile Controls */}
          {snapshot.isMobile && isInGame && (
            <>
              {/* Virtual Joystick */}
              <div
                onTouchStart={handleJoystickStart}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
                style={{
                  position: 'absolute',
                  bottom: 40,
                  left: 30,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 20,
                }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.3)',
                  transform: `translate(${joystickRef.current.dx * 20}px, ${joystickRef.current.dy * 20}px)`,
                  transition: 'transform 0.05s',
                }} />
              </div>

              {/* Dimension Switch Button */}
              <div
                onTouchStart={(e) => { e.preventDefault(); handleSwitchDimension(); }}
                style={{
                  position: 'absolute',
                  bottom: 60,
                  right: 30,
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: snapshot.currentDimension === Dimension.Reality
                    ? 'rgba(200,180,140,0.3)'
                    : 'rgba(100,150,255,0.3)',
                  border: `2px solid ${snapshot.currentDimension === Dimension.Reality ? 'rgba(200,180,140,0.5)' : 'rgba(100,150,255,0.5)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: '"KaiTi", serif',
                  fontSize: 16,
                  color: '#e8dcc8',
                  zIndex: 20,
                }}
              >
                {snapshot.currentDimension === Dimension.Reality ? '镜' : '现'}
              </div>

              {/* Attack Button (Boss Fight) */}
              {isBossFight && (
                <>
                  <div
                    onTouchStart={(e) => { e.preventDefault(); handleAttack(); }}
                    style={{
                      position: 'absolute',
                      bottom: 130,
                      right: 30,
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(255,80,80,0.3)',
                      border: '2px solid rgba(255,80,80,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: '"KaiTi", serif',
                      fontSize: 14,
                      color: '#ff8888',
                      zIndex: 20,
                    }}
                  >
                    攻
                  </div>
                  <div
                    onTouchStart={(e) => { e.preventDefault(); handleDecoy(); }}
                    style={{
                      position: 'absolute',
                      bottom: 130,
                      right: 90,
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(255,200,80,0.3)',
                      border: '2px solid rgba(255,200,80,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: '"KaiTi", serif',
                      fontSize: 12,
                      color: '#ffcc88',
                      zIndex: 20,
                    }}
                  >
                    诱
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default UIRenderer;
