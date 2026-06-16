import React, { useState } from 'react';
import { DivinationResult } from './types';
import { CONFIG } from './config';

interface LogPanelProps {
  logs: DivinationResult[];
  isOpen: boolean;
  onClose: () => void;
}

const LogPanel: React.FC<LogPanelProps> = ({ logs, isOpen, onClose }) => {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const recentLogs = logs.slice(-7).reverse();

  return (
    <>
      <button
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const id = Date.now();
          setRipples(prev => [...prev, { id, x, y }]);
          setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== id));
          }, 600);
          onClose();
        }}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: `${CONFIG.SIZES.LOG_BUTTON_SIZE}px`,
          height: `${CONFIG.SIZES.LOG_BUTTON_SIZE}px`,
          borderRadius: '50%',
          backgroundColor: CONFIG.COLORS.BUTTON,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: `all ${CONFIG.ANIMATION.TRANSITION_DURATION}ms ease`,
          zIndex: 200,
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = CONFIG.COLORS.BUTTON_HOVER;
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = CONFIG.COLORS.BUTTON;
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        📜
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            style={{
              position: 'absolute',
              left: ripple.x,
              top: ripple.y,
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.6)',
              transform: 'translate(-50%, -50%)',
              animation: 'ripple 0.6s ease-out forwards',
              pointerEvents: 'none'
            }}
          />
        ))}
      </button>

      <style>{`
        @keyframes ripple {
          0% {
            width: 10px;
            height: 10px;
            opacity: 1;
          }
          100% {
            width: 100px;
            height: 100px;
            opacity: 0;
          }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: `min(${CONFIG.SIZES.LOG_PANEL_WIDTH}px, 85vw)`,
          maxWidth: '85vw',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: `transform ${CONFIG.ANIMATION.LOG_SLIDE_DURATION}ms ease-out`,
          zIndex: 150,
          pointerEvents: isOpen ? 'auto' : 'none',
          display: 'flex',
          justifyContent: 'flex-end'
        }}
      >
        <div
          style={{
            backgroundColor: CONFIG.COLORS.PANEL_BG,
            borderRadius: '12px 0 0 12px',
            borderLeft: `2px solid ${CONFIG.COLORS.PANEL_BORDER}`,
            borderTop: `2px solid ${CONFIG.COLORS.PANEL_BORDER}`,
            borderBottom: `2px solid ${CONFIG.COLORS.PANEL_BORDER}`,
            padding: '20px',
            margin: '16px 0 16px 0',
            width: '100%',
            maxHeight: 'calc(100% - 32px)',
            overflowY: 'auto',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.3)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3
              style={{
                fontFamily: 'serif',
                color: CONFIG.COLORS.PANEL_TEXT,
                fontSize: '18px',
                fontWeight: 'bold',
                margin: 0
              }}
            >
              占卜日志
            </h3>
            <button
              onClick={onClose}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: `1px solid ${CONFIG.COLORS.PANEL_BORDER}`,
                backgroundColor: 'transparent',
                color: CONFIG.COLORS.PANEL_TEXT,
                fontSize: '14px',
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
          </div>

          <div style={{ borderTop: `1px solid rgba(184, 134, 11, 0.2)`, paddingTop: '12px' }}>
            {recentLogs.length === 0 ? (
              <p
                style={{
                  fontFamily: 'serif',
                  color: CONFIG.COLORS.PANEL_TEXT,
                  fontSize: '13px',
                  textAlign: 'center',
                  opacity: 0.6,
                  padding: '20px 0'
                }}
              >
                暂无占卜记录
              </p>
            ) : (
              recentLogs.map((log, index) => (
                <div
                  key={log.id}
                  style={{
                    padding: '10px 0',
                    borderBottom: index < recentLogs.length - 1 ? '1px solid rgba(184, 134, 11, 0.1)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px' }}>{log.weather}</span>
                    <span
                      style={{
                        fontFamily: 'serif',
                        color: CONFIG.COLORS.CONSTELLATION_TEXT,
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}
                    >
                      {log.constellationName}
                    </span>
                  </div>
                  {log.fortunes && log.fortunes.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      {log.fortunes.map((f, i) => (
                        <span
                          key={i}
                          style={{
                            fontFamily: 'serif',
                            fontSize: '12px',
                            color: f.color,
                            fontWeight: 'bold'
                          }}
                        >
                          {f.icon}{f.level}
                        </span>
                      ))}
                    </div>
                  )}
                  <p
                    style={{
                      fontFamily: 'serif',
                      color: CONFIG.COLORS.PANEL_TEXT,
                      fontSize: '13px',
                      lineHeight: 1.5,
                      margin: '0 0 4px 0'
                    }}
                  >
                    {log.text}
                  </p>
                  {log.auspicious && log.inauspicious && (
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontFamily: 'serif',
                          color: '#5d4037',
                          fontSize: '12px'
                        }}
                      >
                        宜：{log.auspicious.join('、')}
                      </span>
                      <span
                        style={{
                          fontFamily: 'serif',
                          color: '#5d4037',
                          fontSize: '12px'
                        }}
                      >
                        忌：{log.inauspicious.join('、')}
                      </span>
                    </div>
                  )}
                  <p
                    style={{
                      fontFamily: 'serif',
                      color: CONFIG.COLORS.PANEL_TEXT,
                      fontSize: '11px',
                      opacity: 0.5,
                      margin: 0
                    }}
                  >
                    {log.date}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            zIndex: 140,
            opacity: 1,
            transition: `opacity ${CONFIG.ANIMATION.LOG_SLIDE_DURATION}ms ease`
          }}
        />
      )}
    </>
  );
};

export default LogPanel;
