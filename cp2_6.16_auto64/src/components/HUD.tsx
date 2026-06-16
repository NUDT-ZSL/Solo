import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CombatState } from '../combat';

interface HUDProps {
  combat: CombatState;
  timeLeftMs: number;
  totalTimeMs: number;
  onTimeout?: () => void;
}

const HUD: React.FC<HUDProps> = ({ combat, timeLeftMs, totalTimeMs, onTimeout }) => {
  const [hpFlash, setHpFlash] = useState<Record<number, boolean>>({});
  const prevHpRef = useRef<Record<number, number>>({
    0: combat.characters[0].hp,
    1: combat.characters[1].hp,
  });

  useEffect(() => {
    const ch: Record<number, boolean> = {};
    let any = false;
    for (let i = 0; i < 2; i++) {
      if (combat.characters[i].hp < prevHpRef.current[i]) {
        ch[i] = true;
        any = true;
      }
      prevHpRef.current[i] = combat.characters[i].hp;
    }
    if (any) {
      setHpFlash((s) => ({ ...s, ...ch }));
      const t = window.setTimeout(() => setHpFlash({}), 400);
      return () => clearTimeout(t);
    }
  }, [combat.characters[0].hp, combat.characters[1].hp]);

  useEffect(() => {
    if (timeLeftMs <= 0 && combat.winner === null) {
      onTimeout?.();
    }
  }, [timeLeftMs, combat.winner, onTimeout]);

  const pct = Math.max(0, Math.min(1, timeLeftMs / totalTimeMs));
  const warn = timeLeftMs <= 5000 && combat.winner === null;
  const flashOn = useWarningFlash(warn);

  return (
    <div style={styles.container}>
      <div style={styles.leftPanel}>
        <PlayerHUD idx={0} combat={combat} flash={!!hpFlash[0]} />
      </div>
      <div style={styles.centerPanel}>
        <div style={styles.turnText}>
          回合 <span style={{ color: '#ffaa00', fontWeight: 'bold' }}>{combat.turnNumber}</span>
        </div>
        <CountdownCircle pct={pct} warn={warn} flash={flashOn} secondsLeft={Math.max(0, Math.ceil(timeLeftMs / 1000))} />
        {combat.winner !== null && (
          <div style={styles.winnerText}>
            🏆 {combat.characters[combat.winner].name} 胜利！
          </div>
        )}
      </div>
      <div style={{ ...styles.rightPanel, alignItems: 'flex-end' }}>
        <PlayerHUD idx={1} combat={combat} flash={!!hpFlash[1]} right />
      </div>
    </div>
  );
};

function useWarningFlash(enable: boolean): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!enable) { setOn(false); return; }
    const id = window.setInterval(() => setOn((v) => !v), 250);
    return () => clearInterval(id);
  }, [enable]);
  return on;
}

const CountdownCircle: React.FC<{
  pct: number;
  warn: boolean;
  flash: boolean;
  secondsLeft: number;
}> = ({ pct, warn, flash, secondsLeft }) => {
  const size = 40;
  const sw = 4;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const strokeColor = warn && flash ? '#ff3333' : '#ff8800';
  const bgColor = warn && flash ? 'rgba(255,50,50,0.3)' : 'transparent';

  return (
    <div style={{
      width: size + 8,
      height: size + 8,
      borderRadius: '50%',
      background: bgColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.15s',
      marginTop: 4,
    }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="cdGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffaa00" />
            <stop offset="100%" stopColor="#ff6600" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2a2a3e" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={warn ? strokeColor : 'url(#cdGrad)'}
          strokeWidth={sw}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.15s' }}
        />
        <text
          x={size / 2} y={size / 2 + 4}
          textAnchor="middle" fontSize="12" fontWeight="bold"
          fill={warn && flash ? '#ff3333' : '#e0e0ff'}
          style={{ transition: 'fill 0.15s' }}
        >
          {secondsLeft}
        </text>
      </svg>
    </div>
  );
};

const PlayerHUD: React.FC<{
  idx: 0 | 1;
  combat: CombatState;
  flash: boolean;
  right?: boolean;
}> = ({ idx, combat, flash, right }) => {
  const ch = combat.characters[idx];
  const hp = (ch.hp / ch.maxHp) * 100;
  const mp = (ch.mp / ch.maxMp) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: right ? 'flex-end' : 'flex-start', gap: 6 }}>
      <div style={{ color: '#e0e0ff', fontWeight: 'bold', fontSize: 14 }}>{ch.name}</div>
      <StatBar w={180} pct={hp} from="#ff4444" to="#cc0000" flash={flash} right={right} label={`HP: ${ch.hp}/${ch.maxHp}`} />
      <StatBar w={180} pct={mp} from="#4488ff" to="#0044cc" flash={false} right={right} label={`MP: ${ch.mp}/${ch.maxMp}`} />
    </div>
  );
};

const StatBar: React.FC<{
  w: number; pct: number; from: string; to: string; flash: boolean; right?: boolean; label: string;
}> = ({ w, pct, from, to, flash, right, label }) => (
  <div style={{
    width: w, height: 16, borderRadius: 8, background: '#1a1a2e', overflow: 'hidden',
    position: 'relative',
    boxShadow: flash ? '0 0 12px #ff3333' : 'none',
    border: flash ? '1px solid #ff3333' : '1px solid #2a2a3e',
    transition: 'box-shadow 0.2s, border-color 0.2s',
  }}>
    <div style={{
      width: `${pct}%`, height: '100%',
      background: `linear-gradient(90deg, ${from}, ${to})`,
      borderRadius: 8, transition: 'width 0.3s ease',
      float: right ? 'right' : 'left',
    }} />
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 'bold', color: '#fff',
      textShadow: '0 1px 2px rgba(0,0,0,0.8)', pointerEvents: 'none',
    }}>
      {label}
    </div>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 24px', color: '#e0e0ff' },
  leftPanel: { display: 'flex', flexDirection: 'column', gap: 4 },
  rightPanel: { display: 'flex', flexDirection: 'column', gap: 4 },
  centerPanel: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  turnText: { fontSize: 14, letterSpacing: 1 },
  winnerText: { marginTop: 8, fontSize: 16, fontWeight: 'bold', color: '#ffd700', textShadow: '0 0 10px rgba(255,215,0,0.6)' },
};

export default HUD;
