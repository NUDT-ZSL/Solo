import React from 'react';
import type { ShapeType, MoodType } from '../types';
import { MOOD_COLORS } from '../types';

interface MoodShapeProps {
  shape: ShapeType;
  mood: MoodType;
  size?: number;
}

export const MoodShape: React.FC<MoodShapeProps> = ({ shape, mood, size = 48 }) => {
  const color = MOOD_COLORS[mood];
  const gradientId = `grad-${mood}-${shape}-${Math.random().toString(36).slice(2, 8)}`;

  const center = size / 2;

  const renderShape = () => {
    switch (shape) {
      case 'circle':
        return (
          <>
            <defs>
              <radialGradient id={gradientId} cx="40%" cy="35%" r="65%">
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="55%" stopColor={color} stopOpacity="0.85" />
                <stop offset="100%" stopColor={color} stopOpacity="0.45" />
              </radialGradient>
            </defs>
            <circle cx={center} cy={center} r={center * 0.82} fill={`url(#${gradientId})`} />
            <circle
              cx={center * 0.72}
              cy={center * 0.65}
              r={center * 0.15}
              fill="rgba(255,255,255,0.45)"
            />
          </>
        );

      case 'star': {
        const points = [];
        const outerR = center * 0.88;
        const innerR = center * 0.38;
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          const x = center + Math.cos(angle) * r;
          const y = center + Math.sin(angle) * r;
          points.push(`${x},${y}`);
        }
        return (
          <>
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="50%" stopColor={color} stopOpacity="0.9" />
                <stop offset="100%" stopColor={color} stopOpacity="0.55" />
              </linearGradient>
            </defs>
            <polygon points={points.join(' ')} fill={`url(#${gradientId})`} />
            <circle
              cx={center * 0.8}
              cy={center * 0.72}
              r={center * 0.1}
              fill="rgba(255,255,255,0.5)"
            />
          </>
        );
      }

      case 'diamond': {
        const top = center * 0.08;
        const bottom = size - center * 0.08;
        const left = center * 0.18;
        const right = size - center * 0.18;
        const diamondPoints = `${center},${top} ${right},${center} ${center},${bottom} ${left},${center}`;
        return (
          <>
            <defs>
              <linearGradient id={gradientId} x1="20%" y1="20%" x2="80%" y2="80%">
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="55%" stopColor={color} stopOpacity="0.8" />
                <stop offset="100%" stopColor={color} stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <polygon points={diamondPoints} fill={`url(#${gradientId})`} />
            <polygon
              points={`${center},${top + 4} ${center * 1.28},${center * 0.85} ${center},${center * 0.95} ${center * 0.78},${center * 0.82}`}
              fill="rgba(255,255,255,0.32)"
            />
          </>
        );
      }
    }
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {renderShape()}
    </svg>
  );
};

export default MoodShape;
