import React, { useEffect, useState } from 'react';
import type { SkillState } from './skill-module';

interface HUDProps {
  hp: number;
  maxHp: number;
  skills: SkillState[];
  enemyCount: number;
  killedCount: number;
  roomIndex: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function interpolateColor(hex1: string, hex2: string, t: number): string {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
}

export const HealthBar: React.FC<{ hp: number; maxHp: number }> = ({ hp, maxHp }) => {
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  const color = interpolateColor('#E74C3C', '#2ECC40', pct);
  return (
    <div style={{
      width: 200,
      height: 20,
      background: 'rgba(0,0,0,0.5)',
      borderRadius: 10,
      border: '2px solid #3B82F680',
      overflow: 'hidden',
      boxShadow: '0 0 8px rgba(59,130,246,0.4)',
      position: 'relative'
    }}>
      <div style={{
        height: '100%',
        width: `${pct * 100}%`,
        background: color,
        transition: 'width 0.15s ease-out, background 0.3s',
        boxShadow: `inset 0 0 10px rgba(255,255,255,0.2)`
      }} />
      <span style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 12,
        fontWeight: 700,
        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
        pointerEvents: 'none'
      }}>
        {Math.ceil(hp)} / {maxHp}
      </span>
    </div>
  );
};

export const SkillIcon: React.FC<{ skill: SkillState; index: number }> = ({ skill, index: _index }) => {
  const size = 40;
  const radius = 20;
  const cx = size / 2;
  const cy = size / 2;
  const r = 16;
  const circumference = 2 * Math.PI * r;
  const progress = skill.ready ? 0 : skill.currentCooldown / skill.cooldown;
  const dashOffset = circumference * (1 - progress);
  const bgColor = skill.ready ? skill.color : '#555555';
  const glow = skill.flashing ? `0 0 20px ${skill.color}, 0 0 30px ${skill.color}` : `0 0 8px ${skill.color}80`;

  return (
    <div style={{
      position: 'relative',
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.3s ease',
      cursor: 'pointer'
    }} className="skill-icon">
      <svg width={size} height={size} style={{ filter: skill.flashing ? 'brightness(1.5)' : 'none', transition: 'filter 0.1s' }}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={bgColor}
          stroke={skill.color}
          strokeWidth="2"
          style={{ filter: `drop-shadow(${glow})` }}
        />
        {!skill.ready && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={skill.color}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ opacity: 0.95 }}
          />
        )}
        <text
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize="14"
          fontWeight="bold"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
        >
          {skill.key}
        </text>
        {!skill.ready && (
          <text
            x={cx}
            y={cy + radius - 2}
            textAnchor="middle"
            fill="#fff"
            fontSize="8"
            fontWeight="bold"
          >
            {(skill.currentCooldown / 1000).toFixed(1)}s
          </text>
        )}
      </svg>
    </div>
  );
};

export const HUD: React.FC<HUDProps> = ({ hp, maxHp, skills, enemyCount, killedCount, roomIndex }) => {
  const sortedSkills = [...skills].sort((a, b) => {
    const order: Record<string, number> = { fireball: 0, frost: 1, lightning: 2 };
    return order[a.id] - order[b.id];
  });
  return (
    <div style={{
      position: 'absolute',
      left: 16,
      bottom: 16,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      pointerEvents: 'none',
      userSelect: 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }} className="hud-group" onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
        <HealthBar hp={hp} maxHp={maxHp} />
        <div style={{ display: 'flex', gap: 10, pointerEvents: 'auto' }}>
          {sortedSkills.map((s, i) => (
            <SkillIcon key={s.id} skill={s} index={i} />
          ))}
        </div>
      </div>
      <div style={{
        display: 'flex',
        gap: 16,
        color: '#fff',
        fontSize: 14,
        fontWeight: 600,
        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
        background: 'rgba(0,0,0,0.35)',
        padding: '8px 14px',
        borderRadius: 8,
        border: '1px solid #3B82F640',
        transition: 'transform 0.3s ease'
      }} className="hud-group">
        <span>👾 敌人: <span style={{ color: '#E74C3C' }}>{enemyCount}</span></span>
        <span>💀 击杀: <span style={{ color: '#FFD700' }}>{killedCount}</span></span>
        <span>🚪 房间: <span style={{ color: '#3498DB' }}>#{roomIndex}</span></span>
      </div>
    </div>
  );
};

interface FPSMonitorProps {
  fps: number;
}

export const FPSMonitor: React.FC<FPSMonitorProps> = ({ fps }) => {
  const [blinkVisible, setBlinkVisible] = useState(true);
  const low = fps < 45;

  useEffect(() => {
    if (!low) { setBlinkVisible(true); return; }
    const interval = setInterval(() => setBlinkVisible(v => !v), 500);
    return () => clearInterval(interval);
  }, [low]);

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 20,
      background: '#00000070',
      color: low ? (blinkVisible ? '#FF0000' : '#FF6666') : '#FFFFFF',
      fontSize: 16,
      fontWeight: 700,
      padding: '10px 18px',
      borderRadius: 8,
      fontFamily: 'monospace',
      border: low ? '1px solid #FF000080' : '1px solid #3B82F640',
      transition: 'color 0.2s',
      textShadow: low ? '0 0 10px #FF0000' : 'none',
      userSelect: 'none'
    }}>
      FPS: {fps.toFixed(0)}
    </div>
  );
};

export const LowFPSBorder: React.FC<{ active: boolean }> = ({ active }) => {
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    if (!active) { setBlink(true); return; }
    const t = setInterval(() => setBlink(v => !v), 500);
    return () => clearInterval(t);
  }, [active]);
  if (!active) return null;
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 9999,
      border: `4px solid ${blink ? '#FF0000' : 'transparent'}`,
      boxShadow: blink ? 'inset 0 0 40px rgba(255,0,0,0.4)' : 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      boxSizing: 'border-box'
    }} />
  );
};
