import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import type { StatsSummary, DailyRedemption, CouponRedemption } from '../types';
import { api } from '../api';

const COLORS = ['#FF6B35', '#1E3A5F', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

function formatDateLabel(dateStr: string): string {
  const d = dayjs(dateStr);
  return `${d.month() + 1}/${d.date()}`;
}

function truncateName(name: string, max = 12): string {
  if (name.length <= max) return name;
  return name.substring(0, max) + '...';
}

export default function StatsDashboard() {
  const today = dayjs();
  const defaultStart = today.subtract(6, 'day').format('YYYY-MM-DD');
  const defaultEnd = today.format('YYYY-MM-DD');

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [daily, setDaily] = useState<DailyRedemption[]>([]);
  const [couponStats, setCouponStats] = useState<CouponRedemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [s, d, c] = await Promise.all([
          api.getStatsSummary(startDate, endDate),
          api.getDailyRedemptions(startDate, endDate),
          api.getCouponRedemptions(startDate, endDate),
        ]);
        if (mounted) {
          setSummary(s);
          setDaily(d);
          setCouponStats(c);
        }
      } catch {
        // silent
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [startDate, endDate]);

  const dailyChartData = useMemo(() => {
    return daily.map(d => ({
      ...d,
      label: formatDateLabel(d.date),
    }));
  }, [daily]);

  const barChartData = useMemo(() => {
    return couponStats.map(c => ({
      ...c,
      shortName: truncateName(c.name, 10),
    }));
  }, [couponStats]);

  const totalRedemptions = useMemo(
    () => couponStats.reduce((sum, c) => sum + c.count, 0),
    [couponStats]
  );

  return (
    <div>
      <div className="stats-header">
        <h2>核销数据看板</h2>
        <div className="date-filter">
          <label>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <path d="M16 2v4" />
              <path d="M8 2v4" />
              <path d="M3 10h18" />
            </svg>
          </label>
          <input
            type="date"
            className="date-input"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            max={endDate}
          />
          <span style={{ color: '#6B7280' }}>至</span>
          <input
            type="date"
            className="date-input"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            min={startDate}
            max={defaultEnd}
          />
        </div>
      </div>

      {loading && !summary ? (
        <div className="stats-summary">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card">
              <div className="skeleton-line short" />
              <div className="skeleton-line amount" style={{ height: 36 }} />
            </div>
          ))}
        </div>
      ) : summary && (
        <div className="stats-summary">
          <div className="stat-card">
            <div className="stat-label">优惠券总数</div>
            <div className="stat-value">{summary.total_coupons}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">期间领取数</div>
            <div className="stat-value">{summary.total_claims}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">期间核销数</div>
            <div className="stat-value">{summary.total_redemptions}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">累计节省金额</div>
            <div className="stat-value">¥{summary.total_saved}</div>
          </div>
        </div>
      )}

      <div className="charts-container">
        <div className="chart-card">
          <div className="chart-title">近7天每日核销数量</div>
          {loading || daily.length === 0 ? (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
              {loading ? '加载中...' : '暂无数据'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" stroke="#1E3A5F" fontSize={12} tickLine={false} />
                <YAxis stroke="#1E3A5F" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    borderRadius: 4,
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    fontSize: 13,
                    color: '#1E3A5F',
                  }}
                  labelStyle={{ color: '#1E3A5F', fontWeight: 600 }}
                  formatter={(value: number) => [`${value} 张`, '核销数量']}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#FF6B35"
                  strokeWidth={3}
                  dot={{ fill: '#FF6B35', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-title">各优惠券核销占比（TOP 10）</div>
          {loading || barChartData.length === 0 ? (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
              {loading ? '加载中...' : '暂无数据'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#1E3A5F" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  stroke="#1E3A5F"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    borderRadius: 4,
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    fontSize: 13,
                    color: '#1E3A5F',
                  }}
                  formatter={(value: number, _name: string, props: any) => {
                    const pct = totalRedemptions > 0 ? ((value / totalRedemptions) * 100).toFixed(1) : '0';
                    return [`${value} 张 (${pct}%)`, props.payload.name];
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {barChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
