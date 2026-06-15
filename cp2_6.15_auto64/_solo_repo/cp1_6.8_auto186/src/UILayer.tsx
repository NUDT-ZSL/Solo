import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GamePublicState } from './GameEngine';

interface UILayerProps {
  engine: GameEngine | null;
}

const initState: GamePublicState = {
  currentLevel: 1,
  totalLevels: 8,
  steps: 0,
  observations: 0,
  historyLength: 1,
  historyIndex: 0,
  won: false,
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    color: '#e0f0ff',
  },
  levelInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    background: 'rgba(10,15,30,0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(100,180,255,0.2)',
    borderRadius: 12,
    padding: '14px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 0 20px rgba(100,180,255,0.05)',
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'rgba(100,200,255,0.9)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statRow: {
    display: 'flex',
    gap: 20,
    fontSize: 13,
    color: 'rgba(180,210,240,0.8)',
  },
  controlPanel: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    background: 'rgba(10,15,30,0.65)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(100,180,255,0.15)',
    borderRadius: 14,
    padding: '18px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minWidth: 220,
    pointerEvents: 'auto',
    boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 0 24px rgba(100,180,255,0.04)',
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(100,200,255,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  sliderLabel: {
    fontSize: 12,
    color: 'rgba(160,200,230,0.7)',
    minWidth: 24,
    textAlign: 'center' as const,
  },
  slider: {
    flex: 1,
    WebkitAppearance: 'none' as any,
    appearance: 'none' as any,
    height: 4,
    borderRadius: 2,
    background: 'rgba(100,180,255,0.2)',
    outline: 'none',
    cursor: 'pointer',
  },
  btn: {
    background: 'rgba(100,180,255,0.12)',
    border: '1px solid rgba(100,180,255,0.25)',
    borderRadius: 8,
    padding: '8px 0',
    color: 'rgba(180,220,255,0.9)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: 1,
  },
  btnNext: {
    background: 'rgba(50,255,150,0.12)',
    border: '1px solid rgba(50,255,150,0.25)',
    color: 'rgba(50,255,150,0.9)',
  },
  winOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(10,15,30,0.8)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(50,255,150,0.3)',
    borderRadius: 16,
    padding: '32px 48px',
    textAlign: 'center' as const,
    pointerEvents: 'auto',
    boxShadow: '0 0 60px rgba(50,255,150,0.15)',
  },
  winTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: 'rgba(50,255,150,0.95)',
    marginBottom: 12,
    textShadow: '0 0 20px rgba(50,255,150,0.4)',
  },
  winSub: {
    fontSize: 14,
    color: 'rgba(180,240,200,0.7)',
    marginBottom: 20,
  },
  hint: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    fontSize: 11,
    color: 'rgba(120,160,200,0.4)',
    lineHeight: 1.6,
  },
};

export const UILayer: React.FC<UILayerProps> = ({ engine }) => {
  const [state, setState] = useState<GamePublicState>(initState);
  const sliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!engine) return;
    engine.setOnStateChange((s) => setState({ ...s }));
    return () => engine.setOnStateChange(() => {});
  }, [engine]);

  const handleReset = useCallback(() => {
    engine?.resetLevel();
  }, [engine]);

  const handleNext = useCallback(() => {
    engine?.nextLevel();
  }, [engine]);

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const idx = parseInt(e.target.value, 10);
      engine?.rewindTo(idx);
    },
    [engine]
  );

  const isLatest = state.historyIndex === state.historyLength - 1;

  return (
    <div style={styles.container}>
      <div style={styles.levelInfo}>
        <div style={styles.levelTitle}>
          关卡 {state.currentLevel} / {state.totalLevels}
        </div>
        <div style={styles.statRow}>
          <span>步数 {state.steps}</span>
          <span>观测 {state.observations}</span>
        </div>
      </div>

      <div style={styles.controlPanel}>
        <div style={styles.panelTitle}>控制</div>

        <div style={styles.sliderRow}>
          <span style={styles.sliderLabel}>0</span>
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={Math.max(0, state.historyLength - 1)}
            value={state.historyIndex}
            onChange={handleSlider}
            style={styles.slider}
          />
          <span style={styles.sliderLabel}>{state.historyLength - 1}</span>
        </div>

        <button style={styles.btn} onClick={handleReset}>
          重置关卡
        </button>

        {!isLatest && (
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,180,50,0.7)',
              textAlign: 'center',
            }}
          >
            ⚠ 已回溯到历史步骤
          </div>
        )}
      </div>

      {state.won && (
        <div style={styles.winOverlay}>
          <div style={styles.winTitle}>量子坍缩完成</div>
          <div style={styles.winSub}>
            步数: {state.steps} &nbsp;|&nbsp; 观测: {state.observations}
          </div>
          {state.currentLevel < state.totalLevels ? (
            <button
              style={{ ...styles.btn, ...styles.btnNext }}
              onClick={handleNext}
            >
              下一关 →
            </button>
          ) : (
            <div style={{ fontSize: 14, color: 'rgba(50,255,150,0.8)' }}>
              🎉 全部通关！
            </div>
          )}
        </div>
      )}

      <div style={styles.hint}>
        点击叠加态格子发射观测粒子<br />
        点击实心格子移动主角
      </div>
    </div>
  );
};
