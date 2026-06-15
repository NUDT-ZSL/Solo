import React, { useEffect, useState, useCallback } from 'react';

interface UILayerProps {
  score: number;
  combo: number;
  darts: number;
  timeRemaining: number;
  totalTime: number;
  gameState: 'menu' | 'playing' | 'gameover';
  comboFlash: number;
  screenShake: number;
}

const DART_ICONS = 10;

export const UILayer: React.FC<UILayerProps> = ({
  score,
  combo,
  darts,
  timeRemaining,
  totalTime,
  gameState,
  comboFlash,
  screenShake,
}) => {
  const [flashVisible, setFlashVisible] = useState(false);
  const [shakeActive, setShakeActive] = useState(false);

  useEffect(() => {
    if (comboFlash > 0) {
      setFlashVisible(true);
      const t = setTimeout(() => setFlashVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [comboFlash]);

  useEffect(() => {
    if (screenShake > 0) {
      setShakeActive(true);
      const t = setTimeout(() => setShakeActive(false), 200);
      return () => clearTimeout(t);
    }
  }, [screenShake]);

  const timeRatio = Math.max(0, timeRemaining / totalTime);

  const getComboLabel = useCallback((c: number) => {
    if (c >= 15) return '天下无双';
    if (c >= 10) return '百步穿杨';
    if (c >= 7) return '连珠飞镖';
    if (c >= 5) return '势如破竹';
    if (c >= 3) return '连击';
    return '';
  }, []);

  const timeColor = timeRatio > 0.3 ? '#ffa040' : timeRatio > 0.1 ? '#ff6040' : '#ff2020';

  if (gameState !== 'playing') return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        fontFamily: "'Segoe UI', sans-serif",
        zIndex: 10,
      }}
    >
      {flashVisible && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(ellipse at center, rgba(255,220,120,0.25) 0%, transparent 70%)',
            animation: 'comboFlash 0.3s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 20px',
          gap: 24,
        }}
      >
        <div
          style={{
            background: 'rgba(20,8,4,0.7)',
            border: '1px solid rgba(255,200,80,0.3)',
            borderRadius: 8,
            padding: '6px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: '#ffa040', fontSize: 14 }}>得分</span>
          <span style={{ color: '#ffd700', fontSize: 24, fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
            {score}
          </span>
        </div>

        {combo >= 3 && (
          <div
            style={{
              background: 'rgba(20,8,4,0.7)',
              border: '1px solid rgba(255,100,40,0.5)',
              borderRadius: 8,
              padding: '6px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              animation: shakeActive ? 'shake 0.15s ease-in-out' : undefined,
            }}
          >
            <span style={{ color: '#ff6040', fontSize: 14 }}>连击</span>
            <span
              style={{
                color: combo >= 10 ? '#ff4040' : combo >= 5 ? '#ff8040' : '#ffa040',
                fontSize: 24,
                fontWeight: 'bold',
              }}
            >
              x{combo}
            </span>
            {getComboLabel(combo) && (
              <span
                style={{
                  color: '#ffd700',
                  fontSize: 12,
                  fontWeight: 'bold',
                  textShadow: '0 0 8px rgba(255,200,80,0.6)',
                }}
              >
                {getComboLabel(combo)}
              </span>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 4,
        }}
      >
        <span style={{ color: 'rgba(255,200,120,0.6)', fontSize: 12 }}>飞镖</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200 }}>
          {Array.from({ length: Math.min(darts, DART_ICONS) }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 16,
                background: 'linear-gradient(to top, #ffa040, #ffd700)',
                borderRadius: 2,
                boxShadow: '0 0 4px rgba(255,160,64,0.5)',
              }}
            />
          ))}
          {darts > DART_ICONS && (
            <span style={{ color: '#ffa040', fontSize: 12, marginLeft: 4, lineHeight: '16px' }}>
              +{darts - DART_ICONS}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
        }}
      >
        <span style={{ color: 'rgba(255,200,120,0.6)', fontSize: 12 }}>
          {Math.ceil(timeRemaining)}秒
        </span>
        <div
          style={{
            width: 120,
            height: 8,
            background: 'rgba(20,8,4,0.7)',
            borderRadius: 4,
            border: '1px solid rgba(255,200,80,0.2)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${timeRatio * 100}%`,
              height: '100%',
              background: `linear-gradient(to right, ${timeColor}, ${timeColor}dd)`,
              borderRadius: 4,
              transition: 'width 0.3s ease, background 0.5s ease',
              boxShadow: `0 0 6px ${timeColor}80`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes comboFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
};
