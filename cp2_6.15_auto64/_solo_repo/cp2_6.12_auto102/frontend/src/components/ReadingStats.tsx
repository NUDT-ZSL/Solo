import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useAppContext, ReadingSession } from '../context/AppContext';
import './ReadingStats.css';

interface DailyData {
  date: string;
  duration: number;
  hours: number;
}

interface WeeklyData {
  week: string;
  duration: number;
  hours: number;
}

interface MonthlyData {
  month: string;
  duration: number;
  hours: number;
}

interface StatsData {
  total_reading_hours: number;
  total_sessions: number;
  week_reading_hours: number;
  categories: { category: string; count: number }[];
  borrow_stats: {
    total_borrowed: number;
    overdue_count: number;
    current_borrowed: number;
  };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-date">{label}</p>
        <p className="tooltip-hours">{payload[0].value.toFixed(2)} 小时</p>
      </div>
    );
  }
  return null;
};

const ReadingStats: React.FC = () => {
  const { user } = useAppContext();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [activeSession, setActiveSession] = useState<ReadingSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentWeekHours, setCurrentWeekHours] = useState(0);
  const [lastWeekHours, setLastWeekHours] = useState(0);
  const [growthPercent, setGrowthPercent] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAllStats();
      fetchActiveSession();
    }
  }, [user]);

  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      const start = new Date(activeSession.start_time).getTime();
      setElapsedTime(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchAllStats = async () => {
    setLoading(true);
    try {
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.all([
        axios.get(`/api/stats/daily/user/${user!.id}?days=7`),
        axios.get(`/api/stats/weekly/user/${user!.id}?weeks=4`),
        axios.get(`/api/stats/monthly/user/${user!.id}?months=6`)
      ]);

      if (dailyRes.data.success) {
        setDailyData(dailyRes.data.data.daily);
        setTotalHours(dailyRes.data.data.total_hours);
      }
      if (weeklyRes.data.success) {
        setWeeklyData(weeklyRes.data.data.weekly);
        setCurrentWeekHours(weeklyRes.data.data.current_week_hours);
        setLastWeekHours(weeklyRes.data.data.last_week_hours);
        setGrowthPercent(weeklyRes.data.data.growth_percent);
      }
      if (monthlyRes.data.success) {
        setMonthlyData(monthlyRes.data.data.monthly);
      }
    } catch (error) {
      console.error('获取阅读统计失败', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSession = async () => {
    try {
      const res = await axios.get(`/api/stats/active/user/${user!.id}`);
      if (res.data.success && res.data.data) {
        setActiveSession(res.data.data);
      }
    } catch (error) {
      console.error('获取活跃阅读会话失败', error);
    }
  };

  const handleStartReading = async (bookId: string) => {
    try {
      const res = await axios.post('/api/stats/start', {
        book_id: bookId,
        user_id: user!.id
      });
      if (res.data.success) {
        setActiveSession(res.data.data);
      }
    } catch (error: any) {
      if (error.response?.data?.data) {
        setActiveSession(error.response.data.data);
      }
      alert(error.response?.data?.message || '开始阅读失败');
    }
  };

  const handleEndReading = async () => {
    if (!activeSession) return;
    try {
      const res = await axios.post(`/api/stats/end/${activeSession.id}`);
      if (res.data.success) {
        const duration = res.data.data.duration;
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        alert(`本次阅读时长：${mins}分${secs}秒`);
        setActiveSession(null);
        setElapsedTime(0);
        fetchAllStats();
      }
    } catch (error) {
      console.error('结束阅读失败', error);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}时${m}分${s}秒`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatWeekLabel = (weekStr: string) => {
    const d = new Date(weekStr);
    return `${d.getMonth() + 1}/${d.getDate()}周`;
  };

  const getBarColor = (index: number, total: number) => {
    const ratio = total <= 1 ? 0 : index / (total - 1);
    const r = Math.round(66 + (139 - 66) * ratio);
    const g = Math.round(133 + (92 - 133) * ratio);
    const b = Math.round(244 + (246 - 244) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getChartData = () => {
    switch (activeTab) {
      case 'daily': return dailyData;
      case 'weekly': return weeklyData;
      case 'monthly': return monthlyData;
    }
  };

  const getXAxisKey = () => {
    switch (activeTab) {
      case 'daily': return 'date';
      case 'weekly': return 'week';
      case 'monthly': return 'month';
    }
  };

  const formatXLabel = (value: string) => {
    switch (activeTab) {
      case 'daily': return formatDateLabel(value);
      case 'weekly': return formatWeekLabel(value);
      case 'monthly': return value.substring(5);
    }
  };

  const chartData = getChartData();

  return (
    <div className="reading-stats-page">
      <div className="page-header">
        <h1 className="page-title">阅读统计</h1>
        <p className="page-subtitle">追踪您的阅读习惯和进度</p>
      </div>

      {activeSession && (
        <motion.div
          className="active-reading-card"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="active-reading-info">
            <div className="active-reading-indicator" />
            <div>
              <h3>正在阅读：{activeSession.title}</h3>
              <p className="active-reading-time">已阅读 {formatTime(elapsedTime)}</p>
            </div>
          </div>
          <button className="btn-primary end-reading-btn" onClick={handleEndReading}>
            ⏹ 结束阅读
          </button>
        </motion.div>
      )}

      <div className="stats-summary">
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="stat-value">{totalHours.toFixed(1)}</div>
          <div className="stat-label">总阅读时长（小时）</div>
        </motion.div>
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="stat-value">{currentWeekHours.toFixed(1)}</div>
          <div className="stat-label">本周阅读时长（小时）</div>
        </motion.div>
        <motion.div
          className="stat-card growth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className={`stat-value ${growthPercent >= 0 ? 'growth-up' : 'growth-down'}`}>
            {growthPercent >= 0 ? (
              <><span className="growth-arrow">▲</span>{growthPercent}%</>
            ) : (
              <><span className="growth-arrow down">▼</span>{Math.abs(growthPercent)}%</>
            )}
          </div>
          <div className="stat-label">较上周{growthPercent >= 0 ? '增长' : '减少'}</div>
        </motion.div>
      </div>

      <div className="chart-section card">
        <div className="chart-header">
          <h3>阅读时长趋势</h3>
          <div className="chart-tabs">
            <button
              className={`chart-tab ${activeTab === 'daily' ? 'active' : ''}`}
              onClick={() => setActiveTab('daily')}
            >
              每日
            </button>
            <button
              className={`chart-tab ${activeTab === 'weekly' ? 'active' : ''}`}
              onClick={() => setActiveTab('weekly')}
            >
              每周
            </button>
            <button
              className={`chart-tab ${activeTab === 'monthly' ? 'active' : ''}`}
              onClick={() => setActiveTab('monthly')}
            >
              每月
            </button>
          </div>
        </div>

        <div className="chart-summary-row">
          {activeTab === 'daily' && (
            <span>本周共阅读 <strong>{currentWeekHours.toFixed(1)}</strong> 小时，较上周
              {growthPercent >= 0 ? (
                <span className="growth-up">增长 {growthPercent}% ▲</span>
              ) : (
                <span className="growth-down">减少 {Math.abs(growthPercent)}% ▼</span>
              )}
            </span>
          )}
          {activeTab === 'weekly' && (
            <span>近4周共阅读 <strong>{weeklyData.reduce((s, d) => s + d.hours, 0).toFixed(1)}</strong> 小时</span>
          )}
          {activeTab === 'monthly' && (
            <span>近6月共阅读 <strong>{monthlyData.reduce((s, d) => s + d.hours, 0).toFixed(1)}</strong> 小时</span>
          )}
        </div>

        {loading ? (
          <div className="chart-loading">加载中...</div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D6" />
                <XAxis
                  dataKey={getXAxisKey()}
                  tickFormatter={formatXLabel}
                  tick={{ fontSize: 12, fill: '#7A5C45' }}
                  axisLine={{ stroke: '#E0D5C1' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#7A5C45' }}
                  axisLine={{ stroke: '#E0D5C1' }}
                  label={{ value: '小时', angle: -90, position: 'insideLeft', fill: '#7A5C45', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="hours" radius={[8, 8, 0, 0]} maxBarSize={60}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={getBarColor(index, chartData.length)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadingStats;
