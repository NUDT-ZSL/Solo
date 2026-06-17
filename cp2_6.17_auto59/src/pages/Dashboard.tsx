import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';
import axiosClient from '../api/axiosClient';
import { StatsResponse } from '../types';
import DateRangeFilter from '../components/DateRangeFilter';

const Dashboard: React.FC = () => {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = (await axiosClient.get('/reports/stats', {
        params: { startDate, endDate },
      })) as unknown as StatsResponse;
      setStats(res);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const handleDateChange = (s: string, e: string) => {
    setStartDate(s);
    setEndDate(e);
  };

  const renderTooltip = (props: { active?: boolean; payload?: Array<{ payload: any }> }) => {
    if (props.active && props.payload && props.payload.length) {
      const data = props.payload[0].payload;
      return (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: 6,
            padding: '10px 14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 600, color: '#212121', marginBottom: 4 }}>{data.name}</div>
          <div style={{ color: '#757575' }}>汇报数量：{data.count} 条</div>
        </div>
      );
    }
    return null;
  };

  const renderPieLabel = (entry: { name: string; percent: number }) => {
    return `${entry.name} ${(entry.percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="page-enter" style={{ padding: 32 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#212121', marginBottom: 4 }}>
          仪表盘
        </h1>
        <p style={{ fontSize: 14, color: '#757575' }}>查看团队工作汇报统计与分析</p>
      </div>

      <DateRangeFilter startDate={startDate} endDate={endDate} onChange={handleDateChange} />

      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              borderTop: '4px solid #3949ab',
            }}
          >
            <div style={{ fontSize: 13, color: '#757575', marginBottom: 8 }}>汇报总数</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#3949ab' }}>
              {stats.totalReports}
            </div>
          </div>
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              borderTop: '4px solid #5c6bc0',
            }}
          >
            <div style={{ fontSize: 13, color: '#757575', marginBottom: 8 }}>团队成员</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#5c6bc0' }}>
              {stats.totalUsers}
            </div>
          </div>
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              borderTop: '4px solid #ff7043',
            }}
          >
            <div style={{ fontSize: 13, color: '#757575', marginBottom: 8 }}>人均汇报</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#ff7043' }}>
              {stats.totalUsers > 0 ? (stats.totalReports / stats.totalUsers).toFixed(1) : 0}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
          gap: 24,
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: 28,
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#212121', marginBottom: 24 }}>
            成员汇报数量统计
          </h3>
          {loading ? (
            <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="skeleton-dot" style={{ margin: 3 }} />
              <div className="skeleton-dot" style={{ margin: 3 }} />
              <div className="skeleton-dot" style={{ margin: 3 }} />
            </div>
          ) : (
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.barChartData || []} layout="vertical" margin={{ left: 20, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#757575' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 13, fill: '#424242', fontWeight: 500 }}
                    width={80}
                  />
                  <Tooltip content={renderTooltip} cursor={{ fill: 'rgba(57,73,171,0.05)' }} />
                  <Bar dataKey="count" name="汇报数量" radius={[0, 6, 6, 0]} barSize={40} label={{ position: 'right', fontSize: 12, fontWeight: 600 }}>
                    {stats?.barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div
          style={{
            background: '#fff',
            padding: 28,
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#212121', marginBottom: 24 }}>
            阻碍类型分布
          </h3>
          {loading ? (
            <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="skeleton-dot" style={{ margin: 3 }} />
              <div className="skeleton-dot" style={{ margin: 3 }} />
              <div className="skeleton-dot" style={{ margin: 3 }} />
            </div>
          ) : (
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.pieChartData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={renderPieLabel}
                    labelLine={{ stroke: '#bdbdbd', strokeWidth: 1 }}
                  >
                    {stats?.pieChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                        stroke="#fff"
                        strokeWidth={2}
                        style={{
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e0e0e0',
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                    formatter={(value: number, name: string) => [`${value} 条`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
