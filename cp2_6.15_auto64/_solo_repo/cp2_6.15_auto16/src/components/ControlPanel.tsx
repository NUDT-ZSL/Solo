import React, { useEffect, useRef, useState } from 'react';
import { ActionType, GrowthStage } from '../utils/petAi';

export interface ControlPanelProps {
  petName: string;
  stage: GrowthStage;
  mood: number;
  health: number;
  hunger: number;
  isWeak: boolean;
  isEndangered: boolean;
  onAction: (action: ActionType) => void;
  weakAlertSignal: number;
}

interface StatBarProps {
  label: string;
  value: number;
  colorA: string;
  colorB: string;
  flashKey: number;
}

const STAGE_NAMES: Record<GrowthStage, string> = {
  baby: '幼年',
  child: '少年',
  teen: '青年',
  adult: '成年',
};

const ControlPanel: React.FC<ControlPanelProps> = ({
  petName,
  stage,
  mood,
  health,
  hunger,
  isWeak,
  isEndangered,
  onAction,
  weakAlertSignal,
}) => {
  const [flashMood, setFlashMood] = useState(0);
  const [flashHealth, setFlashHealth] = useState(0);
  const [flashHunger, setFlashHunger] = useState(0);

  const prevMood = useRef(mood);
  const prevHealth = useRef(health);
  const prevHunger = useRef(hunger);

  useEffect(() => {
    if (mood < prevMood.current - 0.5) setFlashMood((n) => n + 1);
    prevMood.current = mood;
  }, [mood]);
  useEffect(() => {
    if (health < prevHealth.current - 0.5) setFlashHealth((n) => n + 1);
    prevHealth.current = health;
  }, [health]);
  useEffect(() => {
    if (hunger < prevHunger.current - 0.5) setFlashHunger((n) => n + 1);
    prevHunger.current = hunger;
  }, [hunger]);

  const btnBase: React.CSSProperties = {
    width: 100,
    height: 40,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
    background: '#ffebcc',
    color: '#5a3a20',
    transition: 'all 0.1s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    userSelect: 'none',
  };

  const statusColor = isEndangered
    ? '#c62828'
    : isWeak
    ? '#ef6c00'
    : '#5a3a20';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#fff8e7',
        borderRadius: 12,
        padding: 16,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        boxShadow: 'inset 0 0 0 1px #f0e0c0',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#5a3a20',
            letterSpacing: 1,
          }}
        >
          {petName}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 14,
            color: statusColor,
            fontWeight: 600,
          }}
        >
          阶段：{STAGE_NAMES[stage]}
          {isEndangered ? ' · 濒危 ⚠️' : isWeak ? ' · 虚弱' : ''}
        </div>
        {weakAlertSignal > 0 && (
          <div
            key={weakAlertSignal}
            style={{
              marginTop: 6,
              fontSize: 12,
              color: '#d84315',
              fontWeight: 700,
              animation: 'wkFade 1.4s ease forwards',
            }}
          >
            ⚠ 小乖状态很虚弱！
          </div>
        )}
      </div>

      <div style={{ width: '80%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <StatBar
          label="饱腹度"
          value={hunger}
          colorA="#ffa500"
          colorB="#ffcc00"
          flashKey={flashHunger}
        />
        <StatBar
          label="心情"
          value={mood}
          colorA="#ff69b4"
          colorB="#ffa6d1"
          flashKey={flashMood}
        />
        <StatBar
          label="健康"
          value={health}
          colorA="#20b2aa"
          colorB="#66d6cf"
          flashKey={flashHealth}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginTop: 8,
        }}
      >
        <ActionButton style={btnBase} onClick={() => onAction('feed')} label="喂食" icon="🍽️" />
        <ActionButton style={btnBase} onClick={() => onAction('clean')} label="清洁" icon="🛁" />
        <ActionButton style={btnBase} onClick={() => onAction('play')} label="玩耍" icon="🎾" />
        <ActionButton style={btnBase} onClick={() => onAction('talk')} label="交流" icon="💬" />
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: '#a08060',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        点击按钮互动，照顾好小乖吧～
        <br />
        每 72 秒成长一个阶段
      </div>

      <style>{`
        @keyframes wkFade {
          0% { opacity: 0; transform: translateY(-6px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes redFlash {
          0% { box-shadow: 0 0 0 0 rgba(255,60,60,0); }
          25% { box-shadow: 0 0 8px 3px rgba(255,60,60,0.8); }
          100% { box-shadow: 0 0 0 0 rgba(255,60,60,0); }
        }
        @keyframes redBgPulse {
          0% { background-color: #e0d0c0; }
          30% { background-color: #ff9999; }
          100% { background-color: #e0d0c0; }
        }
      `}</style>
    </div>
  );
};

const StatBar: React.FC<StatBarProps> = ({ label, value, colorA, colorB, flashKey }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!outerRef.current) return;
    outerRef.current.style.animation = 'none';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    outerRef.current.offsetHeight;
    outerRef.current.style.animation = 'redFlash 0.3s ease';
  }, [flashKey]);

  useEffect(() => {
    if (!innerRef.current) return;
    innerRef.current.style.animation = 'none';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    innerRef.current.offsetHeight;
    innerRef.current.style.animation = 'redBgPulse 0.3s ease';
  }, [flashKey]);

  const pct = Math.max(0, Math.min(100, value));

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#7a5a3a',
          marginBottom: 4,
          fontWeight: 600,
        }}
      >
        <span>{label}</span>
        <span>{Math.round(pct)}/100</span>
      </div>
      <div
        ref={outerRef}
        style={{
          width: '100%',
          height: 16,
          background: '#e0d0c0',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)',
        }}
      >
        <div
          ref={innerRef}
          style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${colorA}, ${colorB})`,
            borderRadius: 8,
            transition: 'width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: `0 0 4px ${colorA}55`,
          }}
        />
      </div>
    </div>
  );
};

interface ActionButtonProps {
  style: React.CSSProperties;
  onClick: () => void;
  label: string;
  icon: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ style, onClick, label, icon }) => {
  const [pressed, setPressed] = useState(false);
  const [hover, setHover] = useState(false);

  const merged: React.CSSProperties = {
    ...style,
    background: pressed ? '#ffb84d' : hover ? '#ffd699' : '#ffebcc',
    transform: pressed ? 'scale(0.95)' : hover ? 'translateY(-2px)' : 'translateY(0)',
    boxShadow: hover
      ? '0 4px 10px rgba(255,180,80,0.35)'
      : '0 1px 3px rgba(0,0,0,0.08)',
  };

  return (
    <button
      style={merged}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onClick={onClick}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
};

export default ControlPanel;
