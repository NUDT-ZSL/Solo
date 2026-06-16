import React, { useEffect, useState } from 'react';

interface StatsBarProps {
  totalVotes: number;
  activeTopics: number;
  avgDivergence: number;
}

function formatTime(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

const StatsBar: React.FC<StatsBarProps> = ({ totalVotes, activeTopics, avgDivergence }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: '#1f2937',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        boxSizing: 'border-box',
        zIndex: 100,
        borderTop: '1px solid #374151',
      }}
    >
      <div style={{ display: 'flex', gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, color: '#9ca3af', letterSpacing: 0.5 }}>总投票数</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{totalVotes}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, color: '#9ca3af', letterSpacing: 0.5 }}>活跃话题</span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>{activeTopics}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#9ca3af', letterSpacing: 0.5 }}>平均分歧指数</span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: avgDivergence > 60 ? '#f87171' : avgDivergence > 30 ? '#fbbf24' : '#4ade80',
          }}
        >
          {avgDivergence}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <span style={{ fontSize: 11, color: '#9ca3af', letterSpacing: 0.5 }}>更新时间</span>
        <span style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(now)}
        </span>
      </div>
    </div>
  );
};

export default StatsBar;
