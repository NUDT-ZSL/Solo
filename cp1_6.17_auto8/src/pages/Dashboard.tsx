import React, { useState, useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { matchFlavorProfile } from '../logic/flavorMatcher';
import type { Flavor, CoffeeLog } from '../types';
import '../styles/dashboard.css';

type Period = '30' | '90' | 'all';

const CATEGORY_COLORS: Record<string, string> = {
  花香: '#E91E63',
  果香: '#FF9800',
  坚果: '#795548',
  巧克力: '#5D4037',
  香料: '#9C27B0',
};

const Dashboard: React.FC = () => {
  const { user, logs } = useApp();
  const [period, setPeriod] = useState<Period>('all');
  const [animKey, setAnimKey] = useState(0);

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const days = period === '30' ? 30 : period === '90' ? 90 : Infinity;
    return logs.filter((log: CoffeeLog) => {
      const logTime = new Date(log.createdAt).getTime();
      return now - logTime <= days * 86400000;
    });
  }, [logs, period]);

  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {
      花香: 0,
      果香: 0,
      坚果: 0,
      巧克力: 0,
      香料: 0,
    };

    filteredLogs.forEach((log: CoffeeLog) => {
      const categories = new Set<string>();
      log.flavors.forEach((f: Flavor) => categories.add(f.category));
      categories.forEach((c) => {
        if (counts[c] !== undefined) counts[c]++;
      });
    });

    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts).map(([category, count]) => ({
      category,
      value: Math.round((count / max) * 100),
      rawValue: count,
      fullMark: 100,
    }));
  }, [filteredLogs]);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    setAnimKey((k) => k + 1);
  };

  const totalLogs = logs.length;
  const uniqueOrigins = new Set(logs.map((l: CoffeeLog) => l.origin)).size;
  const uniqueFlavors = new Set(
    logs.flatMap((l: CoffeeLog) => l.flavors.map((f) => f.name))
  ).size;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">个人中心</h1>
        <p className="page-subtitle">查看你的咖啡品鉴偏好与风味统计</p>
      </div>

      {user && (
        <div className="dashboard-header">
          <img src={user.avatar} alt={user.username} className="dashboard-avatar" />
          <div className="dashboard-user-info">
            <h2>{user.username}</h2>
            <p>品鉴师 · 已记录 {totalLogs} 支豆子</p>
          </div>
        </div>
      )}

      <div className="dashboard-stats">
        <div className="dashboard-stat-card">
          <div className="stat-card-value">{totalLogs}</div>
          <div className="stat-card-label">品鉴记录</div>
        </div>
        <div className="dashboard-stat-card">
          <div className="stat-card-value">{uniqueOrigins}</div>
          <div className="stat-card-label">探索产地</div>
        </div>
        <div className="dashboard-stat-card">
          <div className="stat-card-value">{uniqueFlavors}</div>
          <div className="stat-card-label">风味体验</div>
        </div>
        <div className="dashboard-stat-card">
          <div className="stat-card-value">
            {categoryStats.reduce((a, b) => a + b.rawValue, 0)}
          </div>
          <div className="stat-card-label">风味标签</div>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-header">
          <div className="chart-title">
            <span>📊</span>
            <span>风味偏好雷达图</span>
          </div>
          <div className="period-tabs">
            <button
              className={`period-tab ${period === '30' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('30')}
            >
              近30天
            </button>
            <button
              className={`period-tab ${period === '90' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('90')}
            >
              近90天
            </button>
            <button
              className={`period-tab ${period === 'all' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('all')}
            >
              全部
            </button>
          </div>
        </div>

        <div className="chart-container">
          <div style={{ width: '100%', maxWidth: 500, height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart key={animKey} data={categoryStats} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#D4C5B0" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: '#3E2723', fontSize: 13, fontFamily: 'Noto Sans SC' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#8B6F5E', fontSize: 11 }}
                />
                <Radar
                  name="风味偏好"
                  dataKey="value"
                  stroke="#8B6F5E"
                  fill="#D4A373"
                  fillOpacity={0.6}
                  animationDuration={500}
                  animationEasing="ease-out"
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-legend">
          {categoryStats.map((s) => (
            <div key={s.category} className="legend-item">
              <span
                className="legend-dot"
                style={{ backgroundColor: CATEGORY_COLORS[s.category] || '#8B6F5E' }}
              />
              <span>
                {s.category}: {s.rawValue}次
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
