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

interface StatItemProps {
  icon: string;
  iconAriaLabel: string;
  label: string;
  value: React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

const StatItem: React.FC<StatItemProps> = ({ icon, iconAriaLabel, label, value, align = 'left' }) => {
  const justifyContent = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  const alignItems = align === 'center' ? 'center' : 'flex-start';
  return (
    <div
      role="group"
      aria-label={`${label}：${typeof value === 'number' ? value : ''}`}
      title={`${label}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, justifyContent }}>
        <span aria-hidden="true" title={iconAriaLabel} style={{ fontSize: 13 }}>
          {icon}
        </span>
        <span style={{ fontSize: 11, color: '#9ca3af', letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div aria-label={`${label}值`}>{value}</div>
    </div>
  );
};

const StatsBar: React.FC<StatsBarProps> = ({ totalVotes, activeTopics, avgDivergence }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-label="全局统计数据栏"
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
        <StatItem
          icon="📊"
          iconAriaLabel="总投票数图标"
          label="总投票数"
          value={<span style={{ fontSize: 18, fontWeight: 700 }}>{totalVotes}</span>}
        />
        <StatItem
          icon="💬"
          iconAriaLabel="活跃话题数图标"
          label="活跃话题"
          value={<span style={{ fontSize: 18, fontWeight: 700 }}>{activeTopics}</span>}
        />
      </div>
      <StatItem
        icon="📈"
        iconAriaLabel="平均分歧指数图标"
        label="平均分歧指数"
        align="center"
        value={
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: avgDivergence > 60 ? '#f87171' : avgDivergence > 30 ? '#fbbf24' : '#4ade80',
            }}
          >
            {avgDivergence}
          </span>
        }
      />
      <StatItem
        icon="🕐"
        iconAriaLabel="更新时间图标"
        label="更新时间"
        align="right"
        value={
          <span style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(now)}
          </span>
        }
      />
    </div>
  );
};

export default StatsBar;
