/**
 * src/VoteTimelineChart.tsx
 *
 * 投票趋势折线图组件
 *
 * 数据流向：接收来自 App.tsx 的 records 和 options props
 *
 * 功能：
 *   1. 按时间维度（每天）绘制折线图展示投票趋势
 *   2. 支持下钻子图联动：当 VoteDistributionChart 触发下钻时，本组件下方展示该选项子图
 *      （当前由 VoteDistributionChart 内部 DrilldownSubChart 处理，未来可提升至 App 层统一管理）
 */

import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { VoteRecord, VoteOption } from './types';

interface Props {
  records: VoteRecord[];
  options: VoteOption[];
}

function formatDay(ts: number): string {
  const d = new Date(ts);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
}

export default function VoteTimelineChart({ records, options }: Props) {
  const dailyData = useMemo(() => {
    const dayMap: Record<string, number> = {};
    records.forEach((r) => {
      const day = formatDay(r.timestamp);
      dayMap[day] = (dayMap[day] || 0) + 1;
    });

    const sorted = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count }));

    return sorted;
  }, [records]);

  const peakDay = useMemo(() => {
    if (dailyData.length === 0) return null;
    return dailyData.reduce((max, cur) => (cur.count > max.count ? cur : max), dailyData[0]);
  }, [dailyData]);

  return (
    <div className="vote-timeline-chart">
      <div className="chart-header">
        <h3 className="chart-title">投票趋势</h3>
        {peakDay && (
          <span className="chart-badge">峰值: {peakDay.day} ({peakDay.count}票)</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={dailyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(77,184,255,0.15)" />
          <XAxis dataKey="day" tick={{ fill: '#b0b8cc', fontSize: 11 }} />
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
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#4db8ff' }}
            activeDot={{ r: 6, fill: '#4db8ff', stroke: '#fff', strokeWidth: 2 }}
            animationDuration={400}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
