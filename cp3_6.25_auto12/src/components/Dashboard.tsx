import React, { useState } from 'react';
import type { StatsResponse } from '../types';
import BarChart from './BarChart';
import LineChart from './LineChart';
import PieChart from './PieChart';
import './Dashboard.css';

interface DashboardProps {
  stats: StatsResponse | null;
  onDataUpdate: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, onDataUpdate }) => {
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);

  React.useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 600);
      setIsTablet(window.innerWidth < 1024);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  if (!stats) {
    return (
      <div className="dashboard-page">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h2>流量看板</h2>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-label">总作品数</div>
          <div className="card-value">{stats.totalWorks}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">总点击次数</div>
          <div className="card-value">{stats.totalClicks}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">平均停留时长</div>
          <div className="card-value">{stats.avgDuration}秒</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card fade-in">
          <h3 className="chart-title">热度排名</h3>
          <BarChart data={stats.barData} onDataUpdate={onDataUpdate} />
        </div>
        <div className="chart-card fade-in">
          <h3 className="chart-title">24小时浏览趋势</h3>
          <LineChart data={stats.lineData} />
        </div>
        <div className="chart-card fade-in">
          <h3 className="chart-title">主题分布</h3>
          <PieChart data={stats.pieData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
