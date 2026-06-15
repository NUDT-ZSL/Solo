import React, { useCallback, useRef, useState } from 'react';
import type { ProcessedEntry } from './utils/dataProcessor';
import { sentimentToColor } from './utils/dataProcessor';

interface InkDropProps {
  entry: ProcessedEntry;
  x: number;
  y: number;
  onHover?: (entry: ProcessedEntry | null) => void;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const InkDrop: React.FC<InkDropProps> = ({ entry, x, y, onHover }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);

  const color = sentimentToColor(entry.sentiment);
  const size = entry.inkSize;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const id = rippleIdRef.current++;
      setRipples((prev) => [...prev, { id, x: 0, y: 0 }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 1200);
    },
    [],
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHover?.(entry);
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { id, x: 0, y: 0 }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 1200);
  }, [entry, onHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHover?.(null);
  }, [onHover]);

  const blurSize = size * 0.3;
  const spreadSize = size * 0.15;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <defs>
        <filter id={`ink-blur-${entry.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={blurSize / 8} />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.6" />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="over" />
        </filter>
        <radialGradient id={`ink-grad-${entry.id}`} cx="40%" cy="40%">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="60%" stopColor={color} stopOpacity="0.7" />
          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
        </radialGradient>
      </defs>

      <circle
        r={size / 2 + spreadSize}
        fill={color}
        opacity={0.08}
        filter={`url(#ink-blur-${entry.id})`}
      />

      <circle
        r={size / 2}
        fill={`url(#ink-grad-${entry.id})`}
        opacity={isHovered ? 1 : 0.85}
        style={{
          transition: 'opacity 0.3s ease, r 0.3s ease',
        }}
      />

      <circle
        r={size / 2 * 0.3}
        fill={color}
        opacity={0.9}
        cx={-size * 0.08}
        cy={-size * 0.08}
      />

      {ripples.map((ripple) => (
        <circle
          key={ripple.id}
          r={size / 2}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          opacity={0}
          style={{
            animation: `ink-ripple 1.2s ease-out forwards`,
          }}
        />
      ))}

      {isHovered && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={-80}
            y={-size / 2 - 56}
            width={160}
            height={48}
            rx={6}
            fill="rgba(45, 35, 25, 0.88)"
            stroke={color}
            strokeWidth={0.5}
            opacity={0.95}
            style={{
              animation: 'tooltip-in 0.25s ease-out',
            }}
          />
          <text
            x={0}
            y={-size / 2 - 38}
            textAnchor="middle"
            fill="#f5efe0"
            fontSize={12}
            fontFamily="'KaiTi', 'STKaiti', '楷体', serif"
            opacity={0.95}
          >
            {entry.dateStr}
          </text>
          <text
            x={0}
            y={-size / 2 - 20}
            textAnchor="middle"
            fill="#d4c8b0"
            fontSize={10}
            fontFamily="'KaiTi', 'STKaiti', '楷体', serif"
          >
            {entry.summary}
          </text>
        </g>
      )}
    </g>
  );
};

export default React.memo(InkDrop);
