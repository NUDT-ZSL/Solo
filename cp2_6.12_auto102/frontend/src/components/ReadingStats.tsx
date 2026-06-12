import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { useAppContext, Book } from '../context/AppContext';
import './ReadingStats.css';

interface DailyData {
  date: string;
  hours: number;
  duration: number;
}

const ReadingStats: React.FC = () => {
  const { user } = useAppContext();
  const [activePeriod, setActivePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [weekHours, setWeekHours] = useState(0);
  const [lastWeekHours, setLastWeekHours] = useState(0);
  const [growthPercent, setGrowthPercent] = useState(0);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStats();
    checkActiveSession();
    
    const handleStartReading = (e: any) => {
      const book = e.detail as Book;
      startReading(book);
    };
    window.addEventListener('startReading', handleStartReading as EventListener);
    
    return () => {
      window.removeEventListener('startReading', handleStartReading as EventListener);
    };
  }, [user, activePeriod]);

  useEffect(() => {
    if (activeSession) {
      const timer = setInterval(() => {
        const startTime = new Date(activeSession.start_time).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setElapsedTime(0);
    }
  }, [activeSession]);

  const loadStats = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [dailyRes, weeklyRes, monthlyRes, summaryRes] = await Promise.all([
        axios.get(`/api/stats/daily/user/${user.id}`, { params: { days: 7 } }),
        axios.get(`/api/stats/weekly/user/${user.id}`, { params: { weeks: 4 } }),
        axios.get(`/api/stats/monthly/user/${user.id}`, { params: { months: 6 } }),
        axios.get(`/api/stats/summary/user/${user.id}`)
      ]);

      if (dailyRes.data.success) {
        setDailyData(dailyRes.data.data.daily);
      }
      if (weeklyRes.data.success) {
        setWeeklyData(weeklyRes.data.data.weekly);
        setWeekHours(weeklyRes.data.data.current_week_hours || 0);
        setLastWeekHours(weeklyRes.data.data.last_week_hours || 0);
        setGrowthPercent(weeklyRes.data.data.growth_percent || 0);
      }
      if (monthlyRes.data.success) {
        setMonthlyData(monthlyRes.data.data.monthly);
      }
      if (summaryRes.data.success) {
        setTotalHours(summaryRes.data.data.total_reading_hours || 0);
      }
    } catch (error) {
      console.error('加载统计数据失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkActiveSession = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`/api/stats/active/user/${user.id}`);
      if (res.data.success && res.data.data) {
        setActiveSession(res.data.data);
      }
    } catch (error) {
      console.error('检查活跃会话失败', error);
    }
  };

  const startReading = async (book?: Book) => {
    if (!user) return;
    const targetBook = book || currentBook;
    if (!targetBook) {
      alert('请先从图书列表选择一本书');
      return;
    }
    try {
      const res = await axios.post('/api/stats/start', {
        book_id: targetBook.id,
        user_id: user.id
      });
      if (res.data.success) {
        setActiveSession(res.data.data);
        setCurrentBook(targetBook);
      } else {
        alert(res.data.message);
        if (res.data.data) {
          setActiveSession(res.data.data);
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '开始阅读失败');
    }
  };

  const endReading = async () => {
    if (!activeSession) return;
    try {
      const res = await axios.post(`/api/stats/end/${activeSession.id}`);
      if (res.data.success) {
        setActiveSession(null);
        setElapsedTime(0);
        setCurrentBook(null);
        loadStats();
        const duration = res.data.data.duration || 0;
        alert(`阅读结束！本次阅读时长：${formatDuration(duration)}`);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '结束阅读失败');
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}小时${m}分${s}秒`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  };

  const formatTimeHHMMSS = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatDate = (dateStr: string) => {
    if (activePeriod === 'monthly') {
      const [year, month] = dateStr.split('-');
      return `${year}年${parseInt(month)}月`;
    }
    if (activePeriod === 'weekly') {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const getChartData = () => {
    switch (activePeriod) {
      case 'daily': return dailyData;
      case 'weekly': return weeklyData.map(w => ({ ...w, date: w.week }));
      case 'monthly': return monthlyData.map(m => ({ ...m, date: m.month }));
    }
  };

  const getGradientColor = (index: number, total: number) => {
    const ratio = total > 1 ? index / (total - 1) : 0;
    const startR = 139, startG = 69, startB = 19;
    const endR = 106, endG = 90, endB = 205;
    const r = Math.round(startR + (endR - startR) * ratio);
    const g = Math.round(startG + (endG - startG) * ratio);
    const b = Math.round(startB + (endB - startB) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-date">{formatDate(label)}</p>
          <p className="tooltip-value">{payload[0].value} 小时</p>
        </div>
      );
    }
    return null;
  };

  const chartData = getChartData();

  return (
    <div className="reading-stats-page">
      <div className="page-header">
        <h1 className="page-title">阅读统计</h1>
        <p className="page-subtitle">记录您的阅读时长，见证成长足迹</p>
      </div>

      <motion.div 
        className="reading-timer-card card"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="timer-header">
          <h3 className="timer-title">⏱️ 阅读计时器</h3>
          {activeSession && (
            <div className="timer-status">
              <span className="status-indicator reading"></span>
              阅读中
            </div>
          )}
        </div>

        {activeSession ? (
          <div className="timer-content">
            <div className="timer-info">
              <span className="timer-book-emoji">{activeSession.cover_emoji}</span>
              <div className="timer-book-info">
                <div className="timer-book-title">{activeSession.title}</div>
                <div className="timer-book-author">{activeSession.author}</div>
              </div>
            </div>
            <div className="timer-display">{formatTimeHHMMSS(elapsedTime)}</div>
            <button className="btn-danger" onClick={endReading}>
              结束阅读
            </button>
          </div>
        ) : (
          <div className="timer-content idle">
            <p className="timer-hint">选择一本书后点击开始，记录您的阅读时长</p>
            <div className="timer-display idle-display">00:00:00</div>
            <button className="btn-primary" onClick={() => startReading()}>
              开始阅读
            </button>
          </div>
        )}
      </motion.div>

      <motion.div
        className="stats-summary card"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="summary-row">
          <span className="summary-label">本周共阅读</span>
          <span className="summary-value highlight">{weekHours} 小时</span>
          {lastWeekHours > 0 && (
            <span className={`growth-indicator ${growthPercent >= 0 ? 'positive' : 'negative'}`}>
              {growthPercent >= 0 ? '▲' : '▼'} {Math.abs(growthPercent)}%
              <span className="growth-label">较上周</span>
            </span>
          )}
        </div>
      </motion.div>

      <div className="chart-tabs">
        {[
          { key: 'daily', label: '每日' },
          { key: 'weekly', label: '每周' },
          { key: 'monthly', label: '每月' }
        ].map(tab => (
          <button
            key={tab.key}
            className={`chart-tab ${activePeriod === tab.key ? 'active' : ''}`}
            onClick={() => setActivePeriod(tab.key as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div 
        className="chart-card card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <div className="chart-loading">加载中...</div>
        ) : (
          <>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0D5C1" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#7A5C45', fontSize: 12 }}
                    axisLine={{ stroke: '#E0D5C1' }}
                    tickLine={false}
                    tickFormatter={formatDate}
                  />
                  <YAxis
                    tick={{ fill: '#7A5C45', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: '小时', angle: -90, position: 'insideLeft', fill: '#7A5C45', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 69, 19, 0.05)' }} />
                  <Bar
                    dataKey="hours"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={50}
                  >
                    {chartData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getGradientColor(index, chartData.length)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-footer">
              <div className="total-stat">
                <span className="stat-label">累计阅读时长</span>
                <span className="stat-value">{totalHours} 小时</span>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ReadingStats;
