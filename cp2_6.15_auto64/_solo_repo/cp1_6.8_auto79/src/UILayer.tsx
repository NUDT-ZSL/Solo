import React from 'react';
import type { GameSnapshot } from './GameEngine';

interface UILayerProps {
  snapshot: GameSnapshot;
  onRestart: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    fontFamily: '"Ma Shan Zheng", serif',
    userSelect: 'none',
  },
  scoreBox: {
    position: 'absolute',
    top: 20,
    left: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#8b6914',
    letterSpacing: 4,
  },
  scoreValue: {
    fontSize: 36,
    color: '#2c1810',
    fontWeight: 'bold',
    lineHeight: 1,
  },
  energyBox: {
    position: 'absolute',
    top: 20,
    right: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
  },
  energyLabel: {
    fontSize: 14,
    color: '#8b6914',
    letterSpacing: 2,
  },
  energyBarOuter: {
    width: 160,
    height: 14,
    backgroundColor: 'rgba(44, 24, 16, 0.15)',
    borderRadius: 7,
    border: '1.5px solid #8b6914',
    overflow: 'hidden',
    position: 'relative',
  },
  energyBarInner: {
    height: '100%',
    borderRadius: 7,
    transition: 'width 0.3s ease, background 0.3s ease',
  },
  energyHint: {
    fontSize: 12,
    color: '#a0855a',
    marginTop: 2,
  },
  gameoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 240, 225, 0.85)',
    pointerEvents: 'auto',
  },
  gameoverTitle: {
    fontSize: 56,
    color: '#c0392b',
    marginBottom: 16,
    letterSpacing: 8,
  },
  gameoverScore: {
    fontSize: 28,
    color: '#2c1810',
    marginBottom: 8,
  },
  gameoverHigh: {
    fontSize: 18,
    color: '#8b6914',
    marginBottom: 40,
  },
  restartBtn: {
    padding: '12px 48px',
    fontSize: 24,
    fontFamily: '"Ma Shan Zheng", serif',
    color: '#f5f0e1',
    backgroundColor: '#c0392b',
    border: '2px solid #8b1a1a',
    borderRadius: 6,
    cursor: 'pointer',
    letterSpacing: 4,
    transition: 'all 0.2s ease',
  },
};

export const UILayer: React.FC<UILayerProps> = ({ snapshot, onRestart }) => {
  const { state, score, highScore, energy, maxEnergy } = snapshot;
  const energyPct = (energy / maxEnergy) * 100;
  const isFull = energy >= maxEnergy;
  const barBg = isFull
    ? 'linear-gradient(90deg, #c0392b, #e74c3c, #f39c12)'
    : 'linear-gradient(90deg, #d4a843, #f0c850)';

  return (
    <div style={styles.overlay}>
      {(state === 'playing' || state === 'gameover') && (
        <>
          <div style={styles.scoreBox}>
            <span style={styles.scoreLabel}>得分</span>
            <span style={styles.scoreValue}>{score}</span>
          </div>

          <div style={styles.energyBox}>
            <span style={styles.energyLabel}>风铃能量</span>
            <div style={styles.energyBarOuter}>
              <div
                style={{
                  ...styles.energyBarInner,
                  width: `${energyPct}%`,
                  background: barBg,
                }}
              />
            </div>
            <span style={styles.energyHint}>
              {isFull ? '空格冲刺！' : `${Math.floor(energy)} / ${maxEnergy}`}
            </span>
          </div>
        </>
      )}

      {state === 'gameover' && (
        <div style={styles.gameoverOverlay}>
          <div style={styles.gameoverTitle}>鸢落</div>
          <div style={styles.gameoverScore}>得分：{score}</div>
          <div style={styles.gameoverHigh}>最高：{highScore}</div>
          <button
            style={styles.restartBtn}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#a93226';
              (e.target as HTMLElement).style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#c0392b';
              (e.target as HTMLElement).style.transform = 'scale(1)';
            }}
            onClick={onRestart}
          >
            再飞一次
          </button>
        </div>
      )}
    </div>
  );
};
