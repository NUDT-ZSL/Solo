import React, { useCallback } from 'react';
import { GameState, Level, LEVELS } from './GameEngine';

interface UILayerProps {
  state: GameState;
  level: Level | null;
  onReset: () => void;
  onHint: () => void;
  onNextLevel: () => void;
}

export const UILayer: React.FC<UILayerProps> = ({ state, level, onReset, onHint, onNextLevel }) => {
  const handleReset = useCallback(() => { onReset(); }, [onReset]);
  const handleHint = useCallback(() => { onHint(); }, [onHint]);
  const handleNext = useCallback(() => { onNextLevel(); }, [onNextLevel]);

  const totalLevels = LEVELS.length;
  const currentNum = state.currentLevelIndex + 1;

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none',
      fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    }}>
      <div style={{
        position: 'absolute',
        top: 20,
        left: 24,
        color: 'rgba(180, 210, 255, 0.9)',
        fontSize: 14,
        lineHeight: 1.8,
        textShadow: '0 0 10px rgba(80, 150, 255, 0.4)',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 3, opacity: 0.6, marginBottom: 2 }}>
          关卡进度
        </div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          {level ? level.name : ''}{' '}
          <span style={{ fontSize: 13, opacity: 0.5, fontWeight: 400 }}>
            {currentNum} / {totalLevels}
          </span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
          步数: {state.steps}
          {level && <span style={{ opacity: 0.5 }}> (标准: {level.par})</span>}
        </div>
        <div style={{
          marginTop: 8,
          display: 'flex',
          gap: 4,
        }}>
          {LEVELS.map((_, i) => (
            <div key={i} style={{
              width: 18,
              height: 3,
              borderRadius: 1.5,
              background: i < currentNum
                ? (state.score[i] !== undefined && state.score[i] <= LEVELS[i].par
                  ? 'rgba(100, 255, 180, 0.8)'
                  : 'rgba(100, 200, 255, 0.6)')
                : i === state.currentLevelIndex
                  ? 'rgba(100, 200, 255, 0.4)'
                  : 'rgba(100, 200, 255, 0.12)',
            }} />
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        display: 'flex',
        gap: 12,
        pointerEvents: 'auto',
      }}>
        <button
          onClick={handleHint}
          style={{
            background: state.isShowingHint
              ? 'rgba(255, 200, 50, 0.15)'
              : 'rgba(100, 200, 255, 0.08)',
            border: state.isShowingHint
              ? '1px solid rgba(255, 200, 50, 0.3)'
              : '1px solid rgba(100, 200, 255, 0.15)',
            borderRadius: 10,
            color: state.isShowingHint
              ? 'rgba(255, 200, 50, 0.9)'
              : 'rgba(180, 210, 255, 0.7)',
            padding: '8px 18px',
            fontSize: 13,
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            transition: 'all 0.2s ease',
            textShadow: '0 0 6px rgba(80, 150, 255, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(100, 200, 255, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = state.isShowingHint
              ? 'rgba(255, 200, 50, 0.15)'
              : 'rgba(100, 200, 255, 0.08)';
            e.currentTarget.style.borderColor = state.isShowingHint
              ? '1px solid rgba(255, 200, 50, 0.3)'
              : '1px solid rgba(100, 200, 255, 0.15)';
          }}
        >
          💡 提示
        </button>
        <button
          onClick={handleReset}
          style={{
            background: 'rgba(100, 200, 255, 0.08)',
            border: '1px solid rgba(100, 200, 255, 0.15)',
            borderRadius: 10,
            color: 'rgba(180, 210, 255, 0.7)',
            padding: '8px 18px',
            fontSize: 13,
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            transition: 'all 0.2s ease',
            textShadow: '0 0 6px rgba(80, 150, 255, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(100, 200, 255, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(100, 200, 255, 0.08)';
            e.currentTarget.style.borderColor = '1px solid rgba(100, 200, 255, 0.15)';
          }}
        >
          ↺ 重置
        </button>
      </div>

      {state.isLevelComplete && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          background: 'rgba(0, 0, 0, 0.3)',
          animation: 'fadeIn 0.5s ease',
        }}>
          <div style={{
            textAlign: 'center',
            animation: 'scaleIn 0.4s ease',
          }}>
            <div style={{
              fontSize: 36,
              fontWeight: 700,
              color: 'rgba(200, 230, 255, 0.95)',
              textShadow: '0 0 30px rgba(80, 150, 255, 0.6), 0 0 60px rgba(80, 150, 255, 0.3)',
              marginBottom: 12,
            }}>
              ✦ 通关成功 ✦
            </div>
            <div style={{
              fontSize: 14,
              color: 'rgba(180, 210, 255, 0.6)',
              marginBottom: 6,
            }}>
              用了 {state.steps} 步
              {level && state.steps <= level.par && (
                <span style={{
                  color: 'rgba(100, 255, 180, 0.9)',
                  marginLeft: 10,
                  textShadow: '0 0 8px rgba(100, 255, 180, 0.4)',
                }}>
                  ★ 完美!
                </span>
              )}
            </div>
            {state.currentLevelIndex < totalLevels - 1 ? (
              <button
                onClick={handleNext}
                style={{
                  marginTop: 18,
                  background: 'rgba(100, 200, 255, 0.12)',
                  border: '1px solid rgba(100, 200, 255, 0.3)',
                  borderRadius: 12,
                  color: 'rgba(200, 230, 255, 0.9)',
                  padding: '10px 32px',
                  fontSize: 15,
                  cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  transition: 'all 0.2s ease',
                  textShadow: '0 0 8px rgba(80, 150, 255, 0.4)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(100, 200, 255, 0.22)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(80, 150, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(100, 200, 255, 0.12)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                下一关 →
              </button>
            ) : (
              <div style={{
                marginTop: 18,
                fontSize: 16,
                color: 'rgba(255, 200, 100, 0.9)',
                textShadow: '0 0 15px rgba(255, 200, 100, 0.5)',
              }}>
                🎉 全部通关！你已征服流光镜域！
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
