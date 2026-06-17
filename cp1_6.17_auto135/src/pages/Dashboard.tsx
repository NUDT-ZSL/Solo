import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardStats } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('加载仪表盘数据失败:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  if (!stats) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">仪表盘</h1>
          <p className="page-subtitle">查看会议和待办事项统计数据</p>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon icon-blue">
            <span>📋</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalMeetings}</span>
            <span className="stat-label">总会议数</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-green">
          <span>✅</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">{Math.round(stats.completedTodosRatio * 100)}%</span>
            <span className="stat-label">已关闭待办占比</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon icon-orange">
            <span>📝</span>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.avgTodosPerMeeting.toFixed(1)}</span>
            <span className="stat-label">平均每会议待办数</span>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h2>近7天新增待办趋势</h2>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.last7DaysTodos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8F4FD" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fill: '#2C3E50', fontSize: 12 }}
                axisLine={{ stroke: '#E8F4FD' }}
              />
              <YAxis 
                tick={{ fill: '#2C3E50', fontSize: 12 }}
                axisLine={{ stroke: '#E8F4FD' }}
              />
              <Tooltip 
                labelFormatter={(label) => formatDate(label as string)}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E8F4FD',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3498DB"
                strokeWidth={3}
                dot={{ fill: '#2980B9', strokeWidth: 2, r: 6 }}
                activeDot={{ fill: '#3498DB', strokeWidth: 2, r: 8 }}
                name="新增待办"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="info-card">
          <h3>💡 使用提示</h3>
          <ul>
            <li>点击左侧导航可以快速访问最近的会议</li>
            <li>会议卡片底部进度条显示待办完成比例</li>
            <li>支持拖拽调整待办事项顺序</li>
            <li>笔记支持富文本编辑和附件上传</li>
          </ul>
        </div>
        <div className="info-card">
          <h3>🎯 今日目标</h3>
          <ul>
            <li>按时参加所有已安排的会议</li>
            <li>完成所有紧急待办事项</li>
            <li>及时记录会议笔记</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
