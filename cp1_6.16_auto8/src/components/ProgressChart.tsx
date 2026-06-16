import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  LineChart,
} from 'recharts';
import type { WeeklyStats } from '../logic/planGenerator';

interface ProgressChartProps {
  stats: WeeklyStats;
}

const BAR_GRADIENT_ID = 'barGradient';
const LINE_GRADIENT_ID = 'lineGradient';

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <div className="tooltip-label">{label}</div>
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="tooltip-item" style={{ color: p.color }}>
            <span className="tooltip-dot" style={{ backgroundColor: p.color }} />
            <span>{p.name}: </span>
            <strong>{p.value}{p.name.includes('时长') ? '分钟' : '首'}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function ProgressChart({ stats }: ProgressChartProps) {
  const chartData = useMemo(() => {
    return stats.dailyMinutes.map((d, i) => ({
      label: d.label,
      date: d.date,
      练习时长: d.minutes,
      完成曲目: stats.dailyTracksCompleted[i]?.count || 0,
    }));
  }, [stats]);

  const hasData = chartData.some(d => d['练习时长'] > 0 || d['完成曲目'] > 0);

  return (
    <div className="charts-container">
      <div className="chart-card">
        <div className="chart-header">
          <h3>📈 每日练习时长</h3>
          <p className="chart-subtitle">柱状图显示每日练习分钟数</p>
        </div>
        <div className="chart-wrapper">
          {!hasData ? (
            <div className="chart-empty">
              <div className="empty-icon">📊</div>
              <div>暂无数据，开始练习后将显示统计</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 20, right: 24, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id={BAR_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D2A4A" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#718096"
                  tick={{ fontSize: 12, fill: '#A0AEC0' }}
                  axisLine={{ stroke: '#2D2A4A' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#718096"
                  tick={{ fontSize: 12, fill: '#A0AEC0' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}'`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,92,246,0.06)' }} />
                <Legend
                  wrapperStyle={{ color: '#A0AEC0', fontSize: 12, paddingTop: 12 }}
                />
                <Bar
                  dataKey="练习时长"
                  fill={`url(#${BAR_GRADIENT_ID})`}
                  radius={[8, 8, 0, 0]}
                  barSize={40}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h3>🎯 曲目完成趋势</h3>
          <p className="chart-subtitle">折线图显示每日新增完成曲目数</p>
        </div>
        <div className="chart-wrapper">
          {!hasData ? (
            <div className="chart-empty">
              <div className="empty-icon">📉</div>
              <div>暂无数据，完成曲目后将显示趋势</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 20, right: 24, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id={LINE_GRADIENT_ID} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D2A4A" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#718096"
                  tick={{ fontSize: 12, fill: '#A0AEC0' }}
                  axisLine={{ stroke: '#2D2A4A' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#718096"
                  tick={{ fontSize: 12, fill: '#A0AEC0' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: '#A0AEC0', fontSize: 12, paddingTop: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="完成曲目"
                  stroke={`url(#${LINE_GRADIENT_ID})`}
                  strokeWidth={3}
                  dot={{
                    r: 5,
                    fill: '#1E1B2E',
                    stroke: '#10B981',
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 7,
                    fill: '#10B981',
                    stroke: '#1E1B2E',
                    strokeWidth: 2,
                  }}
                  animationDuration={600}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="chart-card combined-card">
        <div className="chart-header">
          <h3>🔄 综合对比</h3>
          <p className="chart-subtitle">时长与曲目完成度叠加视图</p>
        </div>
        <div className="chart-wrapper">
          {!hasData ? (
            <div className="chart-empty">
              <div className="empty-icon">📐</div>
              <div>完成练习任务后显示综合数据</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 20, right: 24, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D2A4A" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#718096"
                  tick={{ fontSize: 12, fill: '#A0AEC0' }}
                  axisLine={{ stroke: '#2D2A4A' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#718096"
                  tick={{ fontSize: 12, fill: '#A0AEC0' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}'`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#718096"
                  tick={{ fontSize: 12, fill: '#A0AEC0' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: '#A0AEC0', fontSize: 12, paddingTop: 12 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="练习时长"
                  fill={`url(#${BAR_GRADIENT_ID})`}
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                  opacity={0.85}
                  animationDuration={600}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="完成曲目"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: '#1E1B2E',
                    stroke: '#F59E0B',
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: '#F59E0B',
                  }}
                  animationDuration={600}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
