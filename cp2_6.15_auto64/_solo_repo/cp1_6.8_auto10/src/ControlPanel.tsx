import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EcologyManager } from './EcologyManager';
import { CardData } from './InteractionSystem';

interface ControlPanelProps {
  ecology: EcologyManager;
  onCardData: CardData;
  onDismissCard: () => void;
}

function useSpring(target: number, stiffness: number = 0.15, damping: number = 0.8): number {
  const [current, setCurrent] = useState(target);
  const velocity = useRef(0);
  const prevTarget = useRef(target);

  useEffect(() => {
    let raf: number;
    const animate = () => {
      setCurrent((prev) => {
        const diff = target - prev;
        velocity.current = (velocity.current + diff * stiffness) * damping;
        const next = prev + velocity.current;
        if (Math.abs(diff) < 0.001 && Math.abs(velocity.current) < 0.001) {
          velocity.current = 0;
          return target;
        }
        raf = requestAnimationFrame(animate);
        return next;
      });
    };
    if (Math.abs(target - prevTarget.current) > 0.001) {
      raf = requestAnimationFrame(animate);
    }
    prevTarget.current = target;
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, stiffness, damping]);

  return current;
}

const Slider: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  icon: string;
}> = ({ label, value, onChange, color, icon }) => {
  const animatedValue = useSpring(value);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(() => setIsDragging(true), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      const handler = () => setIsDragging(false);
      window.addEventListener('mouseup', handler);
      return () => window.removeEventListener('mouseup', handler);
    }
  }, [isDragging]);

  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
      }}>
        <span style={{
          color: '#c0b0e0',
          fontSize: '13px',
          fontWeight: 500,
          letterSpacing: '0.5px',
        }}>
          {icon} {label}
        </span>
        <span style={{
          color: color,
          fontSize: '12px',
          fontWeight: 700,
          fontFamily: 'monospace',
          background: `rgba(${hexToRgb(color)}, 0.15)`,
          padding: '2px 8px',
          borderRadius: '10px',
        }}>
          {Math.round(animatedValue * 100)}%
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '6px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '3px',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${animatedValue * 100}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: '3px',
          transition: isDragging ? 'none' : 'width 0.05s',
          boxShadow: `0 0 8px ${color}66`,
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: `${animatedValue * 100}%`,
          transform: 'translate(-50%, -50%)',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 12px ${color}88, 0 2px 4px rgba(0,0,0,0.3)`,
          transition: isDragging ? 'none' : 'left 0.05s',
          border: '2px solid rgba(255,255,255,0.3)',
        }} />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />
      </div>
    </div>
  );
};

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '255,255,255';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

const InfoCard: React.FC<{
  card: NonNullable<CardData>;
  onDismiss: () => void;
}> = ({ card, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  const ecologyColor = card.ecologyIndex > 70 ? '#44ffaa' : card.ecologyIndex > 40 ? '#ffaa44' : '#ff4466';

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.8})`,
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      zIndex: 100,
      pointerEvents: 'auto',
    }}>
      <div style={{
        background: 'rgba(15, 10, 35, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.12)',
        padding: '24px',
        minWidth: '300px',
        maxWidth: '380px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 60px rgba(100,60,180,0.15)',
        color: '#e0d8f0',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #b088ff, #66ddff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {card.terrainName}
          </h3>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#aaa',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            ✕
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '10px',
        }}>
          <span style={{ fontSize: '13px', color: '#999' }}>交互点</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#c8b8ff' }}>{card.label}</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '10px',
        }}>
          <span style={{ fontSize: '13px', color: '#999' }}>生态指数</span>
          <span style={{
            fontSize: '20px',
            fontWeight: 800,
            color: ecologyColor,
            fontFamily: 'monospace',
          }}>
            {card.ecologyIndex}
          </span>
          <div style={{
            flex: 1,
            height: '4px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${card.ecologyIndex}%`,
              background: ecologyColor,
              borderRadius: '2px',
              boxShadow: `0 0 6px ${ecologyColor}66`,
            }} />
          </div>
        </div>

        {card.interactionLog.length > 0 && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '10px',
            maxHeight: '120px',
            overflowY: 'auto',
          }}>
            <div style={{
              fontSize: '12px',
              color: '#888',
              marginBottom: '8px',
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}>
              互动事件记录
            </div>
            {card.interactionLog.map((entry, i) => (
              <div key={i} style={{
                fontSize: '11px',
                color: '#b0a8c8',
                padding: '3px 0',
                borderBottom: i < card.interactionLog.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                {entry}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({ ecology, onCardData, onDismissCard }) => {
  const [vitality, setVitality] = useState(ecology.getState().vitality);
  const [evolutionSpeed, setEvolutionSpeed] = useState(ecology.getState().evolutionSpeed);
  const [particleDensity, setParticleDensity] = useState(ecology.getState().particleDensity);
  const [collapsed, setCollapsed] = useState(false);

  const handleVitalityChange = useCallback((v: number) => {
    setVitality(v);
    ecology.setVitality(v);
  }, [ecology]);

  const handleEvolutionChange = useCallback((v: number) => {
    setEvolutionSpeed(v);
    ecology.setEvolutionSpeed(v);
  }, [ecology]);

  const handleParticleChange = useCallback((v: number) => {
    setParticleDensity(v);
    ecology.setParticleDensity(v);
  }, [ecology]);

  return (
    <>
      {onCardData && <InfoCard card={onCardData} onDismiss={onDismissCard} />}

      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 50,
        pointerEvents: 'auto',
      }}>
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'rgba(15, 10, 35, 0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '8px 16px',
            color: '#c0b0e0',
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: collapsed ? '0' : '12px',
            textAlign: 'center',
            fontWeight: 600,
            letterSpacing: '1px',
            transition: 'all 0.3s',
            userSelect: 'none',
          }}
        >
          {collapsed ? '◈ 控制面板' : '▾ 收起面板'}
        </div>

        {!collapsed && (
          <div style={{
            background: 'rgba(15, 10, 35, 0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '20px 22px',
            minWidth: '260px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(80,40,160,0.1)',
          }}>
            <div style={{
              fontSize: '11px',
              color: '#7a6a9a',
              marginBottom: '16px',
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}>
              星壤幻境 · 控制
            </div>

            <Slider
              label="生态活力"
              value={vitality}
              onChange={handleVitalityChange}
              color="#44ffaa"
              icon="✦"
            />
            <Slider
              label="地形演化速度"
              value={evolutionSpeed}
              onChange={handleEvolutionChange}
              color="#8866ff"
              icon="◈"
            />
            <Slider
              label="粒子密度"
              value={particleDensity}
              onChange={handleParticleChange}
              color="#ff6644"
              icon="❋"
            />

            <div style={{
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#6a5a8a',
            }}>
              <span>点击星球交互点触发生态回响</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
