import React from 'react';

interface LevelInfoProps {
  levelNumber: number;
  elapsedTime: number;
}

export default function LevelInfo({ levelNumber, elapsedTime }: LevelInfoProps) {
  const mins = Math.floor(elapsedTime / 60);
  const secs = Math.floor(elapsedTime % 60);

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          color: '#e2e8f0',
          fontSize: 14,
          fontFamily: 'sans-serif',
        }}
      >
        关卡 {levelNumber}
      </span>
      <span
        style={{
          color: '#94a3b8',
          fontSize: 14,
          fontFamily: 'sans-serif',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
