import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EcoMetrics } from '@/ecosystem/types';

interface EcoDashboardProps {
  metrics: EcoMetrics;
}

interface RingConfig {
  key: keyof Pick<EcoMetrics, 'biodiversity' | 'populationDensity' | 'waterHealth'>;
  label: string;
  radius: number;
  description: string;
}

const rings: RingConfig[] = [
  { key: 'biodiversity', label: '物种多样性', radius: 80, description: '基于物种种类数量与理想值的比值' },
  { key: 'populationDensity', label: '种群密度', radius: 60, description: '当前个体总数占最大承载量的比例' },
  { key: 'waterHealth', label: '水体健康度', radius: 40, description: '综合平均健康度与营养盐平衡指数' },
];

const STROKE_WIDTH = 8;
const ANIMATION_DURATION = 500;
const SVG_SIZE = 200;
const CENTER = SVG_SIZE / 2;

function interpolateColor(value: number): string {
  const r = Math.round(0 + (255 - 0) * (1 - value));
  const g = Math.round(255 * value + 107 * (1 - value));
  const b = Math.round(136 * value + 107 * (1 - value));
  return `rgb(${r},${g},${b})`;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const EcoDashboard: React.FC<EcoDashboardProps> = ({ metrics }) => {
  const [animatedValues, setAnimatedValues] = useState({
    biodiversity: metrics.biodiversity,
    populationDensity: metrics.populationDensity,
    waterHealth: metrics.waterHealth,
  });
  const [hoveredRing, setHoveredRing] = useState<string | null>(null);
  const animRef = useRef<{
    startValues: Record<string, number>;
    startTime: number | null;
    targetValues: Record<string, number>;
  }>({
    startValues: { ...animatedValues },
    startTime: null,
    targetValues: { ...animatedValues },
  });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    animRef.current = {
      startValues: { ...animatedValues },
      startTime: null,
      targetValues: {
        biodiversity: metrics.biodiversity,
        populationDensity: metrics.populationDensity,
        waterHealth: metrics.waterHealth,
      },
    };

    const animate = (timestamp: number) => {
      const ref = animRef.current;
      if (ref.startTime === null) {
        ref.startTime = timestamp;
      }
      const elapsed = timestamp - ref.startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      const easedProgress = easeOutCubic(progress);

      const newValues: Record<string, number> = {};
      for (const ring of rings) {
        const start = ref.startValues[ring.key] ?? 0;
        const target = ref.targetValues[ring.key] ?? 0;
        newValues[ring.key] = start + (target - start) * easedProgress;
      }

      setAnimatedValues(newValues as typeof animatedValues);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [metrics.biodiversity, metrics.populationDensity, metrics.waterHealth]);

  const handleRingHover = useCallback((key: string | null) => {
    setHoveredRing(key);
  }, []);

  const circumference = (radius: number) => 2 * Math.PI * radius;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
        {rings.map((ring) => {
          const value = animatedValues[ring.key];
          const color = interpolateColor(value);
          const r = ring.radius;
          const circ = circumference(r);
          const offset = circ * (1 - value);
          const isHovered = hoveredRing === ring.key;

          return (
            <g
              key={ring.key}
              onMouseEnter={() => handleRingHover(ring.key)}
              onMouseLeave={() => handleRingHover(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={CENTER}
                cy={CENTER}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={STROKE_WIDTH}
              />
              <circle
                cx={CENTER}
                cy={CENTER}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
                style={{
                  transition: 'stroke 0.3s ease',
                  filter: isHovered ? `drop-shadow(0 0 6px ${color})` : 'none',
                }}
              />
            </g>
          );
        })}
        <text
          x={CENTER}
          y={CENTER - 6}
          textAnchor="middle"
          fill="#00FF88"
          fontSize="14"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {(metrics.coralCoverage * 100).toFixed(1)}%
        </text>
        <text
          x={CENTER}
          y={CENTER + 12}
          textAnchor="middle"
          fill="rgba(255,255,255,0.6)"
          fontSize="9"
          fontFamily="sans-serif"
        >
          珊瑚覆盖率
        </text>
      </svg>

      {hoveredRing && (() => {
        const ring = rings.find((r) => r.key === hoveredRing);
        if (!ring) return null;
        const value = animatedValues[ring.key];
        return (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: SVG_SIZE + 8,
              transform: 'translateY(-50%)',
              background: 'rgba(11, 61, 58, 0.9)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#FFFFFF',
              fontSize: '12px',
              lineHeight: '1.6',
              opacity: hoveredRing ? 1 : 0,
              transition: 'opacity 0.3s',
              pointerEvents: 'none',
              minWidth: '140px',
            }}
          >
            <div style={{ fontWeight: 600, color: '#00FF88', marginBottom: '4px' }}>
              {ring.label}
            </div>
            <div>当前数值: {(value * 100).toFixed(1)}%</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginTop: '4px' }}>
              {ring.description}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default EcoDashboard;
