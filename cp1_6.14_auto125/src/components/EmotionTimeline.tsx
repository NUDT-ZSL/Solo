import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { EmotionKey } from '../types';

export interface TimelinePoint {
  minute: number;
  joy: number;
  fear: number;
  anger: number;
  surprise: number;
}

interface EmotionTimelineProps {
  timelineData: TimelinePoint[];
  currentMinute: number;
}

const EMOTION_COLORS: Record<EmotionKey, string> = {
  joy: '#fbbf24',
  fear: '#ef4444',
  anger: '#f97316',
  surprise: '#38bdf8'
};

const EMOTION_LABELS: Record<EmotionKey, string> = {
  joy: '高兴',
  fear: '恐惧',
  anger: '愤怒',
  surprise: '惊喜'
};

const WINDOW_SIZE = 30;

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { dataKey: EmotionKey; value: number; color: string }[];
  label?: number;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: '#1f2937',
        borderRadius: '8px',
        padding: '8px 12px',
        color: 'white',
        fontSize: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
      }}
    >
      <div style={{ marginBottom: '4px', fontWeight: 600 }}>第{label}分钟</div>
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: entry.color
            }}
          />
          <span style={{ color: '#94a3b8' }}>{EMOTION_LABELS[entry.dataKey]}:</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {entry.value.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
};

const EmotionTimeline: React.FC<EmotionTimelineProps> = React.memo(({ timelineData, currentMinute }) => {
  const windowedData = useMemo(() => {
    const startMinute = Math.max(0, currentMinute - WINDOW_SIZE);
    return timelineData.filter(d => d.minute >= startMinute);
  }, [timelineData, currentMinute]);

  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    const startMinute = Math.max(0, currentMinute - WINDOW_SIZE);
    const endMinute = currentMinute;
    const roundedStart = Math.ceil(startMinute / 5) * 5;
    for (let t = roundedStart; t <= endMinute; t += 5) {
      ticks.push(t);
    }
    if (ticks.length === 0) {
      ticks.push(startMinute);
    }
    return ticks;
  }, [currentMinute]);

  const xDomain = useMemo(() => {
    const startMinute = Math.max(0, currentMinute - WINDOW_SIZE);
    return [startMinute, Math.max(currentMinute, WINDOW_SIZE)] as [number, number];
  }, [currentMinute]);

  return (
    <div className="chart-card">
      <h3 className="chart-title">情绪时间轴</h3>
      <div style={{ width: '100%', flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={windowedData}
            margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="minute"
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(value: number) => `第${value}分钟`}
              ticks={xTicks}
              domain={xDomain}
              interval={0}
              type="number"
            />
            <YAxis
              domain={[-1, 1]}
              stroke="#64748b"
              fontSize={11}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              formatter={(value: string) => (
                <span style={{ color: '#94a3b8' }}>
                  {EMOTION_LABELS[value as EmotionKey]}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="joy"
              stroke={EMOTION_COLORS.joy}
              strokeWidth={2}
              dot={false}
              animationDuration={500}
              animationEasing="ease"
            />
            <Line
              type="monotone"
              dataKey="fear"
              stroke={EMOTION_COLORS.fear}
              strokeWidth={2}
              dot={false}
              animationDuration={500}
              animationEasing="ease"
            />
            <Line
              type="monotone"
              dataKey="anger"
              stroke={EMOTION_COLORS.anger}
              strokeWidth={2}
              dot={false}
              animationDuration={500}
              animationEasing="ease"
            />
            <Line
              type="monotone"
              dataKey="surprise"
              stroke={EMOTION_COLORS.surprise}
              strokeWidth={2}
              dot={false}
              animationDuration={500}
              animationEasing="ease"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

EmotionTimeline.displayName = 'EmotionTimeline';

export default EmotionTimeline;
