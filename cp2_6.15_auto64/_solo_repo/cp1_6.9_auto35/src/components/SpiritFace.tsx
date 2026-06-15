import React from 'react';
import type { ExpressionFeatures } from '../types';

interface SpiritFaceProps {
  expression: ExpressionFeatures;
  size: 'sm' | 'md' | 'lg';
}

const getEyeStyle = (shape: ExpressionFeatures['eyeShape'], size: 'sm' | 'md' | 'lg') => {
  const scale = size === 'sm' ? 0.7 : size === 'md' ? 1 : 1.6;

  switch (shape) {
    case 'angry':
      return (
        <>
          <svg width={16 * scale} height={12 * scale} viewBox="0 0 16 12">
            <path
              d="M2 2 L14 8 M14 2 L2 8"
              stroke="#1a1a2e"
              strokeWidth={2.5 * scale}
              strokeLinecap="round"
            />
          </svg>
        </>
      );
    case 'sleepy':
      return (
        <>
          <svg width={16 * scale} height={6 * scale} viewBox="0 0 16 6">
            <path
              d="M1 3 Q8 6 15 3"
              fill="none"
              stroke="#1a1a2e"
              strokeWidth={2.2 * scale}
              strokeLinecap="round"
            />
          </svg>
        </>
      );
    case 'surprised':
      return (
        <>
          <svg width={14 * scale} height={14 * scale} viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="5" fill="#1a1a2e" />
            <circle cx="5" cy="5" r="1.5" fill="white" />
          </svg>
        </>
      );
    case 'squint':
      return (
        <>
          <svg width={16 * scale} height={6 * scale} viewBox="0 0 16 6">
            <path
              d="M1 4 Q8 0 15 4"
              fill="none"
              stroke="#1a1a2e"
              strokeWidth={2.2 * scale}
              strokeLinecap="round"
            />
          </svg>
        </>
      );
    case 'crying':
      return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <svg width={14 * scale} height={16 * scale} viewBox="0 0 14 16">
            <circle cx="7" cy="5" r="4.5" fill="#1a1a2e" />
            <circle cx="5.5" cy="3.5" r="1.5" fill="white" />
            <ellipse
              cx="7"
              cy="14"
              rx={2 * scale}
              ry={2.5 * scale}
              fill="#4488FF"
              opacity="0.85"
            />
          </svg>
        </div>
      );
    case 'normal':
    default:
      return (
        <>
          <svg width={14 * scale} height={14 * scale} viewBox="0 0 14 14">
            <circle cx="7" cy="7" r="5" fill="#1a1a2e" />
            <circle cx="5" cy="5" r="1.5" fill="white" />
          </svg>
        </>
      );
  }
};

const getMouthStyle = (shape: ExpressionFeatures['mouthShape'], size: 'sm' | 'md' | 'lg') => {
  const scale = size === 'sm' ? 0.7 : size === 'md' ? 1 : 1.6;

  switch (shape) {
    case 'smile':
      return (
        <svg width={36 * scale} height={18 * scale} viewBox="0 0 36 18">
          <path
            d="M3 3 Q18 22 33 3"
            fill="none"
            stroke="#1a1a2e"
            strokeWidth={2.8 * scale}
            strokeLinecap="round"
          />
        </svg>
      );
    case 'frown':
      return (
        <svg width={36 * scale} height={18 * scale} viewBox="0 0 36 18">
          <path
            d="M3 15 Q18 -4 33 15"
            fill="none"
            stroke="#1a1a2e"
            strokeWidth={2.8 * scale}
            strokeLinecap="round"
          />
        </svg>
      );
    case 'open':
      return (
        <svg width={24 * scale} height={20 * scale} viewBox="0 0 24 20">
          <ellipse cx="12" cy="10" rx="10" ry="8" fill="#1a1a2e" />
          <ellipse cx="12" cy="12" rx="6" ry="4" fill="#FF6B6B" opacity="0.6" />
        </svg>
      );
    case 'neutral':
      return (
        <svg width={28 * scale} height={6 * scale} viewBox="0 0 28 6">
          <line
            x1="2"
            y1="3"
            x2="26"
            y2="3"
            stroke="#1a1a2e"
            strokeWidth={2.5 * scale}
            strokeLinecap="round"
          />
        </svg>
      );
    case 'pout':
      return (
        <svg width={24 * scale} height={16 * scale} viewBox="0 0 24 16">
          <ellipse cx="12" cy="10" rx="8" ry="5" fill="#1a1a2e" />
          <ellipse cx="12" cy="9" rx="4" ry="2" fill="rgba(255,255,255,0.15)" />
        </svg>
      );
    case 'tongue':
      return (
        <svg width={36 * scale} height={28 * scale} viewBox="0 0 36 28">
          <path
            d="M3 3 Q18 22 33 3"
            fill="none"
            stroke="#1a1a2e"
            strokeWidth={2.8 * scale}
            strokeLinecap="round"
          />
          <ellipse cx="18" cy="20" rx={6 * scale} ry={7 * scale} fill="#FF6B9D" />
          <path
            d={`M${18 - 0.1 * scale} 20 L${18 - 0.1 * scale} ${20 + 6 * scale}`}
            stroke="#D14D7B"
            strokeWidth={1.2 * scale}
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
};

const SpiritFace: React.FC<SpiritFaceProps> = ({ expression, size }) => {
  return (
    <>
      <div className="spirit-eyes">
        <div className="spirit-eye">{getEyeStyle(expression.eyeShape, size)}</div>
        <div className="spirit-eye">{getEyeStyle(expression.eyeShape, size)}</div>
      </div>
      <div className="spirit-mouth">{getMouthStyle(expression.mouthShape, size)}</div>
    </>
  );
};

export default SpiritFace;
