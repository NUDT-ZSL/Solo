interface CreditProgressProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

function getGradientColors(ratio: number) {
  const r1 = 239, g1 = 68, b1 = 68;
  const r2 = 34, g2 = 197, b2 = 94;
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function CreditProgress({ score, size = 120, strokeWidth = 10 }: CreditProgressProps) {
  const validScore = Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = circumference - (validScore / 100) * circumference;
  const color = getGradientColors(validScore / 100);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <defs>
          <linearGradient id={`credit-grad-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out, stroke 0.6s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-slate-800" style={{ fontSize: size * 0.28 }}>
          {validScore}
        </span>
        <span className="text-slate-400" style={{ fontSize: size * 0.1 }}>信用分</span>
      </div>
    </div>
  );
}
