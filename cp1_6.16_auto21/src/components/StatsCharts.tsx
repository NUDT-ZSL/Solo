import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { StatsData } from '../types';
import { BeanManager } from '../beans/BeanManager';

interface StatsChartsProps {
  stats: StatsData | null;
}

const StatsCharts: React.FC<StatsChartsProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="stats-section">
        <div className="section-header">
          <h2 className="section-title">烘焙统计分析</h2>
        </div>
        <div className="loading-stats">加载统计数据中...</div>
      </div>
    );
  }

  const roastLevelLabels = stats.roastLevelAvgScores.map(item => ({
    level: BeanManager.getRoastLevelLabel(item.level as 'light' | 'medium' | 'dark'),
    avgScore: item.avgScore,
  }));

  return (
    <div className="stats-section">
      <div className="section-header">
        <h2 className="section-title">烘焙统计分析</h2>
      </div>
      <div className="charts-container">
        <div className="chart-card">
          <h3 className="chart-title">月度烘焙批次数量</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats.monthlyBatches}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D2B48C" strokeOpacity={0.3} />
              <XAxis
                dataKey="month"
                stroke="#8B5E3C"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                stroke="#8B5E3C"
                tick={{ fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FAEBD7',
                  border: '1px solid #D2B48C',
                  borderRadius: '8px',
                  color: '#3E2723',
                }}
              />
              <Legend
                wrapperStyle={{ color: '#3E2723' }}
              />
              <Line
                type="monotone"
                dataKey="count"
                name="批次数量"
                stroke="#A0522D"
                strokeWidth={3}
                dot={{ fill: '#A0522D', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">各烘焙度平均评分</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={roastLevelLabels}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D2B48C" strokeOpacity={0.3} />
              <XAxis
                dataKey="level"
                stroke="#8B5E3C"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                stroke="#8B5E3C"
                tick={{ fontSize: 12 }}
                domain={[0, 10]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FAEBD7',
                  border: '1px solid #D2B48C',
                  borderRadius: '8px',
                  color: '#3E2723',
                }}
              />
              <Legend
                wrapperStyle={{ color: '#3E2723' }}
              />
              <Line
                type="monotone"
                dataKey="avgScore"
                name="平均评分"
                stroke="#8B4513"
                strokeWidth={3}
                dot={{ fill: '#8B4513', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatsCharts;
