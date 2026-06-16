import React from 'react';

interface SunlightChartProps {
  sunHours: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  buildingNumber: number;
  buildingHeight: number;
}

const FACADE_COLORS: Record<string, string> = {
  north: '#ef4444',
  south: '#3b82f6',
  east: '#f59e0b',
  west: '#10b981',
};

const FACADE_LABELS: Record<string, string> = {
  north: '北',
  south: '南',
  east: '东',
  west: '西',
};

const SunlightChart: React.FC<SunlightChartProps> = ({ sunHours, buildingNumber, buildingHeight }) => {
  const facades = ['north', 'south', 'east', 'west'] as const;
  const maxHours = Math.max(...facades.map(f => sunHours[f]), 1);

  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      right: 16,
      width: 300,
      height: 200,
      background: 'rgba(30,41,59,0.9)',
      borderRadius: 10,
      border: '1px solid #334155',
      padding: 16,
      color: '#f8fafc',
      fontSize: 12,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
        建筑 #{buildingNumber} 日照统计
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
        高度 {buildingHeight} 单位 · 立面累计日照 (小时)
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 20, justifyContent: 'center' }}>
        {facades.map(f => {
          const h = sunHours[f];
          const barHeight = Math.max(2, (h / maxHours) * 100);
          return (
            <div key={f} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}>
              <div style={{ fontSize: 11, color: '#f8fafc', fontWeight: 600 }}>
                {h.toFixed(1)}h
              </div>
              <div style={{
                width: 20,
                height: barHeight,
                background: FACADE_COLORS[f],
                borderRadius: 3,
                transition: 'height 0.3s ease',
              }} />
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {FACADE_LABELS[f]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SunlightChart;
