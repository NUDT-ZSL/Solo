import React from 'react';
import { FRAGMENTS_PER_CONSTELLATION, TOTAL_CONSTELLATIONS } from './ConstellationUnlocker';

interface UILayerProps {
  collected: number;
  unlockedCount: number;
  completedCount: number;
  gameComplete: boolean;
  onReset: () => void;
  justUnlockedName: string | null;
}

const UILayer: React.FC<UILayerProps> = ({
  collected,
  unlockedCount,
  completedCount,
  gameComplete,
  onReset,
  justUnlockedName,
}) => {
  const currentFragments = collected % FRAGMENTS_PER_CONSTELLATION;
  const totalNeeded = TOTAL_CONSTELLATIONS * FRAGMENTS_PER_CONSTELLATION;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      fontFamily: "'Segoe UI', sans-serif",
      color: '#e0d0ff',
      zIndex: 10,
    }}>
      {justUnlockedName && (
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 28,
          fontWeight: 700,
          color: '#c0b0ff',
          textShadow: '0 0 20px rgba(180,160,255,0.8), 0 0 40px rgba(120,100,200,0.5)',
          animation: 'fadeInOut 2s ease forwards',
          pointerEvents: 'none',
        }}>
          ✦ 解锁星座：{justUnlockedName} ✦
        </div>
      )}

      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        pointerEvents: 'auto',
      }}>
        <button
          onClick={onReset}
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: '#c0b0ff',
            padding: '8px 18px',
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
          }}
        >
          重置
        </button>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(10, 10, 50, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(180, 160, 255, 0.15)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
          <span style={{ fontSize: 13, opacity: 0.7 }}>星辰碎片</span>
          <span style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#b0a0ff',
            textShadow: '0 0 10px rgba(160,140,255,0.5)',
          }}>
            {collected}
          </span>
          <span style={{ fontSize: 12, opacity: 0.5 }}>/ {totalNeeded}</span>
        </div>

        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>
            当前进度：{currentFragments} / {FRAGMENTS_PER_CONSTELLATION}
          </div>
          <div style={{
            height: 4,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${(currentFragments / FRAGMENTS_PER_CONSTELLATION) * 100}%`,
              background: 'linear-gradient(90deg, #7c4dff, #e040fb)',
              borderRadius: 2,
              transition: 'width 0.3s ease',
              boxShadow: '0 0 8px rgba(124,77,255,0.5)',
            }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, opacity: 0.6 }}>星座</span>
          {Array.from({ length: TOTAL_CONSTELLATIONS }).map((_, i) => (
            <div
              key={i}
              title={`星座 ${i + 1}`}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '1.5px solid rgba(180,160,255,0.3)',
                background: i < completedCount
                  ? 'radial-gradient(circle, #e0d0ff, #7c4dff)'
                  : i < unlockedCount
                    ? 'radial-gradient(circle, rgba(180,160,255,0.5), rgba(124,77,255,0.3))'
                    : 'rgba(255,255,255,0.05)',
                boxShadow: i < completedCount
                  ? '0 0 8px rgba(124,77,255,0.6)'
                  : 'none',
                transition: 'all 0.4s ease',
              }}
            />
          ))}
        </div>

        <div style={{ fontSize: 12, opacity: 0.5, whiteSpace: 'nowrap' }}>
          {gameComplete ? '星图已完成！' : unlockedCount < TOTAL_CONSTELLATIONS
            ? `还需 ${FRAGMENTS_PER_CONSTELLATION - currentFragments} 碎片解锁下个星座`
            : '所有星座已解锁，等待完成...'}
        </div>
      </div>

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }
      `}</style>
    </div>
  );
};

export default UILayer;
