import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from 'recharts';
import type { WorkloadSummary, MemberWorkload } from '@/types';

interface WorkloadChartProps {
  summary: WorkloadSummary;
  onMemberClick: (member: MemberWorkload) => void;
}

const WorkloadChart: React.FC<WorkloadChartProps> = ({
  summary,
  onMemberClick,
}) => {
  const chartData = summary.members.map((m) => ({
    name: m.name,
    任务数: m.taskCount,
    剩余容量: m.remainingCapacity,
    _isOverloaded: m.isOverloaded,
  }));

  const getBarColor = (entry: { _isOverloaded: boolean }, index: number) => {
    if (entry._isOverloaded) return '#ff4d4d';
    const ratio = index / Math.max(summary.members.length - 1, 1);
    const r = Math.round(77 + (13 - 77) * ratio);
    const g = Math.round(255 + (88 - 255) * ratio);
    const b = Math.round(77 + (255 - 77) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleBarClick = useCallback(
    (data: { name?: string }) => {
      if (!data.name) return;
      const member = summary.members.find((m) => m.name === data.name);
      if (member) onMemberClick(member);
    },
    [summary.members, onMemberClick]
  );

  const renderBarShape = (props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: { _isOverloaded: boolean };
  }) => {
    const { x = 0, y = 0, width = 0, height = 0, payload } = props;
    const isOverloaded = payload?._isOverloaded;
    const color = getBarColor(payload || { _isOverloaded: false }, 0);

    return (
      <motion.rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={color}
        animate={
          isOverloaded
            ? { opacity: [1, 0.5, 1] }
            : { opacity: 1 }
        }
        transition={
          isOverloaded
            ? { repeat: Infinity, duration: 0.5, ease: 'easeInOut' }
            : {}
        }
        style={{ cursor: 'pointer' }}
      />
    );
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          padding: '16px 12px',
          borderBottom: '1px solid #e9ecef',
          marginBottom: 12,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#4d79ff',
            }}
          >
            {summary.totalTasks}
          </div>
          <div style={{ fontSize: 12, color: '#636e72', marginTop: 2 }}>
            总任务数
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: summary.overloadedCount > 0 ? '#ff4d4d' : '#4dff4d',
            }}
          >
            {summary.overloadedCount}
          </div>
          <div style={{ fontSize: 12, color: '#636e72', marginTop: 2 }}>
            超载人数
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '0 8px', minHeight: 0 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`chart-${summary.members.length}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.1 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 16, left: 8, bottom: 10 }}
                onClick={(state) => {
                  if (state && state.activePayload && state.activePayload[0]) {
                    handleBarClick(state.activePayload[0].payload);
                  }
                }}
              >
                <XAxis
                  type="number"
                  domain={[0, 8]}
                  tick={{ fontSize: 10, fill: '#95a5a6' }}
                  axisLine={{ stroke: '#dee2e6' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={40}
                  tick={{ fontSize: 12, fill: '#2d3436', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(77, 121, 255, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as {
                        name: string;
                        任务数: number;
                        剩余容量: number;
                        _isOverloaded: boolean;
                      };
                      return (
                        <div
                          style={{
                            background: '#2d3436',
                            color: '#ffffff',
                            padding: '8px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>
                            {data.name}
                          </div>
                          <div>任务数: {data.任务数}</div>
                          <div>剩余容量: {data.剩余容量}</div>
                          {data._isOverloaded && (
                            <div
                              style={{ color: '#ff6b6b', marginTop: 2 }}
                            >
                              ⚠ 已超载
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="任务数"
                  barSize={20}
                  shape={renderBarShape}
                  isAnimationActive={true}
                  animationDuration={100}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry, index)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid #e9ecef',
          fontSize: 11,
          color: '#95a5a6',
          textAlign: 'center',
        }}
      >
        点击条形图查看成员任务详情
      </div>
    </div>
  );
};

export default WorkloadChart;
