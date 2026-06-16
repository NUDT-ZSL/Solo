import React, { useEffect, useState } from 'react';
import { DivinationResult } from './types';
import { CONFIG } from './config';

interface DivinationPanelProps {
  result: DivinationResult | null;
  isOpen: boolean;
  onClose: () => void;
  cooldownRemaining: number;
}

const DivinationPanel: React.FC<DivinationPanelProps> = ({ result, isOpen, onClose, cooldownRemaining }) => {
  const [countdown, setCountdown] = useState(cooldownRemaining);

  useEffect(() => {
    setCountdown(cooldownRemaining);
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1000) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const formatCountdown = (ms: number): string => {
    if (ms <= 0) return '00:00:00';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: isOpen ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100%)',
        transition: `transform ${CONFIG.ANIMATION.PANEL_SLIDE_DURATION}ms ease-out`,
        width: 'min(380px, 90vw)',
        maxWidth: '90vw',
        zIndex: 100,
        pointerEvents: isOpen ? 'auto' : 'none'
      }}
    >
      <div
        style={{
          backgroundColor: CONFIG.COLORS.PANEL_BG,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M5 5h10v5h-5v5h-5zM45 5h10v5h-5v5h-5zM5 45h5v5h5v5h-10zM45 50h5v5h-10v-5h5zM15 15h5v5h-5zM40 15h5v5h-5zM15 40h5v5h-5zM40 40h5v5h-5zM20 5h5v5h-5v5h-5v-5h5zM35 5h5v5h-5v5h-5v-5h5zM20 50h5v5h-5v-5h-5v5h10v-5zM35 50h5v5h-5v-5h-5v5h10v-5zM5 20h5v5h-5zM50 20h5v5h-5zM5 35h5v5h-5zM50 35h5v5h-5z' fill='%23b8860b' fill-opacity='0.08'/%3E%3C/svg%3E")`,
          borderRadius: '20px',
          border: `2px solid ${CONFIG.COLORS.PANEL_BORDER}`,
          padding: '20px 24px',
          margin: '16px',
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 0 20px rgba(184, 134, 11, 0.1)`,
          position: 'relative',
          minHeight: '320px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '18px',
            border: `1px solid rgba(184, 134, 11, 0.3)`,
            pointerEvents: 'none',
            margin: '4px'
          }}
        />

        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: `1px solid ${CONFIG.COLORS.PANEL_BORDER}`,
            backgroundColor: 'transparent',
            color: CONFIG.COLORS.PANEL_TEXT,
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(184, 134, 11, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ✕
        </button>

        {result ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>
                {result.weather}
              </div>
              <h2
                style={{
                  fontFamily: 'serif',
                  color: CONFIG.COLORS.PANEL_TEXT,
                  fontSize: '20px',
                  fontWeight: 'bold',
                  marginBottom: '2px'
                }}
              >
                {result.constellationName}
              </h2>
              <p
                style={{
                  fontFamily: 'serif',
                  color: CONFIG.COLORS.CONSTELLATION_TEXT,
                  fontSize: '13px',
                  margin: 0
                }}
              >
                {result.zodiac}
              </p>
            </div>

            {result.fortunes && result.fortunes.length > 0 && (
              <div
                style={{
                  padding: '10px 12px',
                  borderTop: `1px solid rgba(184, 134, 11, 0.2)`,
                  marginBottom: '10px'
                }}
              >
                {result.fortunes.map((fortune, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      fontFamily: 'serif',
                      fontSize: '15px'
                    }}
                  >
                    <span style={{ color: CONFIG.COLORS.PANEL_TEXT }}>
                      {fortune.icon} {fortune.label}
                    </span>
                    <span style={{ color: fortune.color, fontWeight: 'bold' }}>
                      {fortune.level}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                borderTop: `1px solid rgba(184, 134, 11, 0.3)`,
                borderBottom: `1px solid rgba(184, 134, 11, 0.3)`,
                padding: '10px 0',
                marginBottom: '10px'
              }}
            >
              <p
                style={{
                  fontFamily: 'serif',
                  color: CONFIG.COLORS.PANEL_TEXT,
                  fontSize: '16px',
                  textAlign: 'center',
                  lineHeight: 1.8,
                  margin: 0
                }}
              >
                {result.text}
              </p>
            </div>

            {result.auspicious && result.inauspicious && (
              <div
                style={{
                  padding: '0 4px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
                  <p
                    style={{
                      fontFamily: 'serif',
                      color: '#5d4037',
                      fontSize: '14px',
                      margin: 0
                    }}
                  >
                    宜：{result.auspicious.join('、')}
                  </p>
                  <p
                    style={{
                      fontFamily: 'serif',
                      color: '#5d4037',
                      fontSize: '14px',
                      margin: 0
                    }}
                  >
                    忌：{result.inauspicious.join('、')}
                  </p>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 'auto' }}>
              <p
                style={{
                  fontFamily: 'serif',
                  color: CONFIG.COLORS.PANEL_TEXT,
                  fontSize: '12px',
                  marginBottom: '4px',
                  opacity: 0.7
                }}
              >
                占卜于 {result.date}
              </p>
              {countdown > 0 && (
                <p
                  style={{
                    fontFamily: 'serif',
                    color: CONFIG.COLORS.COUNTDOWN,
                    fontSize: '14px',
                    margin: 0,
                    fontWeight: 'bold'
                  }}
                >
                  下次占卜在 {formatCountdown(countdown)}
                </p>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p
              style={{
                fontFamily: 'serif',
                color: CONFIG.COLORS.PANEL_TEXT,
                fontSize: '16px',
                opacity: 0.7,
                textAlign: 'center'
              }}
            >
              点击星宿以占卜吉凶
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DivinationPanel;
