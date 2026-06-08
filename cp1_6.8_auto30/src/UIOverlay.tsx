import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine, GameStats, GameState } from './GameEngine';

const initialStats: GameStats = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfect: 0,
  good: 0,
  miss: 0,
  progress: 0,
  level: 1,
  levelName: '',
};

const UIOverlay: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [stats, setStats] = useState<GameStats>(initialStats);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    engine.setStatsCallback((s) => setStats(s));
    engine.setStateCallback((s) => setGameState(s));

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    const handlePointer = (e: PointerEvent) => {
      e.preventDefault();
      engine.handleInput(e.clientX, e.clientY);
    };
    const canvas = canvasRef.current;
    canvas.addEventListener('pointerdown', handlePointer);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (engine.getState() === 'playing') engine.pause();
        else if (engine.getState() === 'paused') engine.resume();
      }
      if (e.key === ' ' && engine.getState() === 'playing') {
        engine.pause();
      } else if (e.key === ' ' && engine.getState() === 'paused') {
        engine.resume();
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('keydown', handleKey);
      engine.destroy();
    };
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current?.startGame();
    setShowControls(false);
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const handleNextLevel = useCallback(() => {
    engineRef.current?.nextLevel();
  }, []);

  const handleReturnMenu = useCallback(() => {
    engineRef.current?.returnToMenu();
    setShowControls(true);
  }, []);

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
      />

      {gameState === 'menu' && (
        <div style={styles.overlay}>
          <div style={styles.menuContainer}>
            <h1 style={styles.title}>暗潮回响</h1>
            <p style={styles.subtitle}>DARK TIDE ECHO</p>
            <div style={styles.levelList}>
              {engineRef.current?.getLevels().map((lv, i) => (
                <div key={lv.id} style={styles.levelItem}>
                  <span style={styles.levelNum}>{i + 1}</span>
                  <span style={styles.levelName}>{lv.name}</span>
                  <span style={styles.levelBpm}>{lv.bpm} BPM</span>
                </div>
              ))}
            </div>
            <button style={styles.startBtn} onClick={handleStart}>
              开始潜行
            </button>
            {showControls && (
              <div style={styles.controlsInfo}>
                <p>点击/触摸闪烁的音符 · ESC 暂停</p>
                <p>连击 20 次触发「潮汐爆发」</p>
              </div>
            )}
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div style={styles.topBar}>
            <div style={styles.scoreArea}>
              <span style={styles.scoreLabel}>SCORE</span>
              <span style={styles.scoreValue}>{stats.score.toLocaleString()}</span>
            </div>
            <div style={styles.comboArea}>
              {stats.combo > 0 && (
                <span style={{
                  ...styles.comboValue,
                  textShadow: stats.combo >= 20
                    ? '0 0 20px #00e5ff, 0 0 40px #00e5ff'
                    : '0 0 10px rgba(0,229,255,0.5)',
                }}>
                  {stats.combo}x
                </span>
              )}
              {stats.combo >= 20 && (
                <span style={styles.tidalLabel}>潮汐爆发!</span>
              )}
            </div>
            <button style={styles.pauseBtn} onClick={handlePause}>
              ❚❚
            </button>
          </div>

          <div style={styles.bottomBar}>
            <div style={styles.progressBarBg}>
              <div
                style={{
                  ...styles.progressBarFill,
                  width: `${stats.progress * 100}%`,
                }}
              />
            </div>
            <div style={styles.bottomInfo}>
              <span style={styles.bottomLevel}>
                第{stats.level}关 · {stats.levelName}
              </span>
              <div style={styles.bottomStats}>
                <span style={styles.statPerfect}>Perfect {stats.perfect}</span>
                <span style={styles.statGood}>Good {stats.good}</span>
                <span style={styles.statMiss}>Miss {stats.miss}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {gameState === 'paused' && (
        <div style={styles.overlay}>
          <div style={styles.pauseContainer}>
            <h2 style={styles.pauseTitle}>暂停</h2>
            <button style={styles.menuBtn} onClick={handleResume}>继续</button>
            <button style={{ ...styles.menuBtn, background: 'rgba(255,255,255,0.05)' }} onClick={handleReturnMenu}>
              返回主界面
            </button>
          </div>
        </div>
      )}

      {gameState === 'levelComplete' && (
        <div style={styles.overlay}>
          <div style={styles.levelCompleteContainer}>
            <h2 style={styles.levelCompleteTitle}>关卡完成!</h2>
            <p style={styles.levelCompleteName}>{stats.levelName}</p>
            <div style={styles.resultGrid}>
              <div style={styles.resultItem}>
                <span style={styles.resultLabel}>得分</span>
                <span style={styles.resultValue}>{stats.score.toLocaleString()}</span>
              </div>
              <div style={styles.resultItem}>
                <span style={styles.resultLabel}>最大连击</span>
                <span style={styles.resultValue}>{stats.maxCombo}x</span>
              </div>
              <div style={styles.resultItem}>
                <span style={styles.resultLabel}>Perfect</span>
                <span style={{ ...styles.resultValue, color: '#00e5ff' }}>{stats.perfect}</span>
              </div>
              <div style={styles.resultItem}>
                <span style={styles.resultLabel}>Good</span>
                <span style={{ ...styles.resultValue, color: '#76ff03' }}>{stats.good}</span>
              </div>
              <div style={styles.resultItem}>
                <span style={styles.resultLabel}>Miss</span>
                <span style={{ ...styles.resultValue, color: '#f50057' }}>{stats.miss}</span>
              </div>
            </div>
            <button style={styles.menuBtn} onClick={handleNextLevel}>
              {stats.level < 4 ? '下一关' : '查看结果'}
            </button>
            <button style={{ ...styles.menuBtn, background: 'rgba(255,255,255,0.05)' }} onClick={handleReturnMenu}>
              返回主界面
            </button>
          </div>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div style={styles.overlay}>
          <div style={styles.levelCompleteContainer}>
            <h2 style={styles.gameOverTitle}>暗潮退去</h2>
            <p style={styles.gameOverSub}>全部关卡完成</p>
            <div style={styles.resultGrid}>
              <div style={styles.resultItem}>
                <span style={styles.resultLabel}>总得分</span>
                <span style={styles.resultValue}>{stats.score.toLocaleString()}</span>
              </div>
              <div style={styles.resultItem}>
                <span style={styles.resultLabel}>最大连击</span>
                <span style={styles.resultValue}>{stats.maxCombo}x</span>
              </div>
            </div>
            <button style={styles.menuBtn} onClick={handleReturnMenu}>
              重新开始
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    touchAction: 'none',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(2,11,26,0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 10,
  },
  menuContainer: {
    textAlign: 'center',
    padding: '40px',
  },
  title: {
    fontSize: 'clamp(36px, 8vw, 72px)',
    fontWeight: 900,
    color: '#00e5ff',
    textShadow: '0 0 30px rgba(0,229,255,0.6), 0 0 60px rgba(0,229,255,0.3)',
    letterSpacing: '8px',
    margin: 0,
  },
  subtitle: {
    fontSize: 'clamp(12px, 2vw, 18px)',
    color: 'rgba(0,229,255,0.5)',
    letterSpacing: '12px',
    marginTop: '8px',
    marginBottom: '40px',
  },
  levelList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '32px',
  },
  levelItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    background: 'rgba(0,229,255,0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(0,229,255,0.1)',
  },
  levelNum: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'rgba(0,229,255,0.15)',
    color: '#00e5ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    flexShrink: 0,
  },
  levelName: {
    flex: 1,
    textAlign: 'left',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
  },
  levelBpm: {
    color: 'rgba(0,229,255,0.6)',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  startBtn: {
    padding: '14px 48px',
    fontSize: '18px',
    fontWeight: 700,
    color: '#020b1a',
    background: 'linear-gradient(135deg, #00e5ff, #1de9b6)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    letterSpacing: '4px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 0 20px rgba(0,229,255,0.4)',
  },
  controlsInfo: {
    marginTop: '24px',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '13px',
    lineHeight: 1.8,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: 'linear-gradient(180deg, rgba(2,11,26,0.8) 0%, transparent 100%)',
    zIndex: 5,
  },
  scoreArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  scoreLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '2px',
    fontFamily: 'monospace',
  },
  scoreValue: {
    fontSize: 'clamp(20px, 4vw, 28px)',
    fontWeight: 800,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  comboArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  comboValue: {
    fontSize: 'clamp(28px, 6vw, 42px)',
    fontWeight: 900,
    color: '#00e5ff',
    fontFamily: 'monospace',
    transition: 'text-shadow 0.3s',
  },
  tidalLabel: {
    fontSize: '11px',
    color: '#1de9b6',
    letterSpacing: '3px',
    animation: 'pulse 0.5s ease-in-out infinite alternate',
  },
  pauseBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px 20px 20px',
    background: 'linear-gradient(0deg, rgba(2,11,26,0.85) 0%, transparent 100%)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    zIndex: 5,
  },
  progressBarBg: {
    width: '100%',
    height: '4px',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00e5ff, #1de9b6)',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
    boxShadow: '0 0 8px rgba(0,229,255,0.5)',
  },
  bottomInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomLevel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
  },
  bottomStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  statPerfect: { color: '#00e5ff' },
  statGood: { color: '#76ff03' },
  statMiss: { color: '#f50057' },
  pauseContainer: {
    textAlign: 'center',
    padding: '40px',
  },
  pauseTitle: {
    fontSize: '32px',
    fontWeight: 800,
    color: '#ffffff',
    marginBottom: '32px',
  },
  menuBtn: {
    display: 'block',
    width: '100%',
    maxWidth: '280px',
    margin: '0 auto 12px',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    background: 'rgba(0,229,255,0.15)',
    border: '1px solid rgba(0,229,255,0.3)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  levelCompleteContainer: {
    textAlign: 'center',
    padding: '40px',
  },
  levelCompleteTitle: {
    fontSize: 'clamp(28px, 6vw, 40px)',
    fontWeight: 900,
    color: '#1de9b6',
    textShadow: '0 0 20px rgba(29,233,182,0.5)',
    marginBottom: '4px',
  },
  levelCompleteName: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '28px',
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '28px',
    maxWidth: '300px',
    margin: '0 auto 28px',
  },
  resultItem: {
    padding: '12px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  resultLabel: {
    display: 'block',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '4px',
  },
  resultValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 700,
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  gameOverTitle: {
    fontSize: 'clamp(32px, 7vw, 48px)',
    fontWeight: 900,
    color: '#00e5ff',
    textShadow: '0 0 30px rgba(0,229,255,0.5)',
    marginBottom: '4px',
  },
  gameOverSub: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '28px',
  },
};

export default UIOverlay;
