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
        width: 'min(360px, 90vw)',
        maxWidth: '90vw',
        zIndex: 100,
        pointerEvents: isOpen ? 'auto' : 'none'
      }}
    >
      <div
        style={{
          backgroundColor: CONFIG.COLORS.PANEL_BG,
          borderRadius: '20px',
          border: `2px solid ${CONFIG.COLORS.PANEL_BORDER}`,
          padding: '24px',
          margin: '16px',
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 0 20px rgba(184, 134, 11, 0.1)`,
          position: 'relative',
          minHeight: '240px',
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
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                {result.weather}
              </div>
              <h2
                style={{
                  fontFamily: 'serif',
                  color: CONFIG.COLORS.PANEL_TEXT,
                  fontSize: '20px',
                  fontWeight: 'bold',
                  marginBottom: '4px'
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

            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 0',
                borderTop: `1px solid rgba(184, 134, 11, 0.2)`,
                borderBottom: `1px solid rgba(184, 134, 11, 0.2)`,
                marginBottom: '12px'
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

            <div style={{ textAlign: 'center' }}>
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
