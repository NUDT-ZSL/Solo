import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import http from '../utils/http';
import { moodConfigs } from '../types';
import type { TrendResponse } from '../types';

type Period = 'week' | 'month';

function TrendChart() {
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        setLoading(true);
        const trendData = await http.get<never, TrendResponse>(`/moods/trend?period=${period}`);
        setData(trendData);
      } catch (error) {
        console.error('Failed to fetch trend:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrend();
  }, [period]);

  const chartData = data?.trendData.map(d => ({
    ...d,
    displayValue: d.value ?? 0
  })) || [];

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>情绪趋势分析</h2>

      <div style={styles.periodToggle}>
        <button
          onClick={() => setPeriod('week')}
          style={{
            ...styles.periodButton,
            ...(period === 'week' ? styles.periodButtonActive : {})
          }}
          className={`mood-period-button ${period === 'week' ? 'active' : ''}`}
        >
          本周
        </button>
        <button
          onClick={() => setPeriod('month')}
          style={{
            ...styles.periodButton,
            ...(period === 'month' ? styles.periodButtonActive : {})
          }}
          className={`mood-period-button ${period === 'month' ? 'active' : ''}`}
        >
          本月
        </button>
      </div>

      {loading ? (
        <p style={styles.loading}>加载中...</p>
      ) : (
        <>
          <div style={styles.chartWrapper} className="mood-chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6c5ce7" />
                    <stop offset="100%" stopColor="#00cec9" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#718096', fontSize: 12 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  domain={[0, 5]} 
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fill: '#718096', fontSize: 12 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(value) => {
                    const labels: Record<number, string> = {
                      1: '开心',
                      2: '平静',
                      3: '悲伤',
                      4: '愤怒',
                      5: '负面'
                    };
                    return labels[value] || '';
                  }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const point = payload[0].payload;
                      return (
                        <div style={styles.tooltip}>
                          <p style={styles.tooltipDate}>{point.date}</p>
                          {point.value !== null ? (
                            <>
                              <p style={styles.tooltipValue}>
                                情绪指数: {point.value}
                              </p>
                              <p style={styles.tooltipCount}>记录: {point.count}条</p>
                              {Object.entries(point.moodCounts as Record<string, number>).map(([mood, count]) => (
                                <span key={mood} style={styles.tooltipMood}>
                                  {moodConfigs[mood]?.emoji} {count}
                                </span>
                              ))}
                            </>
                          ) : (
                            <p style={styles.tooltipNoData}>暂无记录</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="displayValue"
                  stroke="url(#lineGradient)"
                  strokeWidth={3}
                  dot={{ fill: '#6c5ce7', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#00cec9' }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={styles.statsCard}>
            <h3 style={styles.statsTitle}>
              {period === 'week' ? '本周' : '本月'}记录统计
            </h3>
            <div style={styles.statsContent}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{data?.totalRecords || 0}</span>
                <span style={styles.statLabel}>总记录数</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <span style={styles.statValue}>
                  {data?.trendData.filter(d => d.count > 0).length || 0}
                </span>
                <span style={styles.statLabel}>
                  {period === 'week' ? '活跃天数' : '活跃日期'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2d3748'
  },
  periodToggle: {
    display: 'flex',
    gap: '8px'
  },
  periodButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#4a5568',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out'
  },
  periodButtonActive: {
    backgroundColor: '#6c5ce7',
    borderColor: '#6c5ce7',
    color: '#ffffff'
  },
  chartWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    transition: 'box-shadow 0.2s ease-out'
  },
  statsCard: {
    width: '100%',
    borderRadius: '8px',
    backgroundColor: '#f8f9fa',
    padding: '20px'
  },
  statsTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#4a5568',
    marginBottom: '16px'
  },
  statsContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#6c5ce7'
  },
  statLabel: {
    fontSize: '13px',
    color: '#718096'
  },
  statDivider: {
    width: '1px',
    height: '40px',
    backgroundColor: '#e2e8f0'
  },
  loading: {
    textAlign: 'center',
    color: '#718096',
    padding: '40px 0'
  },
  tooltip: {
    backgroundColor: '#ffffff',
    padding: '12px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    minWidth: '120px'
  },
  tooltipDate: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#2d3748',
    marginBottom: '8px'
  },
  tooltipValue: {
    fontSize: '14px',
    color: '#6c5ce7',
    fontWeight: 500,
    marginBottom: '4px'
  },
  tooltipCount: {
    fontSize: '12px',
    color: '#718096',
    marginBottom: '8px'
  },
  tooltipMood: {
    display: 'inline-block',
    fontSize: '12px',
    marginRight: '8px',
    color: '#4a5568'
  },
  tooltipNoData: {
    fontSize: '13px',
    color: '#a0aec0'
  }
};

export default TrendChart;
