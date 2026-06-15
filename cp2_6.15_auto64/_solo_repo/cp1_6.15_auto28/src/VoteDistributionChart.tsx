/**
 * src/VoteDistributionChart.tsx
 *
 * 得票分布图表组件
 *
 * 数据流向：接收来自 App.tsx 的 options 和 records props
 *
 * 功能：
 *   1. 图表类型切换：柱状图（BarChart）与雷达图（RadarChart）条件渲染，通过切换按钮控制
 *   2. 下钻功能：点击柱状图某个选项 → 展示该选项的详细投票时间分布子图
 *   3. 下钻子图：展示被点击选项的按小时投票分布，支持"返回"按钮收起（0.2秒翻转动画）
 */

import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line,
} from 'recharts';
import type { VoteOption, VoteRecord, ChartType } from './types';

interface Props {
  options: VoteOption[];
  records: VoteRecord[];
}

function DrilldownSubChart({ option, records, allOptions, onBack }: {
  option: VoteOption;
  records: VoteRecord[];
  allOptions: VoteOption[];
  onBack: () => void;
}) {
  const hourlyData = useMemo(() => {
    const optionRecords = records.filter((r) => r.optionId === option.id);
    const hours: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;
    optionRecords.forEach((r) => {
      const h = new Date(r.timestamp).getHours();
      hours[h]++;
    });
    return Object.entries(hours).map(([hour, count]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      count,
    }));
  }, [option, records]);

  const optionName = allOptions.find((o) => o.id === option.id)?.name || option.name;

  return (
    <div className="drilldown-panel flip-enter">
      <div className="drilldown-header">
        <button className="btn-back" onClick={onBack}>
          ← 返回
        </button>
        <span className="drilldown-title">
          「{optionName}」每小时投票分布
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={hourlyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(77,184,255,0.15)" />
          <XAxis dataKey="hour" tick={{ fill: '#b0b8cc', fontSize: 11 }} />
          <YAxis tick={{ fill: '#b0b8cc', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: 'rgba(26,26,46,0.95)',
              border: '1px solid rgba(77,184,255,0.3)',
              borderRadius: 8,
              color: '#f0f0f5',
              fontSize: 13,
            }}
            animationDuration={200}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#4db8ff"
            strokeWidth={2}
            dot={{ r: 3, fill: '#4db8ff' }}
            activeDot={{ r: 5, fill: '#4db8ff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function VoteDistributionChart({ options, records }: Props) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [drilldownOption, setDrilldownOption] = useState<VoteOption | null>(null);

  const barData = useMemo(() =>
    options.map((o) => ({ name: o.name, votes: o.voteCount, id: o.id })),
    [options]
  );

  const radarData = useMemo(() => {
    const maxVotes = Math.max(...options.map((o) => o.voteCount), 1);
    return options.map((o) => ({
      name: o.name,
      votes: o.voteCount,
      fullMark: maxVotes,
    }));
  }, [options]);

  const handleBarClick = (data: { id?: string }) => {
    if (!data.id) return;
    const opt = options.find((o) => o.id === data.id);
    if (opt) setDrilldownOption(opt);
  };

  return (
    <div className="vote-distribution-chart">
      <div className="chart-header">
        <h3 className="chart-title">得票分布</h3>
        <div className="chart-toggle">
          <button
            className={`toggle-btn ${chartType === 'bar' ? 'active' : ''}`}
            onClick={() => setChartType('bar')}
          >
            柱状图
          </button>
          <button
            className={`toggle-btn ${chartType === 'radar' ? 'active' : ''}`}
            onClick={() => setChartType('radar')}
          >
            雷达图
          </button>
        </div>
      </div>

      {chartType === 'bar' ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={barData}
            onClick={(e) => {
              if (e?.activePayload?.[0]?.payload) {
                handleBarClick(e.activePayload[0].payload);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(77,184,255,0.15)" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#b0b8cc', fontSize: 11 }}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: '#b0b8cc', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(26,26,46,0.95)',
                border: '1px solid rgba(77,184,255,0.3)',
                borderRadius: 8,
                color: '#f0f0f5',
                fontSize: 13,
              }}
              animationDuration={200}
              cursor={{ fill: 'rgba(77,184,255,0.08)' }}
            />
            <Bar
              dataKey="votes"
              fill="#4db8ff"
              radius={[4, 4, 0, 0]}
              animationDuration={400}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(77,184,255,0.2)" />
            <PolarAngleAxis dataKey="name" tick={{ fill: '#b0b8cc', fontSize: 11 }} />
            <PolarRadiusAxis tick={{ fill: '#b0b8cc', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: 'rgba(26,26,46,0.95)',
                border: '1px solid rgba(77,184,255,0.3)',
                borderRadius: 8,
                color: '#f0f0f5',
                fontSize: 13,
              }}
              animationDuration={200}
            />
            <Radar
              name="得票数"
              dataKey="votes"
              stroke="#4db8ff"
              fill="#4db8ff"
              fillOpacity={0.25}
              animationDuration={400}
            />
          </RadarChart>
        </ResponsiveContainer>
      )}

      {drilldownOption && (
        <DrilldownSubChart
          option={drilldownOption}
          records={records}
          allOptions={options}
          onBack={() => setDrilldownOption(null)}
        />
      )}
    </div>
  );
}
