import React, { useState, useEffect } from 'react';

interface ControlPanelProps {
  energy: number;
  maxEnergy: number;
  level: number;
  levelName: string;
  fragmentsCollected: number;
  totalFragments: number;
  starGatesTotal: number;
  starGatesUnlocked: number;
  onReset: () => void;
  onLevelSelect: (level: number) => void;
  maxLevel: number;
  levelComplete: boolean;
  score?: { time: number; energyEfficiency: number; fragmentRate: number } | null;
}

export default function ControlPanel({
  energy,
  maxEnergy,
  level,
  levelName,
  fragmentsCollected,
  totalFragments,
  starGatesTotal,
  starGatesUnlocked,
  onReset,
  onLevelSelect,
  maxLevel,
  levelComplete,
  score,
}: ControlPanelProps) {
  const [visible, setVisible] = useState(true);
  const [showScore, setShowScore] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true));
  }, []);

  useEffect(() => {
    if (levelComplete) {
      const timer = setTimeout(() => setShowScore(true), 600);
      return () => clearTimeout(timer);
    } else {
      setShowScore(false);
    }
  }, [levelComplete]);

  const energyPercent = (energy / maxEnergy) * 100;
  const energyColor = energyPercent > 60 ? '#44ddaa' : energyPercent > 30 ? '#ddaa44' : '#dd4444';
  const gatePercent = starGatesTotal > 0 ? (starGatesUnlocked / starGatesTotal) * 100 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 260,
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease',
        transform: animateIn ? 'translateY(0)' : 'translateY(30px)',
        opacity: animateIn ? 1 : 0,
        pointerEvents: 'auto',
        zIndex: 10,
      }}
    >
      <div
        style={{
          background: 'rgba(15, 20, 40, 0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: 16,
          border: '1px solid rgba(100, 160, 255, 0.15)',
          padding: '18px 20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(100, 160, 255, 0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <span
            style={{
              color: 'rgba(180, 210, 255, 0.9)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            控制面板
          </span>
          <button
            onClick={() => setVisible(!visible)}
            style={{
              background: 'rgba(100, 160, 255, 0.1)',
              border: '1px solid rgba(100, 160, 255, 0.2)',
              borderRadius: 6,
              color: 'rgba(180, 210, 255, 0.8)',
              cursor: 'pointer',
              fontSize: 12,
              padding: '2px 8px',
              transition: 'background 0.2s',
            }}
          >
            {visible ? '▾' : '▸'}
          </button>
        </div>

        <div
          style={{
            maxHeight: visible ? 500 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 5,
              }}
            >
              <span style={{ color: 'rgba(180, 210, 255, 0.7)', fontSize: 11 }}>
                能量
              </span>
              <span style={{ color: energyColor, fontSize: 11, fontWeight: 600 }}>
                {Math.floor(energy)} / {maxEnergy}
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: 'rgba(30, 40, 60, 0.8)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${energyPercent}%`,
                  background: `linear-gradient(90deg, ${energyColor}cc, ${energyColor})`,
                  borderRadius: 3,
                  transition: 'width 0.15s ease-out',
                  boxShadow: `0 0 8px ${energyColor}66`,
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 5,
              }}
            >
              <span style={{ color: 'rgba(180, 210, 255, 0.7)', fontSize: 11 }}>
                星门进度
              </span>
              <span style={{ color: 'rgba(100, 200, 255, 0.9)', fontSize: 11, fontWeight: 600 }}>
                {starGatesUnlocked} / {starGatesTotal}
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: 'rgba(30, 40, 60, 0.8)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${gatePercent}%`,
                  background: 'linear-gradient(90deg, #4488cc, #66aaff)',
                  borderRadius: 3,
                  transition: 'width 0.3s ease-out',
                  boxShadow: '0 0 8px rgba(100, 170, 255, 0.4)',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 5,
              }}
            >
              <span style={{ color: 'rgba(180, 210, 255, 0.7)', fontSize: 11 }}>
                恒星碎片
              </span>
              <span style={{ color: 'rgba(255, 220, 100, 0.9)', fontSize: 11, fontWeight: 600 }}>
                {fragmentsCollected} / {totalFragments}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Array.from({ length: totalFragments }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: i < fragmentsCollected
                      ? 'radial-gradient(circle, #ffdd66, #cc9922)'
                      : 'rgba(60, 70, 90, 0.5)',
                    boxShadow: i < fragmentsCollected ? '0 0 6px rgba(255, 220, 100, 0.5)' : 'none',
                    transition: 'background 0.3s, box-shadow 0.3s',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <span style={{ color: 'rgba(180, 210, 255, 0.7)', fontSize: 11, display: 'block', marginBottom: 6 }}>
              关卡选择
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Array.from({ length: maxLevel }, (_, i) => i + 1).map((lv) => (
                <button
                  key={lv}
                  onClick={() => onLevelSelect(lv)}
                  style={{
                    width: 32,
                    height: 28,
                    borderRadius: 6,
                    border: lv === level
                      ? '1px solid rgba(100, 200, 255, 0.6)'
                      : '1px solid rgba(100, 160, 255, 0.15)',
                    background: lv === level
                      ? 'rgba(100, 160, 255, 0.2)'
                      : 'rgba(30, 40, 60, 0.5)',
                    color: lv === level
                      ? 'rgba(180, 220, 255, 0.95)'
                      : 'rgba(140, 170, 210, 0.6)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: lv === level ? 700 : 400,
                    transition: 'all 0.2s',
                  }}
                >
                  {lv}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onReset}
            style={{
              width: '100%',
              padding: '8px 0',
              borderRadius: 8,
              border: '1px solid rgba(100, 160, 255, 0.2)',
              background: 'rgba(60, 40, 80, 0.3)',
              color: 'rgba(180, 210, 255, 0.85)',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(100, 60, 120, 0.4)';
              e.currentTarget.style.borderColor = 'rgba(180, 140, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(60, 40, 80, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(100, 160, 255, 0.2)';
            }}
          >
            ↻ 重置关卡
          </button>
        </div>
      </div>

      {showScore && score && (
        <div
          style={{
            marginTop: 10,
            background: 'rgba(15, 20, 40, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 16,
            border: '1px solid rgba(255, 220, 100, 0.2)',
            padding: '16px 20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            animation: 'scoreSlideIn 0.5s ease-out',
          }}
        >
          <div
            style={{
              color: 'rgba(255, 220, 100, 0.9)',
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 10,
              textAlign: 'center',
              letterSpacing: 2,
            }}
          >
            ✦ 关卡完成 ✦
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ScoreRow label="用时" value={`${score.time.toFixed(1)}s`} />
            <ScoreRow label="能量效率" value={`${(score.energyEfficiency * 100).toFixed(0)}%`} />
            <ScoreRow label="碎片收集" value={`${(score.fragmentRate * 100).toFixed(0)}%`} />
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ color: 'rgba(180, 210, 255, 0.7)', fontSize: 12 }}>{label}</span>
      <span style={{ color: 'rgba(255, 230, 150, 0.9)', fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
