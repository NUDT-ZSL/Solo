import { useMemo } from 'react';
import type { ScoreResult } from '../types';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  score: ScoreResult;
}

export function ScoreDisplay({ score }: ScoreDisplayProps) {
  const color = useMemo(() => {
    const startColor = { r: 229, g: 57, b: 53 };
    const endColor = { r: 67, g: 160, b: 71 };
    const t = score.total / 100;
    const r = Math.round(startColor.r + (endColor.r - startColor.r) * t);
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * t);
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }, [score.total]);

  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score.total / 100) * circumference;

  return (
    <div className="score-display">
      <div className="score-circle">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle
            className="score-bg"
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth="6"
          />
          <circle
            className="score-progress"
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dashoffset 0.3s ease-out, stroke 0.3s ease-out' }}
          />
        </svg>
        <div className="score-text" style={{ color }}>
          <span className="score-value">{score.total}</span>
          <span className="score-label">分</span>
        </div>
      </div>
      <div className="score-details">
        <div className="score-detail-item">
          <span className="detail-label">色彩对比度</span>
          <span className="detail-value">{score.contrast}/20</span>
        </div>
        <div className="score-detail-item">
          <span className="detail-label">字体搭配</span>
          <span className="detail-value">{score.fontCount}/15</span>
        </div>
        <div className="score-detail-item">
          <span className="detail-label">布局密度</span>
          <span className="detail-value">{score.density}/30</span>
        </div>
      </div>
    </div>
  );
}
