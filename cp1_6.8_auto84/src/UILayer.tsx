import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameStats } from './GameEngine';

const defaultStats: GameStats = {
  energy: 100,
  maxEnergy: 100,
  score: 0,
  clearedZones: 0,
  totalZones: 3,
  beat: { progress: 0, isOnBeat: false, beatIndex: 0 },
  state: 'menu',
  missionText: '潜入 0/3 个区域',
  exposedTimer: 0,
};

const UILayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [stats, setStats] = useState<GameStats>(defaultStats);

  const handleStatsUpdate = useCallback((newStats: GameStats) => {
    setStats({ ...newStats });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.onStatsUpdate = handleStatsUpdate;

    engine.start();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      engine.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      engine.stop();
      window.removeEventListener('resize', handleResize);
    };
  }, [handleStatsUpdate]);

  const energyPercent = (stats.energy / stats.maxEnergy) * 100;
  const energyColor =
    energyPercent > 60 ? '#4488ff' : energyPercent > 30 ? '#ffaa44' : '#ff4466';

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
          display: 'block',
        }}
      />

      {stats.state === 'playing' && (
        <>
          <div style={styles.leftPanel}>
            <div style={styles.sectionTitle}>
              <span style={styles.neonText}>潜行能量</span>
            </div>
            <div style={styles.barContainer}>
              <div
                style={{
                  ...styles.energyFill,
                  width: `${energyPercent}%`,
                  background: `linear-gradient(90deg, ${energyColor}88, ${energyColor})`,
                  boxShadow: `0 0 10px ${energyColor}66`,
                }}
              />
            </div>
            <div style={{ ...styles.barLabel, color: energyColor }}>
              {Math.ceil(stats.energy)} / {stats.maxEnergy}
            </div>

            <div style={{ ...styles.sectionTitle, marginTop: 20 }}>
              <span style={styles.neonText}>节拍</span>
            </div>
            <div style={styles.beatBarContainer}>
              <div
                style={{
                  ...styles.beatIndicator,
                  left: `${stats.beat.progress * 100}%`,
                  background: stats.beat.isOnBeat ? '#44ffaa' : '#4466aa',
                  boxShadow: stats.beat.isOnBeat
                    ? '0 0 12px #44ffaa'
                    : '0 0 4px #4466aa',
                }}
              />
              <div style={styles.beatCenterLine} />
            </div>
            <div
              style={{
                ...styles.barLabel,
                color: stats.beat.isOnBeat ? '#44ffaa' : '#667799',
              }}
            >
              {stats.beat.isOnBeat ? '● 踩中!' : '○ 等待...'}
            </div>

            <div style={{ ...styles.sectionTitle, marginTop: 20 }}>
              <span style={styles.neonText}>任务</span>
            </div>
            <div style={styles.missionText}>{stats.missionText}</div>
            <div style={styles.barContainer}>
              <div
                style={{
                  ...styles.missionFill,
                  width: `${(stats.clearedZones / stats.totalZones) * 100}%`,
                }}
              />
            </div>
          </div>

          <div style={styles.scorePanel}>
            <div style={styles.neonText}>得分</div>
            <div style={styles.scoreValue}>{stats.score}</div>
          </div>

          <div style={styles.controlsHint}>
            WASD 移动 · 踩准节拍加速 · 躲避光线
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  leftPanel: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 200,
    padding: '16px 14px',
    background: 'rgba(10, 10, 40, 0.65)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 12,
    border: '1px solid rgba(80, 60, 180, 0.25)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
    zIndex: 10,
    userSelect: 'none' as const,
  },
  sectionTitle: {
    marginBottom: 6,
  },
  neonText: {
    color: '#b090ff',
    fontFamily: '"Segoe UI", sans-serif',
    fontSize: 13,
    fontWeight: 600,
    textShadow: '0 0 8px rgba(140, 100, 255, 0.6)',
    letterSpacing: 1,
  },
  barContainer: {
    width: '100%',
    height: 10,
    background: 'rgba(20, 15, 50, 0.8)',
    borderRadius: 5,
    overflow: 'hidden',
    border: '1px solid rgba(80, 60, 180, 0.2)',
  },
  energyFill: {
    height: '100%',
    borderRadius: 5,
    transition: 'width 0.15s ease-out',
  },
  barLabel: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 3,
    textAlign: 'right' as const,
    transition: 'color 0.2s',
  },
  beatBarContainer: {
    position: 'relative' as const,
    width: '100%',
    height: 8,
    background: 'rgba(20, 15, 50, 0.8)',
    borderRadius: 4,
    overflow: 'visible' as const,
    border: '1px solid rgba(80, 60, 180, 0.2)',
  },
  beatIndicator: {
    position: 'absolute' as const,
    top: -3,
    width: 14,
    height: 14,
    borderRadius: '50%',
    transition: 'left 0.05s linear, background 0.1s, box-shadow 0.1s',
    transform: 'translateX(-50%)',
  },
  beatCenterLine: {
    position: 'absolute' as const,
    left: '50%',
    top: 0,
    width: 1,
    height: '100%',
    background: 'rgba(100, 80, 200, 0.4)',
  },
  missionText: {
    fontSize: 12,
    fontFamily: '"Segoe UI", sans-serif',
    color: '#9988cc',
    marginBottom: 6,
  },
  missionFill: {
    height: '100%',
    borderRadius: 5,
    background: 'linear-gradient(90deg, rgba(60, 200, 120, 0.5), rgba(80, 255, 150, 0.8))',
    boxShadow: '0 0 8px rgba(60, 200, 120, 0.3)',
    transition: 'width 0.3s ease-out',
  },
  scorePanel: {
    position: 'absolute',
    top: 20,
    right: 24,
    padding: '10px 18px',
    background: 'rgba(10, 10, 40, 0.55)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 10,
    border: '1px solid rgba(80, 60, 180, 0.2)',
    textAlign: 'right' as const,
    zIndex: 10,
    userSelect: 'none' as const,
  },
  scoreValue: {
    fontSize: 28,
    fontFamily: 'monospace',
    fontWeight: 700,
    color: '#c8a0ff',
    textShadow: '0 0 12px rgba(140, 100, 255, 0.5)',
  },
  controlsHint: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 12,
    fontFamily: '"Segoe UI", sans-serif',
    color: 'rgba(120, 120, 180, 0.5)',
    letterSpacing: 1,
    zIndex: 10,
    userSelect: 'none' as const,
    pointerEvents: 'none' as const,
  },
};

export default UILayer;
