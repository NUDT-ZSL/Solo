import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GameState,
  LEVELS,
  createGameState,
  updateGame,
  drawGame,
  setFrequency,
  adjustFrequency,
  nextLevel,
  restartGame,
  resizeGame,
} from './GameEngine';

const GAME_DT = 1 / 60;

export const UILayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [frequency, setFreqDisplay] = useState(500);
  const [collected, setCollected] = useState(0);
  const [total, setTotal] = useState(0);
  const [level, setLevel] = useState(0);
  const [levelComplete, setLevelComplete] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [hint, setHint] = useState('');
  const [vibration, setVibration] = useState(0);

  const syncUI = useCallback((state: GameState) => {
    setFreqDisplay(Math.round(state.resonator.frequency));
    setCollected(state.collectedCount);
    setTotal(state.totalStones);
    setLevel(state.currentLevel);
    setLevelComplete(state.levelComplete);
    setGameComplete(state.gameComplete);
    setHint(LEVELS[state.currentLevel].hint);
    setVibration(state.resonator.vibrationAmount);
  }, []);

  const gameLoop = useCallback(
    (timestamp: number) => {
      if (!gameRef.current || !canvasRef.current) return;

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const elapsed = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      const steps = Math.max(1, Math.round(elapsed / GAME_DT));
      let state = gameRef.current;
      for (let i = 0; i < steps; i++) {
        state = updateGame(state, GAME_DT);
      }
      gameRef.current = state;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawGame(ctx, state);
      }

      syncUI(state);
      rafRef.current = requestAnimationFrame(gameLoop);
    },
    [syncUI],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);

      if (gameRef.current) {
        gameRef.current = resizeGame(gameRef.current, w, h);
      } else {
        gameRef.current = createGameState(w, h);
        syncUI(gameRef.current);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [gameLoop, syncUI]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!gameRef.current) return;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          e.preventDefault();
          gameRef.current = adjustFrequency(gameRef.current, -5);
          break;
        case 'ArrowRight':
        case 'd':
          e.preventDefault();
          gameRef.current = adjustFrequency(gameRef.current, 5);
          break;
        case 'ArrowUp':
        case 'w':
          e.preventDefault();
          gameRef.current = adjustFrequency(gameRef.current, 1);
          break;
        case 'ArrowDown':
        case 's':
          e.preventDefault();
          gameRef.current = adjustFrequency(gameRef.current, -1);
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!gameRef.current) return;
      const val = Number(e.target.value);
      gameRef.current = setFrequency(gameRef.current, val);
    },
    [],
  );

  const handleNextLevel = useCallback(() => {
    if (!gameRef.current) return;
    gameRef.current = nextLevel(gameRef.current);
  }, []);

  const handleRestart = useCallback(() => {
    if (!gameRef.current) return;
    gameRef.current = restartGame(gameRef.current);
  }, []);

  const progress = total > 0 ? (collected / total) * 100 : 0;
  const levelConfig = LEVELS[level];

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
      />

      <div
        style={{
          ...styles.overlay,
          transform: vibration > 0
            ? `translate(${Math.sin(Date.now() * 0.05) * vibration * 3}px, 0)`
            : 'none',
        }}
      >
        <div style={styles.topBar}>
          <div style={styles.levelBadge}>
            {levelConfig.name}
          </div>
          <div style={styles.hintText}>{hint}</div>
        </div>

        <div style={styles.progressContainer}>
          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
              }}
            />
          </div>
          <div style={styles.progressLabel}>
            {collected} / {total}
          </div>
        </div>

        {levelComplete && !gameComplete && (
          <div style={styles.levelCompletePanel}>
            <div style={styles.levelCompleteText}>
              ✦ 大门已开启 ✦
            </div>
            <button style={styles.nextButton} onClick={handleNextLevel}>
              进入下一关 →
            </button>
          </div>
        )}

        {gameComplete && (
          <div style={styles.levelCompletePanel}>
            <div style={styles.levelCompleteText}>
              ✦ 回声密令已解 ✦
            </div>
            <div style={styles.completeSubtext}>
              所有遗迹的共鸣已觉醒
            </div>
            <button style={styles.nextButton} onClick={handleRestart}>
              重新探索 →
            </button>
          </div>
        )}

        <div style={styles.bottomPanel}>
          <div style={styles.freqDisplay}>{frequency} Hz</div>
          <div style={styles.sliderContainer}>
            <span style={styles.sliderLabel}>0</span>
            <input
              type="range"
              min={0}
              max={1000}
              step={1}
              value={frequency}
              onChange={handleSliderChange}
              style={styles.slider}
            />
            <span style={styles.sliderLabel}>1000</span>
          </div>
          <div style={styles.keyHint}>
            ← → 快速调整 &nbsp;|&nbsp; ↑ ↓ 精细调整
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: '"Courier New", "Noto Sans SC", monospace',
    userSelect: 'none',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    pointerEvents: 'none',
  },
  topBar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 'max(16px, 2vh)',
    gap: '8px',
  },
  levelBadge: {
    background: 'rgba(218, 165, 32, 0.15)',
    border: '1px solid rgba(218, 165, 32, 0.4)',
    borderRadius: '20px',
    padding: '6px 24px',
    color: '#daa520',
    fontSize: 'clamp(14px, 2vw, 18px)',
    letterSpacing: '3px',
    backdropFilter: 'blur(8px)',
  },
  hintText: {
    color: 'rgba(180, 200, 220, 0.6)',
    fontSize: 'clamp(11px, 1.5vw, 14px)',
    textAlign: 'center' as const,
    letterSpacing: '1px',
    maxWidth: '80%',
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    marginTop: '8px',
  },
  progressTrack: {
    width: 'clamp(200px, 50vw, 400px)',
    height: '10px',
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '5px',
    border: '1px solid rgba(218, 165, 32, 0.2)',
    backdropFilter: 'blur(10px)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background:
      'linear-gradient(90deg, rgba(0, 220, 255, 0.6), rgba(218, 165, 32, 0.8))',
    borderRadius: '5px',
    transition: 'width 0.3s ease-out',
    boxShadow: '0 0 12px rgba(0, 220, 255, 0.4)',
  },
  progressLabel: {
    color: 'rgba(218, 165, 32, 0.7)',
    fontSize: '12px',
    letterSpacing: '2px',
  },
  levelCompletePanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    pointerEvents: 'auto' as const,
  },
  levelCompleteText: {
    color: '#daa520',
    fontSize: 'clamp(20px, 3vw, 28px)',
    letterSpacing: '4px',
    textShadow: '0 0 20px rgba(218, 165, 32, 0.5)',
  },
  completeSubtext: {
    color: 'rgba(180, 200, 220, 0.5)',
    fontSize: '14px',
    letterSpacing: '2px',
  },
  nextButton: {
    background: 'rgba(218, 165, 32, 0.15)',
    border: '1px solid rgba(218, 165, 32, 0.5)',
    borderRadius: '8px',
    color: '#daa520',
    padding: '10px 32px',
    fontSize: '16px',
    cursor: 'pointer',
    letterSpacing: '2px',
    fontFamily: '"Courier New", "Noto Sans SC", monospace',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s ease',
  },
  bottomPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: 'max(16px, 3vh)',
    background:
      'linear-gradient(to top, rgba(5, 5, 16, 0.85), rgba(5, 5, 16, 0))',
    paddingTop: '30px',
    pointerEvents: 'auto' as const,
  },
  freqDisplay: {
    color: '#00dcff',
    fontSize: 'clamp(24px, 4vw, 36px)',
    fontWeight: 'bold' as const,
    letterSpacing: '4px',
    textShadow: '0 0 15px rgba(0, 220, 255, 0.5)',
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: 'clamp(260px, 60vw, 500px)',
  },
  sliderLabel: {
    color: 'rgba(180, 200, 220, 0.4)',
    fontSize: '11px',
    minWidth: '28px',
    textAlign: 'center' as const,
  },
  slider: {
    flex: 1,
    appearance: 'none' as any,
    height: '6px',
    borderRadius: '3px',
    background:
      'linear-gradient(90deg, rgba(0, 220, 255, 0.2), rgba(218, 165, 32, 0.2))',
    outline: 'none',
    cursor: 'pointer',
  },
  keyHint: {
    color: 'rgba(180, 200, 220, 0.3)',
    fontSize: '11px',
    letterSpacing: '1px',
  },
};
