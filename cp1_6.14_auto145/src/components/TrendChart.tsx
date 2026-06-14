import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Dot,
} from 'recharts';
import { TrendData, TrendStats, TrendMetric, TimeRange } from '../types';
import { useState, useMemo } from 'react';

interface TrendChartProps {
  data: TrendData[];
  stats: TrendStats;
  metric: TrendMetric;
  range: TimeRange;
  onMetricChange: (metric: TrendMetric) => void;
  onRangeChange: (range: TimeRange) => void;
}

const CustomDot = (props: any) => {
  const { cx, cy, stroke, strokeWidth } = props;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={3}
      fill={stroke}
      stroke="white"
      strokeWidth={2}
    />
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'white',
          padding: '10px 14px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #e0d8d0',
          fontSize: '13px',
          color: '#3e2c1b',
        }}
      >
        <div style={{ fontWeight: 500, marginBottom: '4px' }}>{label}</div>
        <div style={{ color: '#c65b3e', fontWeight: 600 }}>
          {payload[0].value} {payload[0].unit}
        </div>
      </div>
    );
  }
  return null;
};

export default function TrendChart({
  data,
  stats,
  metric,
  range,
  onMetricChange,
  onRangeChange,
}: TrendChartProps) {
  const ranges: { label: string; value: TimeRange }[] = [
    { label: '7天', value: 7 },
    { label: '30天', value: 30 },
    { label: '90天', value: 90 },
  ];

  const metricUnit = metric === 'weight' ? 'kg' : '分钟';
  const metricLabel = metric === 'weight' ? '体重' : '遛弯时长';

  const gradientId = `gradient-${metric}`;

  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      displayValue: item.value || 0,
    }));
  }, [data]);

  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="trend-section">
      <div className="trend-controls">
        <div className="control-group">
          <label>指标</label>
          <select
            className="metric-select"
            value={metric}
            onChange={(e) => onMetricChange(e.target.value as TrendMetric)}
          >
            <option value="weight">体重</option>
            <option value="walkDuration">遛弯时长</option>
          </select>
        </div>
        <div className="control-group">
          <label>时间范围</label>
          <div className="range-tabs">
            {ranges.map((r) => (
              <button
                key={r.value}
                className={`range-tab ${range === r.value ? 'active' : ''}`}
                onClick={() => onRangeChange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="trend-stats">
        <div className="stat-card">
          <div className="stat-label">平均值</div>
          <div className="stat-value">
            {stats.average}
            <span style={{ fontSize: '14px', fontWeight: 400, marginLeft: '2px' }}>
              {metricUnit}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">最大值</div>
          <div className="stat-value">
            {stats.max}
            <span style={{ fontSize: '14px', fontWeight: 400, marginLeft: '2px' }}>
              {metricUnit}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">最小值</div>
          <div className="stat-value">
            {stats.min}
            <span style={{ fontSize: '14px', fontWeight: 400, marginLeft: '2px' }}>
              {metricUnit}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">总计</div>
          <div className="stat-value">
            {stats.total}
            <span style={{ fontSize: '14px', fontWeight: 400, marginLeft: '2px' }}>
              {metricUnit}
            </span>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-title">{metricLabel}趋势</div>
        {hasData ? (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c65b3e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#c65b3e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0d8d0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#8b7d70' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e0d8d0' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#8b7d70' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e0d8d0' }}
                  width={45}
                  unit={metricUnit}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="displayValue"
                  stroke="#c65b3e"
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={<CustomDot stroke="#c65b3e" />}
                  activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8b7d70' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
            <div>暂无相关数据</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              添加{metricLabel}记录后可查看趋势
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
