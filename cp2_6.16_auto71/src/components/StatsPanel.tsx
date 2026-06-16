import React from 'react';

interface StatsPanelProps {
  redCount: number;
  blueCount: number;
  nutrientCount: number;
  elapsedSeconds: number;
  winner: 'red' | 'blue' | null;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  redCount,
  blueCount,
  nutrientCount,
  elapsedSeconds,
  winner,
}) => {
  const redGold = winner === 'red';
  const blueGold = winner === 'blue';

  return (
    <div
      style={{
        width: 500,
        height: 60,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 8,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <StatItem
        label="红色噬硫菌"
        value={redCount}
        color={redGold ? '#ffd700' : '#e63946'}
        blink={redGold}
        icon="🔴"
      />
      <Divider />
      <StatItem
        label="蓝色噬磷菌"
        value={blueCount}
        color={blueGold ? '#ffd700' : '#457b9d'}
        blink={blueGold}
        icon="🔵"
      />
      <Divider />
      <StatItem
        label="养分粒子"
        value={nutrientCount}
        color="#f4a261"
        blink={false}
        icon="✨"
      />
      <Divider />
      <StatItem
        label="已过回合"
        value={Math.floor(elapsedSeconds)}
        color="#6c757d"
        blink={false}
        icon="⏱️"
        unit="秒"
      />
    </div>
  );
};

const Divider: React.FC = () => (
  <div
    style={{
      width: 1,
      height: 32,
      backgroundColor: '#e9ecef',
    }}
  />
);

interface StatItemProps {
  label: string;
  value: number;
  color: string;
  blink: boolean;
  icon: string;
  unit?: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, color, blink, icon, unit }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <span style={{ fontSize: 12, color: '#6c757d' }}>
        {icon} {label}
      </span>
      <span
        style={{
          fontSize: 20,
          fontWeight: 'bold',
          color,
          animation: blink ? 'blink 1s infinite' : 'none',
        }}
      >
        {value}
        {unit && <span style={{ fontSize: 12, fontWeight: 'normal' }}>{unit}</span>}
      </span>
    </div>
  );
};
