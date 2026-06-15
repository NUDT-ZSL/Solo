import React from 'react';
import { StatsData } from './TerrainEngine';

interface StatsPanelProps {
  stats: StatsData;
}

const formatRate = (rate: number): string => {
  const sign = rate > 0 ? '+' : '';
  return `${sign}${rate.toFixed(1)}`;
};

const formatEnergy = (energy: number): string => {
  if (energy >= 10000) return `${(energy / 1000).toFixed(1)}k`;
  return energy.toFixed(0);
};

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  const items = [
    {
      name: '岩浆',
      color: '#ff4444',
      count: stats.lava.count,
      energy: stats.lava.energy,
      rate: stats.lava.evolutionRate
    },
    {
      name: '水流',
      color: '#4488ff',
      count: stats.water.count,
      energy: stats.water.energy,
      rate: stats.water.evolutionRate
    },
    {
      name: '植被',
      color: '#44ff66',
      count: stats.plant.count,
      energy: stats.plant.energy,
      rate: stats.plant.evolutionRate
    }
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: 200,
        background: 'rgba(26, 26, 46, 0.85)',
        backdropFilter: 'blur(8px)',
        borderRadius: 10,
        border: '1px solid #3a3a5a',
        padding: 14,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        zIndex: 10
      }}
    >
      <div
        style={{
          color: '#8a8ac0',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid #2a2a4a',
          fontWeight: 600
        }}
      >
        地形演化统计
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => (
          <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: item.color,
                  boxShadow: `0 0 6px ${item.color}66`
                }}
              />
              <span
                style={{
                  color: '#d0d0e0',
                  fontSize: 14,
                  fontWeight: 500,
                  flex: 1
                }}
              >
                {item.name}
              </span>
              <span
                style={{
                  color: item.rate >= 0 ? '#44ffaa' : '#ff6666',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  fontWeight: 600
                }}
              >
                {formatRate(item.rate)}/s
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingLeft: 16,
                gap: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#6a6a8a', fontSize: 11 }}>格子</span>
                <span
                  style={{
                    color: '#d0d0e0',
                    fontSize: 14,
                    fontFamily: 'monospace',
                    fontWeight: 600
                  }}
                >
                  {item.count}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#6a6a8a', fontSize: 11 }}>能量</span>
                <span
                  style={{
                    color: '#d0d0e0',
                    fontSize: 14,
                    fontFamily: 'monospace',
                    fontWeight: 600
                  }}
                >
                  {formatEnergy(item.energy)}
                </span>
              </div>
            </div>

            <div
              style={{
                marginLeft: 16,
                height: 3,
                background: '#1a1a2e',
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (item.count / 1000) * 100)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${item.color}, ${item.color}88)`,
                  borderRadius: 2,
                  transition: 'width 0.5s ease'
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid #2a2a4a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span style={{ color: '#6a6a8a', fontSize: 10 }}>快捷键</span>
        <span style={{ color: '#8a8aa0', fontSize: 10, fontFamily: 'monospace' }}>
          S保存 L加载 R重置
        </span>
      </div>
    </div>
  );
};
