interface Props {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
}

export default function CircularProgress({
  value,
  max = 100,
  size = 160,
  strokeWidth = 10
}: Props) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getGradientColor = (p: number) => {
    if (p >= 90) return '#22c55e';
    if (p >= 70) return '#84cc16';
    if (p >= 50) return '#eab308';
    if (p >= 30) return '#f97316';
    return '#ef4444';
  };

  const progressColor = getGradientColor(percentage);
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="circular-progress-wrapper" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
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
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }}
        />
      </svg>
      <div className="circular-progress-value">
        <div className="circular-progress-number" style={{ color: progressColor }}>
          {value}
        </div>
        <div className="circular-progress-unit">信用分</div>
      </div>
    </div>
  );
}
