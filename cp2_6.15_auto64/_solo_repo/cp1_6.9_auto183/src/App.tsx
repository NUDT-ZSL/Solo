import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameState } from './gameEngine';
import { AudioManager } from './audioManager';

interface UIState {
  score: number;
  highScore: number;
  lives: number;
  energy: number;
  wave: number;
  comboActive: boolean;
  gameOver: boolean;
}

const HeartIcon: React.FC<{ filled: boolean; scale: number; onClick?: () => void }> = ({ filled, scale, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const size = 28 * scale;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transform: `${clicked ? 'scale(0.85)' : hovered ? 'scale(1.2)' : 'scale(1)'}`,
        transition: 'transform 0.2s ease',
        filter: hovered ? 'drop-shadow(0 0 8px rgba(255,100,150,0.9))' : filled ? 'drop-shadow(0 0 4px rgba(255,80,120,0.6))' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={() => onClick && setClicked(true)}
      onMouseUp={() => { setClicked(false); onClick?.(); }}
      onClick={onClick}
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? '#ff4d6d' : 'rgba(255,77,109,0.2)'}
        stroke={filled ? '#ff8fa3' : 'rgba(255,143,163,0.4)'}
        strokeWidth="1"
      />
    </svg>
  );
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const animFrameRef = useRef<number>(0);
  const scoreAnimRef = useRef<number>(0);

  const [uiState, setUiState] = useState<UIState>({
    score: 0,
    highScore: parseInt(localStorage.getItem('starlightArcherHighScore') || '0', 10),
    lives: 5,
    energy: 1,
    wave: 1,
    comboActive: false,
    gameOver: false,
  });
  const [displayScore, setDisplayScore] = useState(0);
  const [scale, setScale] = useState(1);
  const [showGameOver, setShowGameOver] = useState(false);
  const [restartAnim, setRestartAnim] = useState(false);
  const [uiMounted, setUiMounted] = useState(false);
  const [buttonHover, setButtonHover] = useState(false);
  const [buttonClick, setButtonClick] = useState(false);

  const finalScoreRef = useRef(0);

  const handleStateChange = useCallback((state: GameState) => {
    finalScoreRef.current = state.score;
    setUiState(prev => ({
      ...prev,
      score: state.score,
      highScore: state.highScore,
      lives: state.lives,
      energy: state.energy,
      wave: state.wave,
      comboActive: state.comboActive,
      gameOver: state.gameOver,
    }));
    if (state.gameOver && !showGameOver) {
      setShowGameOver(true);
    }
  }, [showGameOver]);

  useEffect(() => {
    setUiMounted(true);
    const canvas = canvasRef.current!;
    const audio = new AudioManager();
    audioRef.current = audio;

    const events = {
      onScoreChange: () => {},
      onLivesChange: () => {},
      onEnergyChange: () => {},
      onWaveChange: () => {},
      onComboChange: () => {},
      onGameOver: () => {},
      onStateChange: handleStateChange,
    };

    const engine = new GameEngine(canvas, audio, events);
    engineRef.current = engine;
    setScale(engine.getScale());

    const onResize = () => {
      engine.resize();
      setScale(engine.getScale());
    };
    window.addEventListener('resize', onResize);

    const onMouseDown = (e: MouseEvent) => {
      engine.handleMouseDown(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
      engine.handleMouseMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      engine.handleMouseUp();
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        engine.handleMouseDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        engine.handleMouseMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      engine.handleMouseUp();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    engine.start();

    const animateScore = () => {
      if (engineRef.current) {
        setDisplayScore(engineRef.current.getAnimatedScore());
      }
      animFrameRef.current = requestAnimationFrame(animateScore);
    };
    animFrameRef.current = requestAnimationFrame(animateScore);

    return () => {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      cancelAnimationFrame(animFrameRef.current);
      engine.stop();
    };
  }, [handleStateChange]);

  const handleRestart = () => {
    setRestartAnim(true);
    setButtonClick(true);
    setTimeout(() => setButtonClick(false), 200);
    setTimeout(() => {
      if (engineRef.current) {
        engineRef.current.reset();
        engineRef.current.start();
      }
      setShowGameOver(false);
      setDisplayScore(0);
      setRestartAnim(false);
    }, 500);
  };

  const hearts = [];
  for (let i = 0; i < 5; i++) {
    hearts.push(i < uiState.lives);
  }

  const energyBarWidth = 200 * scale;
  const energyBarHeight = 12 * scale;
  const fontSize = Math.floor(24 * Math.max(0.7, scale));
  const waveFontSize = Math.floor(28 * Math.max(0.7, scale));

  const energyPercent = uiState.energy;
  const energyGradient = `linear-gradient(90deg, 
    hsl(${energyPercent * 120}, 100%, 50%) 0%, 
    hsl(${energyPercent * 60 + 30}, 100%, 50%) 100%)`;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
          touchAction: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: `${20 * scale}px`,
          left: `${25 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: `${12 * scale}px`,
          opacity: uiMounted ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: `${6 * scale}px`,
            alignItems: 'center',
            pointerEvents: 'auto',
          }}
        >
          {hearts.map((filled, i) => (
            <HeartIcon key={i} filled={filled} scale={scale} />
          ))}
        </div>

        <div
          style={{
            width: energyBarWidth,
            height: energyBarHeight,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: `${6 * scale}px`,
            border: `${Math.max(1, scale)}px solid rgba(255,255,255,0.3)`,
            overflow: 'hidden',
            boxShadow: '0 0 10px rgba(100,150,255,0.3)',
          }}
        >
          <div
            style={{
              width: `${energyPercent * 100}%`,
              height: '100%',
              background: energyGradient,
              transition: 'width 0.15s ease-out',
              boxShadow: `inset 0 0 ${8 * scale}px rgba(255,255,255,0.3)`,
            }}
          />
        </div>
        <div
          style={{
            color: energyPercent < 0.2 ? '#ff6666' : 'rgba(200,220,255,0.8)',
            fontSize: `${Math.floor(12 * Math.max(0.7, scale))}px`,
            marginTop: `-${4 * scale}px`,
            textShadow: '0 0 4px rgba(0,0,0,0.8)',
          }}
        >
          能量 {Math.round(energyPercent * 100)}%
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: `${20 * scale}px`,
          right: `${25 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: `${6 * scale}px`,
          opacity: uiMounted ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <div
          style={{
            color: '#ffffff',
            fontSize: `${fontSize}px`,
            fontWeight: 600,
            textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 12px rgba(150,180,255,0.4)',
            letterSpacing: `${1 * scale}px`,
          }}
        >
          分数 {displayScore.toLocaleString()}
        </div>
        <div
          style={{
            color: 'rgba(200,200,255,0.8)',
            fontSize: `${Math.floor(fontSize * 0.65)}px`,
            fontWeight: 400,
            textShadow: '0 1px 6px rgba(0,0,0,0.6)',
          }}
        >
          最高分 {uiState.highScore.toLocaleString()}
        </div>
        {uiState.comboActive && (
          <div
            style={{
              color: '#ffd700',
              fontSize: `${Math.floor(fontSize * 0.8)}px`,
              fontWeight: 700,
              textShadow: '0 0 15px rgba(255,215,0,0.9), 0 2px 6px rgba(0,0,0,0.8)',
              animation: 'pulseCombo 0.5s ease infinite alternate',
              marginTop: `${4 * scale}px`,
            }}
          >
            ★ 连击特效 ×2 ★
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: `${30 * scale}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: uiMounted ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <div
          style={{
            color: 'rgba(220,230,255,0.9)',
            fontSize: `${waveFontSize}px`,
            fontWeight: 700,
            textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 15px rgba(150,100,255,0.5)',
            letterSpacing: `${3 * scale}px`,
            textAlign: 'center',
          }}
        >
          — Wave {uiState.wave} —
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: `${10 * scale}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(150,170,200,0.5)',
          fontSize: `${Math.floor(11 * Math.max(0.7, scale))}px`,
          pointerEvents: 'none',
          zIndex: 10,
          opacity: uiMounted ? 1 : 0,
          transition: 'opacity 0.3s ease 0.3s',
        }}
      >
        按住鼠标拖拽绘制箭轨 · 松开发射
      </div>

      {showGameOver && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: `rgba(0,0,0,${restartAnim ? 0 : 0.7})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            opacity: restartAnim ? 0 : 1,
            transition: 'opacity 0.5s ease, background-color 0.5s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: `${30 * scale}px`,
              padding: `${50 * scale}px ${70 * scale}px`,
              background: 'linear-gradient(135deg, rgba(30,10,50,0.95) 0%, rgba(10,0,30,0.95) 100%)',
              border: `${2 * scale}px solid rgba(150,100,255,0.5)`,
              borderRadius: `${20 * scale}px`,
              boxShadow: '0 0 60px rgba(150,100,255,0.3), inset 0 0 40px rgba(50,20,80,0.5)',
              transform: restartAnim ? 'scale(0.9)' : 'scale(1)',
              opacity: restartAnim ? 0 : 1,
              transition: 'transform 0.5s ease, opacity 0.5s ease',
            }}
          >
            <div
              style={{
                fontSize: `${72 * scale}px`,
                fontWeight: 800,
                color: '#ff4466',
                textShadow: '0 0 30px rgba(255,80,120,0.8), 0 4px 20px rgba(0,0,0,0.9)',
                letterSpacing: `${6 * scale}px`,
              }}
            >
              Game Over
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${10 * scale}px` }}>
              <div
                style={{
                  fontSize: `${18 * scale}px`,
                  color: 'rgba(200,180,255,0.7)',
                  letterSpacing: `${2 * scale}px`,
                }}
              >
                最终得分
              </div>
              <div
                style={{
                  fontSize: `${48 * scale}px`,
                  fontWeight: 700,
                  color: '#ffd700',
                  textShadow: '0 0 20px rgba(255,215,0,0.7), 0 2px 10px rgba(0,0,0,0.8)',
                }}
              >
                {uiState.score.toLocaleString()}
              </div>
              {uiState.score >= uiState.highScore && uiState.score > 0 && (
                <div
                  style={{
                    fontSize: `${16 * scale}px`,
                    color: '#44ff88',
                    textShadow: '0 0 10px rgba(100,255,150,0.7)',
                    fontWeight: 600,
                  }}
                >
                  ☆ 新纪录！ ☆
                </div>
              )}
            </div>

            <button
              onClick={handleRestart}
              onMouseEnter={() => setButtonHover(true)}
              onMouseLeave={() => setButtonHover(false)}
              style={{
                marginTop: `${10 * scale}px`,
                padding: `${16 * scale}px ${50 * scale}px`,
                fontSize: `${22 * scale}px`,
                fontWeight: 700,
                color: buttonHover ? '#ffffff' : 'rgba(220,240,255,0.95)',
                background: buttonHover
                  ? 'linear-gradient(135deg, #7a4fff 0%, #4f8fff 100%)'
                  : 'linear-gradient(135deg, #5a2fc8 0%, #2f6fcc 100%)',
                border: `${2 * scale}px solid ${buttonHover ? 'rgba(180,200,255,0.9)' : 'rgba(120,150,255,0.6)'}`,
                borderRadius: `${12 * scale}px`,
                cursor: 'pointer',
                letterSpacing: `${4 * scale}px`,
                transform: buttonClick ? 'scale(0.92)' : buttonHover ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s ease',
                boxShadow: buttonHover
                  ? '0 0 25px rgba(120,150,255,0.7), 0 6px 20px rgba(0,0,0,0.4), inset 0 0 15px rgba(200,220,255,0.2)'
                  : '0 0 12px rgba(100,130,255,0.4), 0 4px 15px rgba(0,0,0,0.3)',
                outline: 'none',
              }}
            >
              重新开始
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseCombo {
          0% { transform: scale(1); filter: brightness(1); }
          100% { transform: scale(1.08); filter: brightness(1.3); }
        }
      `}</style>
    </div>
  );
}
