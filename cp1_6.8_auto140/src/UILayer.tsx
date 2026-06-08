import React, { useEffect, useState, useCallback } from 'react';
import { GameState } from './GameEngine';

interface UILayerProps {
  gameState: GameState;
  onReset: () => void;
  onNextLevel: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    fontFamily: "'Segoe UI', 'PingFang SC', sans-serif",
    color: '#e0e0ff',
    userSelect: 'none',
  },
  topLeft: {
    position: 'absolute',
    top: 24,
    left: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  levelBadge: {
    background: 'rgba(100, 70, 255, 0.15)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(100, 70, 255, 0.3)',
    borderRadius: 12,
    padding: '12px 20px',
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  levelTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#c8b8ff',
    margin: 0,
    textShadow: '0 0 20px rgba(100, 70, 255, 0.5)',
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  stat: {
    fontSize: 13,
    color: '#8888bb',
  },
  statValue: {
    color: '#00ffcc',
    fontWeight: 600,
    textShadow: '0 0 8px rgba(0, 255, 204, 0.4)',
  },
  progressBar: {
    width: '100%',
    height: 3,
    background: 'rgba(100, 70, 255, 0.2)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6644ff, #00ffcc)',
    borderRadius: 2,
    transition: 'width 0.5s ease',
  },
  bottomRight: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  resetButton: {
    pointerEvents: 'auto',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: '10px 24px',
    color: '#c8b8ff',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    letterSpacing: 1,
  },
  levelComplete: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(10, 10, 30, 0.85)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(100, 70, 255, 0.4)',
    borderRadius: 20,
    padding: '40px 60px',
    textAlign: 'center' as const,
    pointerEvents: 'auto',
    animation: 'fadeInUp 0.5s ease',
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#00ffcc',
    textShadow: '0 0 30px rgba(0, 255, 204, 0.6)',
    margin: '0 0 12px',
  },
  completeSub: {
    fontSize: 16,
    color: '#8888bb',
    margin: '0 0 24px',
  },
  nextButton: {
    background: 'linear-gradient(135deg, #6644ff, #ff44aa)',
    border: 'none',
    borderRadius: 12,
    padding: '12px 36px',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    letterSpacing: 1,
  },
  hint: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    fontSize: 12,
    color: 'rgba(136, 136, 187, 0.5)',
    lineHeight: 1.6,
  },
};

const UILayer: React.FC<UILayerProps> = ({ gameState, onReset, onNextLevel }) => {
  const [hoverReset, setHoverReset] = useState(false);
  const [hoverNext, setHoverNext] = useState(false);

  const progress = (gameState.currentLevel / gameState.totalLevels) * 100;

  const handleResetHover = useCallback(() => {
    const el = document.getElementById('reset-btn');
    if (el) {
      el.style.background = hoverReset
        ? 'rgba(255, 255, 255, 0.15)'
        : 'rgba(255, 255, 255, 0.08)';
      el.style.borderColor = hoverReset
        ? 'rgba(0, 255, 204, 0.4)'
        : 'rgba(255, 255, 255, 0.15)';
      el.style.boxShadow = hoverReset
        ? '0 0 20px rgba(0, 255, 204, 0.2)'
        : 'none';
    }
  }, [hoverReset]);

  useEffect(() => {
    handleResetHover();
  }, [handleResetHover]);

  return (
    <div style={styles.overlay}>
      <div style={styles.topLeft}>
        <div style={styles.levelBadge}>
          <h2 style={styles.levelTitle}>
            {gameState.levelName}
          </h2>
          <div style={styles.statRow}>
            <span style={styles.stat}>
              关卡 <span style={styles.statValue}>{gameState.currentLevel}</span> / {gameState.totalLevels}
            </span>
            <span style={styles.stat}>
              步数 <span style={styles.statValue}>{gameState.steps}</span>
            </span>
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div style={styles.bottomRight}>
        <button
          id="reset-btn"
          style={styles.resetButton}
          onClick={onReset}
          onMouseEnter={() => setHoverReset(true)}
          onMouseLeave={() => setHoverReset(false)}
        >
          ↻ 重置
        </button>
      </div>

      <div style={styles.hint}>
        WASD / 方向键移动 · 鼠标拖拽旋转 · 滚轮缩放<br />
        双击闪烁方块使其变为实体 · Q/E 上下层
      </div>

      {gameState.isLevelComplete && (
        <div style={styles.levelComplete}>
          <h2 style={styles.completeTitle}>
            {gameState.isCompleted ? '🏆 全部通关！' : '✦ 关卡完成！'}
          </h2>
          <p style={styles.completeSub}>
            用了 {gameState.steps} 步完成「{gameState.levelName}」
          </p>
          {!gameState.isCompleted && (
            <button
              style={{
                ...styles.nextButton,
                transform: hoverNext ? 'scale(1.05)' : 'scale(1)',
                boxShadow: hoverNext
                  ? '0 0 30px rgba(102, 68, 255, 0.5)'
                  : '0 0 15px rgba(102, 68, 255, 0.3)',
              }}
              onClick={onNextLevel}
              onMouseEnter={() => setHoverNext(true)}
              onMouseLeave={() => setHoverNext(false)}
            >
              下一关 →
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  );
};

export default UILayer;
