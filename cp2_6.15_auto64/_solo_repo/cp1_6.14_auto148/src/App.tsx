import { useEffect, useState } from 'react';
import { useGameLoop } from './hooks/useGameLoop';

export default function App() {
  const {
    canvasRef,
    minimapRef,
    containerRef,
    state: gameState,
    start,
    pause,
    resume,
    restart,
  } = useGameLoop();

  const [isPortrait, setIsPortrait] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
      setIsMobile(window.innerWidth < 768);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (gameState.isRunning) {
          if (gameState.isPaused) resume();
          else pause();
        }
      }
      if (e.key === 'r' || e.key === 'R') {
        if (gameState.isRunning || gameState.isGameOver) {
          restart();
        }
      }
      if ((e.key === 'Enter' || e.key === ' ') && !gameState.isRunning && !gameState.isGameOver) {
        start();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState.isRunning, gameState.isPaused, gameState.isGameOver, start, pause, resume, restart]);

  useEffect(() => {
    if (gameState.isRunning && showControls) {
      const t = setTimeout(() => setShowControls(false), 5000);
      return () => clearTimeout(t);
    }
  }, [gameState.isRunning, showControls]);

  const formatTime = (ms: number): string => {
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1e1e1e',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {isPortrait && isMobile && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 24 }}>📱↻</div>
          <h2 style={{ fontSize: 28, margin: 0, marginBottom: 12, color: '#FFD700' }}>
            请旋转设备至横屏
          </h2>
          <p style={{ fontSize: 16, color: '#CCCCCC', lineHeight: 1.6 }}>
            为获得最佳赛车体验，请将设备旋转至横向模式。<br />
            赛车游戏需要更宽的视野来观察赛道。
          </p>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 0.5px rgba(255, 255, 255, 0.05)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              right: 24,
              bottom: 24,
              width: 150,
              height: 150,
              pointerEvents: 'none',
            }}
          >
            <canvas
              ref={minimapRef}
              width={150}
              height={150}
              style={{
                width: 150,
                height: 150,
                borderRadius: 12,
              }}
            />
          </div>

          {!gameState.isRunning && !gameState.isGameOver && (
            <StartScreen onStart={start} isMobile={isMobile} />
          )}

          {gameState.isPaused && gameState.isRunning && (
            <PauseScreen onResume={resume} onRestart={restart} />
          )}

          {gameState.isGameOver && (
            <GameOverScreen
              state={gameState}
              onRestart={restart}
              formatTime={formatTime}
            />
          )}

          {showControls && gameState.isRunning && !gameState.isPaused && (
            <ControlsHint isMobile={isMobile} />
          )}

          {gameState.isRunning && !isMobile && (
            <div
              style={{
                position: 'absolute',
                left: 24,
                bottom: 24,
                display: 'flex',
                gap: 8,
              }}
            >
              <GlassyButton onClick={pause} small>
                ⏸ 暂停
              </GlassyButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StartScreen({ onStart, isMobile }: { onStart: () => void; isMobile: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 10,
      }}
    >
      <div
        style={{
          padding: 40,
          borderRadius: 16,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '0.5px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          maxWidth: 520,
          width: '90%',
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 8 }}>🏁</div>
        <h1
          style={{
            fontSize: 36,
            margin: 0,
            marginBottom: 8,
            color: '#FFFFFF',
            letterSpacing: 2,
            textShadow: '0 0 20px rgba(255, 100, 50, 0.5)',
          }}
        >
          真实赛车模拟器
        </h1>
        <p style={{ fontSize: 14, color: '#FFD700', margin: 0, marginBottom: 28, letterSpacing: 1 }}>
          REALISTIC RACING SIMULATOR
        </p>

        <div
          style={{
            textAlign: 'left',
            padding: 20,
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            marginBottom: 28,
          }}
        >
          <h3 style={{ margin: 0, marginBottom: 12, color: '#FFFFFF', fontSize: 14 }}>
            {isMobile ? '📱 触屏操作' : '🎮 键盘操作'}
          </h3>
          {isMobile ? (
            <div style={{ fontSize: 13, color: '#CCCCCC', lineHeight: 1.9 }}>
              <div>• <span style={{ color: '#00bfff' }}>屏幕左半区</span> - 控制转向（1/4处左转向，3/4处右转向）</div>
              <div>• <span style={{ color: '#4CAF50' }}>屏幕右上区</span> - 油门加速</div>
              <div>• <span style={{ color: '#FF6B6B' }}>屏幕右下区</span> - 刹车减速</div>
              <div>• 多手指可同时按下转向+油门/刹车</div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#CCCCCC', lineHeight: 1.9 }}>
              <div>• <kbd style={kbdStyle}>W</kbd> / <kbd style={kbdStyle}>↑</kbd> - 油门加速</div>
              <div>• <kbd style={kbdStyle}>S</kbd> / <kbd style={kbdStyle}>↓</kbd> - 刹车减速</div>
              <div>• <kbd style={kbdStyle}>A</kbd> / <kbd style={kbdStyle}>←</kbd> - 左转</div>
              <div>• <kbd style={kbdStyle}>D</kbd> / <kbd style={kbdStyle}>→</kbd> - 右转</div>
              <div>• <kbd style={kbdStyle}>P</kbd> / <kbd style={kbdStyle}>Esc</kbd> - 暂停</div>
              <div>• <kbd style={kbdStyle}>R</kbd> - 重新开始</div>
            </div>
          )}
        </div>

        <GlassyButton onClick={onStart} big>
          {isMobile ? '开始比赛 🏎️' : '按下Enter开始比赛 🏎️'}
        </GlassyButton>

        <p style={{ fontSize: 12, color: '#666666', marginTop: 20, marginBottom: 0 }}>
          完成5圈比赛，漂移可获得额外视觉效果
        </p>
      </div>
    </div>
  );
}

function PauseScreen({ onResume, onRestart }: { onResume: () => void; onRestart: () => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 10,
      }}
    >
      <div
        style={{
          padding: 40,
          borderRadius: 16,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '0.5px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏸️</div>
        <h2 style={{ color: '#FFFFFF', margin: 0, marginBottom: 32, fontSize: 32 }}>游戏暂停</h2>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <GlassyButton onClick={onResume}>继续游戏</GlassyButton>
          <GlassyButton onClick={onRestart} secondary>
            重新开始
          </GlassyButton>
        </div>
      </div>
    </div>
  );
}

function GameOverScreen({
  state,
  onRestart,
  formatTime,
}: {
  state: any;
  onRestart: () => void;
  formatTime: (ms: number) => string;
}) {
  const cs = state.currentState;
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 10,
      }}
    >
      <div
        style={{
          padding: 48,
          borderRadius: 16,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '0.5px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          minWidth: 380,
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
        <h2
          style={{
            color: '#FFD700',
            margin: 0,
            marginBottom: 8,
            fontSize: 36,
            textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
          }}
        >
          比赛完成！
        </h2>
        <p style={{ color: '#CCCCCC', margin: 0, marginBottom: 32, fontSize: 14 }}>
          Race Complete
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginBottom: 36,
          }}
        >
          <StatBox label="总用时" value={cs ? formatTime(cs.totalTime) : '--:--.--'} gold />
          <StatBox
            label="最佳单圈"
            value={cs?.bestLapTime ? formatTime(cs.bestLapTime) : '--:--.--'}
          />
          <StatBox label="完成圈数" value={cs ? `${cs.totalLaps}/${cs.totalLaps}` : '0/5'} />
          <StatBox
            label="最高时速"
            value={cs ? `${Math.round(cs.speed * 3.6)} km/h` : '0 km/h'}
          />
        </div>

        <GlassyButton onClick={onRestart} big>
          再来一局 🔄
        </GlassyButton>
      </div>
    </div>
  );
}

function StatBox({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        border: '0.5px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div style={{ fontSize: 11, color: '#888888', marginBottom: 6, letterSpacing: 1 }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: gold ? '#FFD700' : '#FFFFFF',
          textShadow: gold ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ControlsHint({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 90,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '10px 20px',
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '0.5px solid rgba(255, 255, 255, 0.1)',
        fontSize: 12,
        color: '#AAAAAA',
        pointerEvents: 'none',
        animation: 'fadeInOut 5s ease-in-out',
        whiteSpace: 'nowrap',
      }}
    >
      {isMobile ? (
        <>左半区转向 | 右上油门 | 右下刹车</>
      ) : (
        <>
          <kbd style={kbdStyle}>WASD</kbd> 操控车辆 · <kbd style={kbdStyle}>P</kbd> 暂停 · 漂移获得粒子尾迹
        </>
      )}
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function GlassyButton({
  children,
  onClick,
  big,
  small,
  secondary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  big?: boolean;
  small?: boolean;
  secondary?: boolean;
}) {
  const baseStyle: React.CSSProperties = {
    padding: small ? '8px 16px' : big ? '16px 40px' : '12px 28px',
    fontSize: small ? 12 : big ? 18 : 14,
    borderRadius: 12,
    backgroundColor: secondary
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(255, 100, 50, 0.25)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: `0.5px solid ${
      secondary ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 120, 80, 0.4)'
    }`,
    color: secondary ? '#CCCCCC' : '#FFFFFF',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)',
    letterSpacing: 1,
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px) scale(1.02)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = secondary
          ? '0 8px 24px rgba(255, 255, 255, 0.1)'
          : '0 8px 24px rgba(255, 100, 50, 0.3)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(1)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(0.98)';
      }}
      style={baseStyle}
    >
      {children}
    </button>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
  fontSize: 11,
  fontFamily: 'monospace',
  color: '#FFFFFF',
  margin: '0 2px',
};
