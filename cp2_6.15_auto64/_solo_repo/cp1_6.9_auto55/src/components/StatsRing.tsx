import React, { useMemo, useState } from 'react';
import type { MoodStats, MoodType } from '../types';
import { MOOD_COLORS, MOOD_LABELS } from '../types';

interface StatsRingProps {
  stats: MoodStats;
  className?: string;
}

const MOOD_ORDER: MoodType[] = ['happy', 'calm', 'melancholy', 'anger', 'anxiety'];

export const StatsRing: React.FC<StatsRingProps> = ({ stats, className = '' }) => {
  const [hoveredMood, setHoveredMood] = useState<MoodType | null>(null);

  const segments = useMemo(() => {
    if (stats.total === 0) {
      return MOOD_ORDER.map((mood) => ({
        mood,
        startAngle: 0,
        endAngle: 0,
        count: 0,
      }));
    }

    let currentAngle = 0;
    return MOOD_ORDER.map((mood) => {
      const count = stats[mood];
      const angle = (count / stats.total) * 360;
      const segment = {
        mood,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        count,
      };
      currentAngle += angle;
      return segment;
    });
  }, [stats]);

  const size = 60;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={`stats-ring ${className}`}
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg) => {
          if (seg.count === 0) return null;
          const angleSpan = seg.endAngle - seg.startAngle;
          const dashLength = (angleSpan / 360) * circumference;
          const dashOffset = -(seg.startAngle / 360) * circumference;
          const isHovered = hoveredMood === seg.mood;

          return (
            <circle
              key={seg.mood}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={MOOD_COLORS[seg.mood]}
              strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              style={{
                transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                opacity: hoveredMood === null || isHovered ? 1 : 0.35,
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredMood(seg.mood)}
              onMouseLeave={() => setHoveredMood(null)}
            />
          );
        })}
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-primary)',
          pointerEvents: 'none',
        }}
      >
        {stats.total}
      </div>

      {hoveredMood && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(8px)',
            background: '#FFFFFF',
            color: '#1E1E2E',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 10,
            pointerEvents: 'none',
            animation: 'fade-in 0.15s ease-out',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: MOOD_COLORS[hoveredMood],
              marginRight: 6,
              verticalAlign: 'middle',
            }}
          />
          {MOOD_LABELS[hoveredMood]}：{stats[hoveredMood]}次
        </div>
      )}
    </div>
  );
};

export default StatsRing;
