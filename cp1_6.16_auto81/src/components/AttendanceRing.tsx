interface AttendanceRingProps {
  rate: number
  size?: number
}

export default function AttendanceRing({ rate, size = 160 }: AttendanceRingProps) {
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (rate / 100) * circumference
  const center = size / 2
  const fontSizePercent = Math.round(size * 0.175)
  const fontSizeLabel = Math.round(size * 0.08)

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#E0E6ED"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#4A90D9"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      <text
        x={center}
        y={center - 8}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSizePercent}
        fontWeight={700}
        fill="#333"
      >
        {rate}%
      </text>
      <text
        x={center}
        y={center + fontSizeLabel + 4}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSizeLabel}
        fill="#999"
      >
        出勤率
      </text>
    </svg>
  )
}
