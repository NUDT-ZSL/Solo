import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CombatState } from '../combat';

interface HUDProps {
  combat: CombatState;
  timeLeftMs: number;
  totalTimeMs: number;
  onTimeout?: () => void;
}

const HUD: React.FC<HUDProps> = ({ combat, timeLeftMs, totalTimeMs, onTimeout }) => {
  const [hpFlash, setHpFlash] = useState<{ [key: number]: boolean }>({});
  const prevHpRef = useRef<{ [key: number]: number }>({
    0: combat.characters[0].hp,
    1: combat.characters[1].hp,
  });

  useEffect(() => {
    const changes: { [key: number]: boolean } = {};
    let any = false;
    for (let i = 0; i < 2; i++) {
      if (combat.characters[i].hp < prevHpRef.current[i]) {
        changes[i] = true;
        any = true;
      }
      prevHpRef.current[i] = combat.characters[i].hp;
    }
    if (any) {
      setHpFlash((s) => ({ ...s, ...changes }));
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
  const warnFlash = useWarningFlash(warn);

  return (
    <div style={styles.container}>
      <div style={styles.leftPanel}>
        <PlayerHUD idx={0} combat={combat} hpFlash={!!hpFlash[0]} />
      </div>

      <div style={styles.centerPanel}>
        <div style={styles.turnText}>
          回合 <span style={{ color: '#ffaa00', fontWeight: 'bold' }}>{combat.turnNumber}</span>
        </div>
        <CountdownCircle
          pct={pct}
          warn={warn}
          warnFlash={warnFlash}
          totalSeconds={totalTimeMs / 1000}
          secondsLeft={Math.max(0, Math.ceil(timeLeftMs / 1000))}
        />
        {combat.winner !== null && (
          <div style={{ ...styles.winnerText, color: '#ffd700' }}>
            🏆 {combat.characters[combat.winner].name} 胜利！
          </div>
        )}
      </div>

      <div style={{ ...styles.rightPanel, alignItems: 'flex-end' }}>
        <PlayerHUD idx={1} combat={combat} hpFlash={!!hpFlash[1]} alignRight />
      </div>
    </div>
  );
};

function useWarningFlash(enable: boolean): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!enable) {
      setOn(false);
      return;
    }
    const id = window.setInterval(() => setOn((v) => !v), 300);
    return () => clearInterval(id);
  }, [enable]);
  return on;
}

const CountdownCircle: React.FC<{
  pct: number;
  warn: boolean;
  warnFlash: boolean;
  totalSeconds: number;
  secondsLeft: number;
}> = ({ pct, warn, warnFlash, secondsLeft }) => {
  const size = 40;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  const color = warn && warnFlash ? '#ff3333' : `url(#countdownGrad)`;

  return (
    <svg width={size} height={size} style={{ marginTop: 4 }}>
      <defs>
        <linearGradient id="countdownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffaa00" />
          <stop offset="100%" stopColor="#ff6600" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#2a2a3e"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.1s' }}
      />
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        fill={warn && warnFlash ? '#ff3333' : '#e0e0ff'}
      >
        {secondsLeft}
      </text>
    </svg>
  );
};

const PlayerHUD: React.FC<{
  idx: 0 | 1;
  combat: CombatState;
  hpFlash: boolean;
  alignRight?: boolean;
}> = ({ idx, combat, hpFlash, alignRight }) => {
  const char = combat.characters[idx];
  const hpPct = (char.hp / char.maxHp) * 100;
  const mpPct = (char.mp / char.maxMp) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: alignRight ? 'flex-end' : 'flex-start', gap: 6 }}>
      <div style={{ color: '#e0e0ff', fontWeight: 'bold', fontSize: 14 }}>
        {char.name}
      </div>
      <Bar width={180} pct={hpPct} gradFrom="#ff4444" gradTo="#cc0000" flash={hpFlash} alignRight={alignRight} label={`${char.hp}/${char.maxHp}`} labelColor="#fff" type="HP" />
      <Bar width={180} pct={mpPct} gradFrom="#4488ff" gradTo="#0044cc" flash={false} alignRight={alignRight} label={`${char.mp}/${char.maxMp}`} labelColor="#fff" type="MP" />
    </div>
  );
};

const Bar: React.FC<{
  width: number;
  pct: number;
  gradFrom: string;
  gradTo: string;
  flash: boolean;
  alignRight?: boolean;
  label: string;
  labelColor: string;
  type: string;
}> = ({ width, pct, gradFrom, gradTo, flash, alignRight, label, type }) => {
  const id = useMemo(() => `bar-${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <div
      style={{
        width,
        height: 16,
        borderRadius: 8,
        background: '#1a1a2e',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: flash ? '0 0 12px #ff3333' : 'none',
        border: flash ? '1px solid #ff3333' : '1px solid #2a2a3e',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
          borderRadius: 8,
          transition: 'width 0.3s ease',
          float: alignRight ? 'right' : 'left',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 'bold',
          color: '#fff',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
        }}
      >
        {type}: {label}
      </div>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradFrom} />
            <stop offset="100%" stopColor={gradTo} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px 24px',
    color: '#e0e0ff',
  },
  leftPanel: { display: 'flex', flexDirection: 'column', gap: 4 },
  rightPanel: { display: 'flex', flexDirection: 'column', gap: 4 },
  centerPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  turnText: { fontSize: 14, letterSpacing: 1 },
  winnerText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
    textShadow: '0 0 10px rgba(255, 215, 0, 0.6)',
    animation: 'pulse 1s ease infinite',
  },
};

export default HUD;
