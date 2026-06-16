import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import useApi, { BoxOfficeData, Play } from '../hooks/useApi';
import './AnalysisModule.css';

const AnalysisModule: React.FC = () => {
  const { getBoxOffice, getPlays } = useApi();
  const [data, setData] = useState<BoxOfficeData[]>([]);
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'twoWeeks' | 'month'>('week');
  const [selectedPlay, setSelectedPlay] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [boxOfficeData, playsData] = await Promise.all([
          getBoxOffice(selectedPlay || undefined, timeRange),
          getPlays()
        ]);
        setData(boxOfficeData);
        setPlays(playsData);
      } catch (err) {
        console.error('加载数据失败', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [timeRange, selectedPlay]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const totalTickets = data.reduce((sum, d) => sum + d.ticketsSold, 0);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const avgTickets = data.length > 0 ? Math.round(totalTickets / data.length) : 0;

  return (
    <div className="analysis-module">
      <div className="module-header">
        <h2>数据分析</h2>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>时间范围</label>
          <div className="range-buttons">
            <button
              className={`range-btn ${timeRange === 'week' ? 'active' : ''}`}
              onClick={() => setTimeRange('week')}
            >
              近一周
            </button>
            <button
              className={`range-btn ${timeRange === 'twoWeeks' ? 'active' : ''}`}
              onClick={() => setTimeRange('twoWeeks')}
            >
              近两周
            </button>
            <button
              className={`range-btn ${timeRange === 'month' ? 'active' : ''}`}
              onClick={() => setTimeRange('month')}
            >
              近一月
            </button>
          </div>
        </div>
        <div className="filter-group">
          <label>剧目筛选</label>
          <select
            value={selectedPlay}
            onChange={e => setSelectedPlay(e.target.value)}
          >
            <option value="">全部剧目</option>
            {plays.map(play => (
              <option key={play.id} value={play.id}>{play.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{totalTickets}</div>
          <div className="stat-label">总售票量</div>
        </div>
        <div className="stat-card revenue">
          <div className="stat-value">¥{totalRevenue.toLocaleString()}</div>
          <div className="stat-label">总收入</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgTickets}</div>
          <div className="stat-label">日均销量</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <div className="charts-container">
          <div className="chart-card">
            <h3>售票量趋势</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    stroke="#a0a0a0"
                    fontSize={12}
                  />
                  <YAxis stroke="#a0a0a0" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#16213e',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                      color: '#e0e0e0'
                    }}
                    labelStyle={{ color: '#e0e0e0', marginBottom: '8px' }}
                    formatter={(value: number) => [`${value} 张`, '售票量']}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <Legend wrapperStyle={{ color: '#a0a0a0' }} />
                  <Line
                    type="monotone"
                    dataKey="ticketsSold"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ fill: '#4f46e5', r: 6, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                    name="售票量"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <h3>票房收入趋势</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    stroke="#a0a0a0"
                    fontSize={12}
                  />
                  <YAxis stroke="#a0a0a0" fontSize={12} tickFormatter={v => `¥${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#16213e',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                      color: '#e0e0e0'
                    }}
                    labelStyle={{ color: '#e0e0e0', marginBottom: '8px' }}
                    formatter={(value: number) => [`¥${value.toLocaleString()}`, '票房收入']}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <Legend wrapperStyle={{ color: '#a0a0a0' }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    name="票房收入"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisModule;
