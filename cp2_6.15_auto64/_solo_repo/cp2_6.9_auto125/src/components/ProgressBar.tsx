import React from 'react';

interface ProgressBarProps {
  progress: number;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, height = 12 }) => {
  const clamped = Math.max(0, Math.min(100, progress));

  const getColor = (p: number): string => {
    if (p <= 30) return '#E74C3C';
    if (p <= 70) return '#F39C12';
    return '#27AE60';
  };

  const color = getColor(clamped);

  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        background: '#E8ECF1',
        borderRadius: '6px',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}CC, ${color})`,
          borderRadius: '6px',
          transition: 'width 0.5s ease, background 0.3s ease'
        }}
      />
    </div>
  );
};
