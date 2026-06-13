import React from 'react';

interface FuelBarProps {
  fuel: number;
  maxFuel: number;
}

export default function FuelBar({ fuel, maxFuel }: FuelBarProps) {
  const ratio = Math.max(fuel / maxFuel, 0);

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 180,
          height: 14,
          background: '#1e293b',
          borderRadius: 4,
          overflow: 'hidden',
          padding: 2,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${ratio * 100}%`,
            background: 'linear-gradient(to right, #22c55e, #eab308)',
            borderRadius: 3,
            transition: 'width 0.1s linear',
          }}
        />
      </div>
      <span
        style={{
          color: '#e2e8f0',
          fontSize: 11,
          fontFamily: 'sans-serif',
        }}
      >
        燃料: {Math.ceil(fuel)}
      </span>
    </div>
  );
}
