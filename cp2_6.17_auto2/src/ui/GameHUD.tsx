import React, { useMemo } from 'react';
import type { HUDData, AlertLevel } from '../types';

interface GameHUDProps {
  data: HUDData;
  onBack: () => void;
}

const GameHUD: React.FC<GameHUDProps> = ({ data, onBack }) => {
  const alertConfig: Record<AlertLevel, { color: string; bgColor: string; label: string; glow: string }> = {
    safe: {
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.12)',
      label: '安全',
      glow: '0 0 12px rgba(34, 197, 94, 0.5)'
    },
    warning: {
      color: '#eab308',
      bgColor: 'rgba(234, 179, 8, 0.12)',
      label: '警惕',
      glow: '0 0 12px rgba(234, 179, 8, 0.5)'
    },
    alarm: {
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.12)',
      label: '警报',
      glow: '0 0 12px rgba(239, 68, 68, 0.5)'
    }
  };

  const alert = alertConfig[data.alertLevel];

  const echoProgress = useMemo(() => {
    if (data.maxEchoCooldown <= 0) return 1;
    return Math.max(0, 1 - (data.echoCooldown / data.maxEchoCooldown));
  }, [data.echoCooldown, data.maxEchoCooldown]);

  const echoReady = echoProgress >= 1;
  const echoRemaining = Math.ceil(data.echoCooldown / 1000);

  const stolenDots = useMemo(() => {
    const dots: boolean[] = [];
    for (let i = 0; i < data.totalItems; i++) {
      dots.push(i < data.stolenCount);
    }
    return dots;
  }, [data.stolenCount, data.totalItems]);

  const echoCircleCircumference = 2 * Math.PI * 13;
  const echoStrokeDashoffset = echoCircleCircumference * (1 - echoProgress);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'flex-end',
          pointerEvents: 'none',
          zIndex: 20,
          padding: '16px 16px 0 0'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.95) 0%, rgba(30, 30, 54, 0.95) 100%)',
            borderRadius: '12px',
            border: `1.5px solid ${alert.color}40`,
            backdropFilter: 'blur(12px)',
            boxShadow: `
              0 4px 24px rgba(0, 0, 0, 0.4),
              ${alert.glow}
            `,
            pointerEvents: 'auto',
            minWidth: '180px'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 32,
              height: 32,
              flexShrink: 0
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke={alert.color}
                strokeWidth="1.5"
                opacity="0.25"
              />
              <g
                style={{
                  transformOrigin: '16px 16px',
                  animation: 'radarRotate 2.5s linear infinite'
                }}
              >
                <path
                  d={`M16 16 L16 2 A14 14 0 0 1 ${16 + 14 * Math.cos(Math.PI / 3)} ${16 - 14 * Math.sin(Math.PI / 3)} Z`}
                  fill={alert.color}
                  opacity="0.5"
                />
              </g>
              <circle
                cx="16"
                cy="16"
                r="4"
                fill={alert.color}
                style={{ filter: `drop-shadow(0 0 4px ${alert.color})` }}
              />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div
              style={{
                fontSize: '10px',
                color: '#a0a0b0',
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}
            >
              警戒等级
            </div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: alert.color,
                letterSpacing: '3px',
                textShadow: `0 0 10px ${alert.color}80`,
                lineHeight: 1
              }}
            >
              {alert.label}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.95) 0%, rgba(30, 30, 54, 0.95) 100%)',
            borderRadius: '12px',
            border: '1.5px solid rgba(45, 45, 68, 0.8)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
            pointerEvents: 'auto',
            minWidth: '180px'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 34,
              height: 34,
              flexShrink: 0
            }}
          >
            <svg width="34" height="34" viewBox="0 0 34 34">
              <circle
                cx="17"
                cy="17"
                r="14"
                fill="none"
                stroke={echoReady ? '#ffdd57' : '#ef4444'}
                strokeWidth="2.5"
                opacity="0.2"
              />
              <circle
                cx="17"
                cy="17"
                r="14"
                fill="none"
                stroke={echoReady ? '#ffdd57' : '#ef4444'}
                strokeWidth="2.5"
                strokeDasharray={echoCircleCircumference}
                strokeDashoffset={echoStrokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 17 17)"
                style={{
                  filter: echoReady
                    ? 'drop-shadow(0 0 6px rgba(255, 221, 87, 0.6))'
                    : 'none',
                  animation: echoReady
                    ? 'echoPulse 1.2s ease-in-out infinite'
                    : 'none'
                }}
              />
              <text
                x="17"
                y="21"
                textAnchor="middle"
                fontSize="10"
                fontWeight="bold"
                fill={echoReady ? '#ffdd57' : '#a0a0b0'}
                style={{ fontFamily: 'monospace' }}
              >
                {echoReady ? '空' : echoRemaining}
              </text>
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div
              style={{
                fontSize: '10px',
                color: '#a0a0b0',
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}
            >
              回声定位
            </div>
            <div
              style={{
                fontSize: '12px',
                color: echoReady ? '#ffdd57' : '#ef4444',
                fontWeight: 600,
                letterSpacing: '1px'
              }}
            >
              {echoReady ? '就绪 [空格]' : `冷却 ${echoRemaining}s`}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.95) 0%, rgba(30, 30, 54, 0.95) 100%)',
            borderRadius: '12px',
            border: '1.5px solid rgba(45, 45, 68, 0.8)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
            pointerEvents: 'auto',
            minWidth: '180px'
          }}
        >
          <div
            style={{
              fontSize: '22px',
              filter: 'drop-shadow(0 0 4px rgba(255, 221, 87, 0.4))'
            }}
          >
            💎
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                fontSize: '10px',
                color: '#a0a0b0',
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}
            >
              窃取进度
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {stolenDots.map((stolen, i) => (
                <div
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: stolen
                      ? 'linear-gradient(135deg, #ffdd57 0%, #ffaa00 100%)'
                      : '#3f3f5c',
                    border: `1.5px solid ${stolen ? '#ffdd57' : '#4a4a6a'}`,
                    boxShadow: stolen
                      ? '0 0 10px rgba(255, 221, 87, 0.6), inset 0 0 4px rgba(255, 255, 255, 0.3)'
                      : 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: stolen ? 'scale(1.1)' : 'scale(1)',
                    animation: stolen
                      ? `stolenPulse 2s ease-in-out ${i * 0.3}s infinite`
                      : 'none'
                  }}
                />
              ))}
            </div>
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#ffdd57',
              textShadow: '0 0 8px rgba(255, 221, 87, 0.4)',
              marginLeft: '8px'
            }}
          >
            {data.stolenCount}/{data.totalItems}
          </div>
        </div>

        <button
          onClick={onBack}
          style={{
            padding: '8px 18px',
            background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.95) 0%, rgba(30, 30, 54, 0.95) 100%)',
            border: '1.5px solid #2d2d44',
            borderRadius: '10px',
            color: '#a0a0b0',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 600,
            letterSpacing: '2px',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.25s ease',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ffdd57';
            e.currentTarget.style.color = '#ffdd57';
            e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 221, 87, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2d2d44';
            e.currentTarget.style.color = '#a0a0b0';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <span style={{ fontSize: '14px' }}>◀</span>
          返 回
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          padding: '16px 0 0 16px',
          pointerEvents: 'none',
          zIndex: 20
        }}
      >
        <div
          style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, rgba(15, 15, 35, 0.95) 0%, rgba(30, 30, 54, 0.95) 100%)',
            borderRadius: '12px',
            border: '1.5px solid rgba(45, 45, 68, 0.8)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
            minWidth: '160px'
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: '#a0a0b0',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}
          >
            当前关卡
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#ffdd57',
              letterSpacing: '3px',
              textShadow: '0 0 14px rgba(255, 221, 87, 0.5)'
            }}
          >
            {data.currentLevelName || '---'}
          </div>
        </div>
      </div>

      {data.detectionProgress > 0.08 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -60%)',
            pointerEvents: 'none',
            zIndex: 30,
            opacity: Math.min(1, data.detectionProgress * 1.3)
          }}
        >
          <div
            style={{
              width: 220,
              height: 10,
              background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '6px',
              overflow: 'hidden',
              border: `1.5px solid ${data.detectionProgress > 0.6 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(234, 179, 8, 0.6)'}`,
              boxShadow: `0 0 20px ${data.detectionProgress > 0.6 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${data.detectionProgress * 100}%`,
                background: `linear-gradient(90deg, 
                  #22c55e 0%, 
                  #eab308 40%, 
                  #ef4444 80%
                )`,
                transition: 'width 0.08s linear',
                boxShadow: `0 0 15px ${data.detectionProgress > 0.6 ? '#ef4444' : '#eab308'}`
              }}
            />
          </div>
          <div
            style={{
              textAlign: 'center',
              marginTop: '10px',
              fontSize: '14px',
              fontWeight: 700,
              color: data.detectionProgress > 0.6 ? '#ef4444' : '#eab308',
              textShadow: '0 0 10px rgba(0,0,0,0.8), 0 0 4px currentColor',
              letterSpacing: '4px',
              animation:
                data.detectionProgress > 0.6
                  ? 'dangerPulse 0.5s ease-in-out infinite'
                  : 'none'
            }}
          >
            {data.detectionProgress > 0.7
              ? '即 将 暴 露！'
              : data.detectionProgress > 0.4
              ? '被 侦 测 中...'
              : '已 被 察 觉'}
          </div>
          <div
            style={{
              textAlign: 'center',
              marginTop: '4px',
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.7)',
              letterSpacing: '1px'
            }}
          >
            {Math.floor(data.detectionProgress * 100)}% — 快躲进阴影！
          </div>
        </div>
      )}

      <style>{`
        @keyframes radarRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes echoPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.85; }
        }
        @keyframes stolenPulse {
          0%, 100% { 
            transform: scale(1.1);
            box-shadow: 0 0 10px rgba(255, 221, 87, 0.6);
          }
          50% { 
            transform: scale(1.2);
            box-shadow: 0 0 18px rgba(255, 221, 87, 0.85);
          }
        }
        @keyframes dangerPulse {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.85;
            transform: scale(1.05);
          }
        }
      `}</style>
    </>
  );
};

export default GameHUD;
