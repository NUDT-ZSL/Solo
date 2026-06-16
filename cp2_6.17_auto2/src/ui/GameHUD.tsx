import React, { useMemo } from 'react';
import type { HUDData } from '../types';

interface GameHUDProps {
  data: HUDData;
  onBack: () => void;
}

const GameHUD: React.FC<GameHUDProps> = ({ data, onBack }) => {
  const alertColors = {
    safe: { bg: '#22c55e', text: '#22c55e', label: '安全' },
    warning: { bg: '#eab308', text: '#eab308', label: '警惕' },
    alarm: { bg: '#ef4444', text: '#ef4444', label: '警报' }
  };

  const alertStyle = alertColors[data.alertLevel];

  const echoProgress = data.maxEchoCooldown > 0
    ? 1 - (data.echoCooldown / data.maxEchoCooldown)
    : 1;
  const echoReady = data.echoCooldown <= 0;

  const dots = useMemo(() => {
    const arr = [];
    for (let i = 0; i < data.totalItems; i++) {
      arr.push(i < data.stolenCount);
    }
    return arr;
  }, [data.stolenCount, data.totalItems]);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'flex-end',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            background: 'rgba(15, 15, 35, 0.9)',
            borderRadius: '10px',
            border: `1px solid ${alertStyle.text}40`,
            backdropFilter: 'blur(8px)',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ position: 'relative', width: 28, height: 28 }}>
            <svg width="28" height="28" viewBox="0 0 28 28">
              <circle
                cx="14" cy="14" r="12"
                fill="none"
                stroke={alertStyle.text}
                strokeWidth="1.5"
                opacity="0.3"
              />
              <g style={{
                transformOrigin: '14px 14px',
                animation: 'radarSpin 2s linear infinite'
              }}>
                <path
                  d={`M14 14 L14 2 A12 12 0 0 1 ${14 + 12 * Math.cos(Math.PI / 3)} ${14 - 12 * Math.sin(Math.PI / 3)} Z`}
                  fill={alertStyle.text}
                  opacity="0.6"
                />
              </g>
              <circle
                cx="14" cy="14" r="3"
                fill={alertStyle.text}
              />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: '11px',
                color: '#a0a0b0',
                marginBottom: '2px'
              }}
            >
              警戒等级
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 'bold',
                color: alertStyle.text,
                textShadow: `0 0 8px ${alertStyle.text}60`
              }}
            >
              {alertStyle.label}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            background: 'rgba(15, 15, 35, 0.9)',
            borderRadius: '10px',
            border: '1px solid #2d2d44',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ position: 'relative', width: 30, height: 30 }}>
            <svg width="30" height="30" viewBox="0 0 30 30">
              <circle
                cx="15" cy="15" r="13"
                fill="none"
                stroke={echoReady ? '#ffdd57' : '#ef4444'}
                strokeWidth="2.5"
                opacity={echoReady ? 0.4 : 1}
                strokeDasharray={`${2 * Math.PI * 13 * echoProgress} ${2 * Math.PI * 13}`}
                strokeDashoffset={2 * Math.PI * 13 * 0.25}
                transform="rotate(-90 15 15)"
                style={{
                  filter: echoReady ? 'drop-shadow(0 0 4px #ffdd5780)' : 'none',
                  animation: echoReady ? 'echoPulse 1s ease-in-out infinite' : 'none'
                }}
              />
              <text
                x="15" y="19"
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill={echoReady ? '#ffdd57' : '#a0a0b0'}
              >
                空
              </text>
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: '11px',
                color: '#a0a0b0',
                marginBottom: '2px'
              }}
            >
              回声定位
            </div>
            <div
              style={{
                fontSize: '13px',
                color: echoReady ? '#ffdd57' : '#ef4444',
                fontWeight: 500
              }}
            >
              {echoReady ? '就绪 [空格]' : `${(data.echoCooldown / 1000).toFixed(1)}s`}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 14px',
            background: 'rgba(15, 15, 35, 0.9)',
            borderRadius: '10px',
            border: '1px solid #2d2d44',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ fontSize: '18px' }}>💎</div>
          <div>
            <div
              style={{
                fontSize: '11px',
                color: '#a0a0b0',
                marginBottom: '4px'
              }}
            >
              窃取进度
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {dots.map((done, i) => (
                <div
                  key={i}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: done ? '#ffdd57' : '#3f3f5c',
                    boxShadow: done ? '0 0 8px #ffdd5780' : 'none',
                    transition: 'all 0.3s ease',
                    transform: done ? 'scale(1.1)' : 'scale(1)'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onBack}
          style={{
            padding: '6px 14px',
            background: 'rgba(15, 15, 35, 0.9)',
            border: '1px solid #2d2d44',
            borderRadius: '8px',
            color: '#a0a0b0',
            fontSize: '12px',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
            pointerEvents: 'auto'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ffdd57';
            e.currentTarget.style.color = '#ffdd57';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2d2d44';
            e.currentTarget.style.color = '#a0a0b0';
          }}
        >
          ◀ 返回菜单
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          padding: '10px 18px',
          background: 'rgba(15, 15, 35, 0.9)',
          borderRadius: '10px',
          border: '1px solid #2d2d44',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: '#a0a0b0',
            marginBottom: '4px',
            letterSpacing: '2px'
          }}
        >
          当前关卡
        </div>
        <div
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#ffdd57',
            textShadow: '0 0 10px rgba(255, 221, 87, 0.3)'
          }}
        >
          {data.currentLevelName || '---'}
        </div>
      </div>

      {data.detectionProgress > 0.05 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 20,
            opacity: Math.min(1, data.detectionProgress * 1.5)
          }}
        >
          <div
            style={{
              width: 200,
              height: 8,
              background: 'rgba(0,0,0,0.6)',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid #ef444440'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${data.detectionProgress * 100}%`,
                background: `linear-gradient(90deg, #eab308, #ef4444)`,
                transition: 'width 0.1s linear',
                boxShadow: `0 0 12px ${data.detectionProgress > 0.6 ? '#ef4444' : '#eab308'}`
              }}
            />
          </div>
          <div
            style={{
              textAlign: 'center',
              marginTop: '8px',
              fontSize: '13px',
              fontWeight: 'bold',
              color: data.detectionProgress > 0.6 ? '#ef4444' : '#eab308',
              textShadow: '0 0 8px rgba(0,0,0,0.8)',
              letterSpacing: '4px'
            }}
          >
            {data.detectionProgress > 0.6 ? '即将暴露！' : '被侦测中...'}
          </div>
        </div>
      )}

      <style>{`
        @keyframes radarSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes echoPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </>
  );
};

export default GameHUD;
