import React, { useEffect, useState, useRef } from 'react';
import type { DashboardStats } from '../types';

interface DashboardProps {
  stats: DashboardStats;
}

const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({ value, duration = 500 }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration]);

  return <span>{Number.isInteger(value) ? Math.round(displayValue) : displayValue.toFixed(1)}</span>;
};

const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  return (
    <div className="dashboard">
      <div className="dashboard-card">
        <div className="dashboard-label">本周总服务时长</div>
        <div className="dashboard-value">
          <AnimatedNumber value={stats.weeklyHours} />
          <span style={{ fontSize: 16, fontWeight: 500 }}> 小时</span>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-label">活跃志愿者数</div>
        <div className="dashboard-value">
          <AnimatedNumber value={stats.activeVolunteers} />
          <span style={{ fontSize: 16, fontWeight: 500 }}> 人</span>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-label">最受欢迎活动 TOP3</div>
        <div className="dashboard-top-list">
          {stats.topActivities.length > 0 ? (
            stats.topActivities.map((item, index) => (
              <div key={item.name} className="dashboard-top-item">
                <span>
                  {index + 1}. {item.name}
                </span>
                <span style={{ fontWeight: 600, color: '#2E86C1' }}>{item.count}次</span>
              </div>
            ))
          ) : (
            <div className="empty-state" style={{ padding: 12 }}>暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
