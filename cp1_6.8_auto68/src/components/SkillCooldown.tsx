import { COLORS } from '@/engine/types';

interface SkillCooldownProps {
  charging: boolean;
  chargeProgress: number;
  color: string;
}

export default function SkillCooldown({ charging, chargeProgress, color }: SkillCooldownProps) {
  const size = 28;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - chargeProgress);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {charging && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={chargeProgress >= 0.8 ? COLORS.neonYellow : color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.05s linear' }}
          />
        )}
      </svg>
      {charging && (
        <span className="absolute text-[8px] font-bold" style={{ color: chargeProgress >= 0.8 ? COLORS.neonYellow : '#fff' }}>
          {Math.round(chargeProgress * 100)}
        </span>
      )}
    </div>
  );
}
