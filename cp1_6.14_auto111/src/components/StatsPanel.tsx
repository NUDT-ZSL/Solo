import {
  LineChart,
  Line,
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
import { Stats, TAG_COLORS, Tag } from '../types';

const FALLBACK_COLORS = [
  '#8884d8',
  '#4C51BF',
  '#9F7AEA',
  '#ED64A6',
  '#667EEA',
  '#38A169',
  '#DD6B20',
];

const DEFAULT_COLOR = '#8884d8';

function getTagColor(tagName: string, index: number): string {
  if (tagName && tagName in TAG_COLORS) {
    return TAG_COLORS[tagName as Tag] || DEFAULT_COLOR;
  }
  if (FALLBACK_COLORS && FALLBACK_COLORS.length > 0) {
    const safeIndex = Math.max(0, index) % FALLBACK_COLORS.length;
    return FALLBACK_COLORS[safeIndex] || DEFAULT_COLOR;
  }
  return DEFAULT_COLOR;
}

interface StatsPanelProps {
  stats: Stats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const formatMonth = (month: string) => {
    const [, m] = month.split('-');
    return `${parseInt(m, 10)}月`;
  };

  const renderCustomizedLabel = ({
    cx,
    cy,
    percent,
  }: {
    cx: number;
    cy: number;
    percent: number;
  }) => {
    return (
      <text
        x={cx}
        y={cy}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="stats-panel">
      <h2 className="stats-title">阅读统计</h2>

      <div className="stats-overview">
        <div className="stat-item">
          <span className="stat-value">{stats.totalViews.toLocaleString()}</span>
          <span className="stat-label">总阅读量</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.avgLikes}</span>
          <span className="stat-label">平均点赞</span>
        </div>
      </div>

      <div className="chart-section">
        <h3 className="chart-title">阅读量趋势</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonth}
                tick={{ fill: '#718096', fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fill: '#718096', fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString(), '阅读量']}
                labelFormatter={formatMonth}
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#3182ce"
                strokeWidth={3}
                dot={{ fill: '#3182ce', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-section">
        <h3 className="chart-title">标签分布</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.tagDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={70}
                dataKey="value"
              >
                {stats.tagDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={getTagColor(entry.name, index)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value}篇`,
                  name,
                ]}
              />
              <Legend
                formatter={(value) => value}
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
