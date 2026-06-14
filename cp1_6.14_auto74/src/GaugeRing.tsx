import { useEffect, useRef, useState } from 'react';

interface GaugeRingProps {
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  textColor?: string;
  unit?: string;
}

export default function GaugeRing({
  value,
  maxValue,
  size = 120,
  strokeWidth = 12,
  color = '#3fb950',
  bgColor = '#21262d',
  textColor = '#f0f6fc',
  unit = '%'
}: GaugeRingProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const targetValueRef = useRef(value);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (displayValue / maxValue) * circumference;
  const center = size / 2;

  useEffect(() => {
    targetValueRef.current = value;
    startValueRef.current = displayValue;
    const startTime = performance.now();
    const duration = 500;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValueRef.current + (targetValueRef.current - startValueRef.current) * easeProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  return (
    <div style={{ 
      position: 'relative', 
      width: size, 
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <svg 
        width={size} 
        height={size} 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0,
          pointerEvents: 'none'
        }}
      >
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textColor}
          fontWeight="bold"
          fontFamily="'Courier New', monospace"
          style={{ fontSize: '24px' }}
        >
          {Math.round(displayValue)}
          <tspan fill="#8b949e" dx="4" style={{ fontSize: '14px', fontWeight: 'normal' }}>{unit}</tspan>
        </text>
      </svg>
    </div>
  );
}
