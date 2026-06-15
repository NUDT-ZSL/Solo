import { COLORS } from '@/engine/types';

interface ShieldBarProps {
  shield: number;
  maxShield: number;
}

export default function ShieldBar({ shield, maxShield }: ShieldBarProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: maxShield }).map((_, i) => (
        <div
          key={i}
          className="w-5 h-2.5 sm:w-7 sm:h-3 rounded-sm transition-all duration-200"
          style={{
            background: i < shield
              ? `linear-gradient(180deg, ${COLORS.shieldColor}, ${COLORS.shieldColor}88)`
              : 'rgba(255,255,255,0.06)',
            boxShadow: i < shield ? `0 0 6px ${COLORS.shieldColor}60` : 'none',
            border: `1px solid ${i < shield ? COLORS.shieldColor : 'rgba(255,255,255,0.1)'}`,
          }}
        />
      ))}
    </div>
  );
}
