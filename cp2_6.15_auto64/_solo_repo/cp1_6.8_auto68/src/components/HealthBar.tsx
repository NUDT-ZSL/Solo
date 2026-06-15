import { COLORS } from '@/engine/types';

interface HealthBarProps {
  hp: number;
  maxHp: number;
  side: 'left' | 'right';
}

export default function HealthBar({ hp, maxHp, side }: HealthBarProps) {
  const pct = Math.max(0, hp / maxHp);
  const color = pct > 0.6 ? COLORS.hpHigh : pct > 0.3 ? COLORS.hpMid : COLORS.hpLow;

  return (
    <div className="flex items-center gap-2">
      {side === 'left' && (
        <span className="text-xs font-bold tracking-wider" style={{ color: COLORS.neonBlue, fontFamily: 'Orbitron, sans-serif' }}>
          P1
        </span>
      )}
      <div className="relative h-4 sm:h-5 flex-1 min-w-[80px] max-w-[200px] rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${color}40` }}
      >
        <div
          className="absolute top-0 h-full rounded-full transition-all duration-200"
          style={{
            width: `${pct * 100}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 10px ${color}60`,
            [side === 'left' ? 'left' : 'right']: 0,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold"
          style={{ color: '#fff', fontFamily: 'Rajdhani, sans-serif', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
          {Math.ceil(hp)}/{maxHp}
        </div>
      </div>
      {side === 'right' && (
        <span className="text-xs font-bold tracking-wider" style={{ color: COLORS.neonRed, fontFamily: 'Orbitron, sans-serif' }}>
          P2
        </span>
      )}
    </div>
  );
}
