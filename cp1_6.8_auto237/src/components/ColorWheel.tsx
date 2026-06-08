import React, { useRef, useCallback, useEffect, useState } from 'react';

interface ColorWheelProps {
  hue: number;
  onHueChange: (hue: number) => void;
  primaryColor: string;
}

const SIZE = 280;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;

const MOODS = ['宁静', '活力', '复古', '科技'] as const;

const ColorWheel: React.FC<ColorWheelProps> = ({ hue, onHueChange, primaryColor }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const getHueFromEvent = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return hue;
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return Math.round(angle) % 360;
  }, [hue]);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDragging(true);
    const newHue = getHueFromEvent(e);
    onHueChange(newHue);
  }, [getHueFromEvent, onHueChange]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const newHue = getHueFromEvent(e);
      onHueChange(newHue);
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, getHueFromEvent, onHueChange]);

  const handleAngle = (hue - 90) * (Math.PI / 180);
  const handleX = CENTER + RADIUS * Math.cos(handleAngle);
  const handleY = CENTER + RADIUS * Math.sin(handleAngle);

  const conicStops = Array.from({ length: 36 }, (_, i) => {
    const h = i * 10;
    return (
      <stop
        key={i}
        offset={`${(i / 36) * 100}%`}
        stopColor={`hsl(${h}, 75%, 58%)`}
      />
    );
  });

  return (
    <div style={styles.container}>
      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={styles.wheel}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      >
        <defs>
          <linearGradient id="hueGrad" gradientTransform="rotate(90)">
            {conicStops}
          </linearGradient>
        </defs>
        {Array.from({ length: 360 }, (_, i) => {
          const startAngle = i - 90;
          const endAngle = i + 1 - 90;
          const x1 = CENTER + RADIUS * Math.cos((startAngle * Math.PI) / 180);
          const y1 = CENTER + RADIUS * Math.sin((startAngle * Math.PI) / 180);
          const x2 = CENTER + RADIUS * Math.cos((endAngle * Math.PI) / 180);
          const y2 = CENTER + RADIUS * Math.sin((endAngle * Math.PI) / 180);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={`hsl(${i}, 75%, 58%)`}
              strokeWidth={STROKE}
              strokeLinecap="butt"
            />
          );
        })}
        <circle
          cx={handleX}
          cy={handleY}
          r={14}
          fill={primaryColor}
          stroke="#fff"
          strokeWidth={3}
          style={styles.handle}
          filter="url(#glow)"
        />
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div style={styles.hueLabel}>{hue}°</div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  wheel: {
    cursor: 'crosshair',
    touchAction: 'none',
    filter: 'drop-shadow(0 0 12px rgba(180, 180, 200, 0.3))',
  },
  handle: {
    cursor: 'grab',
    transition: 'r 0.15s ease',
  },
  hueLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: 500,
    fontFamily: "'Noto Sans SC', sans-serif",
  },
};

export default ColorWheel;
