import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import type { VoteHistoryItem } from '../types';

interface VoteChartProps {
  history: VoteHistoryItem[];
}

function formatTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const sec = Math.max(1, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  return `${hr}小时前`;
}

export default function VoteChart({ history }: VoteChartProps) {
  if (!history || history.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 12,
        }}
      >
        暂无投票历史
      </div>
    );
  }

  const data = history.map((h, idx) => ({
    index: idx,
    score: h.score,
    time: formatTimeAgo(h.timestamp),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
          formatter={(value: number) => [`热度 ${value}`, '']}
          labelFormatter={(label: number) => {
            const item = data[label];
            return item ? item.time : '';
          }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#4ECDC4"
          strokeWidth={2.5}
          dot={{ fill: '#4ECDC4', r: 3, strokeWidth: 0 }}
          activeDot={{ fill: '#4ECDC4', r: 5, stroke: '#ffffff', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
