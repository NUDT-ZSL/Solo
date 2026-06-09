import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameState } from './GameEngine';
import { ParticleSystem } from './ParticleSystem';
import { AudioManager } from './AudioManager';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const pointerDownRef = useRef<boolean>(false);

  const [state, setState] = useState<GameState>({
    score: 0, level: 1, timeLeft: 60,
    placedCount: 0, totalSlots: 6,
    isPaused: false, isGameOver: false,
    showFullscreenFlash: false, flashProgress: 0
  });
  const [showGameOver, setShowGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [levelUpMsg, setLevelUpMsg] = useState('');
  const [musicStarted, setMusicStarted] = useState(false);

  const startMusicOnce = useCallback(() => {
    if (!musicStarted && audioRef.current) {
      audioRef.current.playBgMus();
      setMusicStarted(true);
    }
  }, [musicStarted]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const particles = new ParticleSystem();
    particlesRef.current = particles;

    const audio = new AudioManager();
    audioRef.current = audio;

    const engine = new GameEngine(canvasRef.current, particles, audio, {
      onStateChange: (s) => setState(s),
      onLevelUp: (lvl) => {
        setLevelUpMsg(`进入第 ${lvl} 层！`);
        setTimeout(() => setLevelUpMsg(''), 1500);
      },
      onGameOver: (score) => {
        setFinalScore(score);
        setShowGameOver(true);
        if (audioRef.current) audioRef.current.stopBgMusic();
      }
    });
    engineRef.current = engine;

    const handleResize = () => {
      engineRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') engineRef.current?.togglePause();
    };
    window.addEventListener('keydown', handleKeyDown);

    const loop = (time: number) => {
      if (!engineRef.current || !canvasRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const last = lastTimeRef.current || time;
      let dt = (time - last) / 1000;
      if (dt > 0.05) dt = 0.05;
      lastTimeRef.current = time;
      const tSec = time / 1000;
      engineRef.current.update(dt, tSec);
      engineRef.current.render(tSec);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      audio.stopBgMusic();
    };
  }, []);

  const getPointerPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    startMusicOnce();
    if (!engineRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerDownRef.current = true;
    const { x, y } = getPointerPos(e);
    engineRef.current.handlePointerDown(x, y);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!engineRef.current || !pointerDownRef.current) return;
    const { x, y } = getPointerPos(e);
    engineRef.current.handlePointerMove(x, y);
  };

  const onPointerUp = () => {
    pointerDownRef.current = false;
    engineRef.current?.handlePointerUp();
  };

  const onRestart = () => {
    setShowGameOver(false);
    setFinalScore(0);
    engineRef.current?.reset();
    if (audioRef.current) {
      audioRef.current.playBgMus();
      setMusicStarted(true);
    }
  };

  const progress = state.totalSlots > 0 ? state.placedCount / state.totalSlots : 0;
  const gradR = Math.round(255 * (1 - progress) + 107 * progress);
  const gradG = Math.round(107 * (1 - progress) + 203 * progress);
  const gradB = Math.round(107 * (1 - progress) + 119 * progress);
  const progressColor = `rgb(${gradR},${gradG},${gradB})`;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0D0D2B 0%, #1A1A4E 100%)',
        fontFamily: 'sans-serif'
      }}
      onPointerDown={(e) => { if (e.target === containerRef.current) startMusicOnce(); }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
          cursor: 'grab'
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      <div
        style={{
          position: 'absolute',
          top: 20, left: 24,
          color: 'white',
          fontSize: 24,
          fontWeight: 'bold',
          textShadow: '0 0 8px rgba(255,255,255,0.6)',
          pointerEvents: 'none'
        }}
      >
        倒计时: {Math.ceil(state.timeLeft)}s
      </div>

      <div
        style={{
          position: 'absolute',
          top: 20, right: 24,
          color: 'white',
          fontSize: 20,
          fontWeight: 'bold',
          textShadow: '0 0 8px rgba(255,255,255,0.6)',
          textAlign: 'right',
          pointerEvents: 'none'
        }}
      >
        <div>得分: {state.score}</div>
        <div style={{ marginTop: 4, fontSize: 16, opacity: 0.9 }}>第 {state.level} 层</div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 14,
            marginBottom: 8,
            textShadow: '0 0 6px rgba(255,255,255,0.5)',
            opacity: 0.85
          }}
        >
          完成进度: {state.placedCount}/{state.totalSlots}
        </div>
        <div
          style={{
            width: 300,
            height: 6,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 0 10px rgba(0,0,0,0.4)'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, #FF6B6B, ${progressColor}, #6BCB77)`,
              borderRadius: 3,
              transition: 'width 0.3s ease-out, background 0.3s',
              boxShadow: '0 0 10px rgba(255,255,255,0.4)'
            }}
          />
        </div>
      </div>

      {levelUpMsg && (
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#00FFCC',
            fontSize: 40,
            fontWeight: 'bold',
            textShadow: '0 0 20px #00FFCC, 0 0 40px #00FFCC',
            pointerEvents: 'none',
            animation: 'levelUpFade 1.5s ease-out forwards'
          }}
        >
          {levelUpMsg}
        </div>
      )}

      {showGameOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(6px)',
            zIndex: 10
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(26,26,78,0.95), rgba(13,13,43,0.98))',
              border: '2px solid rgba(0,255,204,0.4)',
              borderRadius: 16,
              padding: '40px 60px',
              textAlign: 'center',
              boxShadow: '0 0 40px rgba(0,255,204,0.3)',
              minWidth: 340
            }}
          >
            <div
              style={{
                color: 'white',
                fontSize: 36,
                fontWeight: 'bold',
                marginBottom: 20,
                textShadow: '0 0 15px rgba(255,255,255,0.6)'
              }}
            >
              游戏结束
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, marginBottom: 12 }}>
              到达层数: <span style={{ color: '#00FFCC', fontWeight: 'bold' }}>{state.level}</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, marginBottom: 12 }}>
              已拼碎片: <span style={{ color: '#FFD93D', fontWeight: 'bold' }}>{state.placedCount}</span>
            </div>
            <div
              style={{
                color: '#FFB347',
                fontSize: 32,
                marginTop: 20,
                marginBottom: 30,
                fontWeight: 'bold',
                textShadow: '0 0 15px rgba(255,179,71,0.8)'
              }}
            >
              最终得分: {finalScore}
            </div>
            <button
              onClick={onRestart}
              style={{
                padding: '14px 48px',
                fontSize: 18,
                fontWeight: 'bold',
                color: '#0D0D2B',
                background: 'linear-gradient(135deg, #00FFCC, #4D96FF)',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(0,255,204,0.5)',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 30px rgba(0,255,204,0.8)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(0,255,204,0.5)';
              }}
            >
              重新开始
            </button>
          </div>
        </div>
      )}

      {!musicStarted && !showGameOver && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 16,
            textAlign: 'center',
            pointerEvents: 'none',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        >
          点击画布开始游戏<br />
          <span style={{ fontSize: 13, opacity: 0.7 }}>拖拽碎片到对应颜色的槽位 | 按 ESC 暂停</span>
        </div>
      )}

      <style>{`
        @keyframes levelUpFade {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.85; }
        }
        @media (max-width: 1200px) {
          div[style*="fontSize: 24"] { font-size: 20px !important; }
          div[style*="fontSize: 20"] { font-size: 17px !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
