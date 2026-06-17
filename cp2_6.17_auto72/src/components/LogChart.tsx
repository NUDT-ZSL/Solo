import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { LogEntry, Project, FilterState } from '../types';
import { getDaysInRange } from '../utils/dateUtils';

interface LogChartProps {
  logs: LogEntry[];
  projects: Project[];
  filter: FilterState;
}

const PIE_COLORS = ['#ff5252', '#448aff', '#69f0ae', '#ffab40', '#b39ddb'];

const LogChart: React.FC<LogChartProps> = ({ logs, projects, filter }) => {
  const projectMap = useMemo(() => {
    const map: Record<string, Project> = {};
    projects.forEach(p => map[p.id] = p);
    return map;
  }, [projects]);

  const days = useMemo(() => getDaysInRange(filter), [filter]);

  const dailyData = useMemo(() => {
    const dayMap: Record<string, number> = {};
    days.forEach(d => dayMap[d] = 0);
    logs.forEach(log => {
      const d = log.date.substring(0, 10);
      if (dayMap[d] !== undefined) {
        dayMap[d] += log.duration;
      }
    });
    return days.map(d => ({
      date: d.substring(5),
      minutes: dayMap[d]
    }));
  }, [logs, days]);

  const tagData = useMemo(() => {
    const tagMap: Record<string, number> = {};
    logs.forEach(log => {
      if (!tagMap[log.tag]) tagMap[log.tag] = 0;
      tagMap[log.tag] += log.duration;
    });
    return Object.entries(tagMap)
      .map(([tag, minutes]) => ({ tag, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [logs]);

  const pieData = useMemo(() => {
    return tagData.map((t, i) => ({
      name: t.tag,
      value: t.minutes,
      color: PIE_COLORS[i % PIE_COLORS.length]
    }));
  }, [tagData]);

  const totalMinutes = useMemo(() => logs.reduce((sum, l) => sum + l.duration, 0), [logs]);

  const showCustomLabel = filter.dateRange === 'custom' || filter.dateRange === 'month' || days.length > 7;

  if (logs.length === 0) {
    return (
      <div className="empty-chart">
        <p>暂无符合条件的学习记录</p>
        <p className="empty-chart-hint">开始你的第一段专注时光，数据就会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="charts-container">
      <div className="chart-summary">
        <div className="summary-item">
          <span className="summary-value">{totalMinutes}</span>
          <span className="summary-label">总分钟数</span>
        </div>
        <div className="summary-item">
          <span className="summary-value">{logs.length}</span>
          <span className="summary-label">学习次数</span>
        </div>
        <div className="summary-item">
          <span className="summary-value">{tagData.length}</span>
          <span className="summary-label">技术栈数量</span>
        </div>
        <div className="summary-item">
          <span className="summary-value">
            {logs.length > 0 ? (totalMinutes / logs.length).toFixed(1) : 0}
          </span>
          <span className="summary-label">平均时长(分)</span>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-box">
          <h4 className="chart-title">每日学习时长（柱状图）</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={showCustomLabel && days.length <= 31 ? dailyData : dailyData.filter((_, i) => i % Math.ceil(dailyData.length / 15) === 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: '分钟', angle: -90, position: 'insideLeft', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e0e0e0' }}
                formatter={(value: number) => [`${value} 分钟`, '学习时长']}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="minutes" fill="#7c4dff" name="学习时长（分钟）" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h4 className="chart-title">学习时长趋势（折线图）</h4>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={showCustomLabel && days.length <= 31 ? dailyData : dailyData.filter((_, i) => i % Math.ceil(dailyData.length / 15) === 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: '分钟', angle: -90, position: 'insideLeft', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e0e0e0' }}
                formatter={(value: number) => [`${value} 分钟`, '累计时长']}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="minutes"
                stroke="#00bcd4"
                strokeWidth={2}
                name="每日累计时长（分钟）"
                dot={{ r: 4, fill: '#00bcd4' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box chart-box-pie">
          <h4 className="chart-title">技术栈占比（饼图）</h4>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ strokeWidth: 1 }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e0e0e0' }}
                  formatter={(value: number) => [`${value} 分钟`, '学习时长']}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart-small">暂无标签数据</div>
          )}
        </div>
      </div>

      {tagData.length > 0 && (
        <div className="tag-ranking">
          <h4 className="chart-title">技术栈学习排行榜</h4>
          <div className="ranking-list">
            {tagData.map((item, idx) => {
              const max = tagData[0].minutes;
              return (
                <div key={item.tag} className="ranking-row">
                  <span className="ranking-index">{idx + 1}</span>
                  <span className="ranking-tag">{item.tag}</span>
                  <div className="ranking-bar-container">
                    <div
                      className="ranking-bar-fill"
                      style={{
                        width: `${(item.minutes / max) * 100}%`,
                        background: PIE_COLORS[idx % PIE_COLORS.length]
                      }}
                    />
                  </div>
                  <span className="ranking-value">{item.minutes}分钟</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LogChart;
