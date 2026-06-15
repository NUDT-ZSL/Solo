import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  CartesianGridProps
} from 'recharts';
import { CommonError, WordStat, ScoreHistoryItem } from '../types';

interface SummaryReportProps {
  errors: CommonError[];
  wordStats: WordStat[];
  scoreHistory: ScoreHistoryItem[];
}

const errorTypeConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  grammar: { label: '语法错误', icon: '📝', color: '#DC2626', bg: 'linear-gradient(135deg, #FEE2E2, #FECACA)' },
  pronunciation: { label: '发音问题', icon: '🎙️', color: '#D97706', bg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' },
  vocabulary: { label: '词汇使用', icon: '📚', color: '#7C3AED', bg: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)' }
};

export const SummaryReport: React.FC<SummaryReportProps> = ({ errors, wordStats, scoreHistory }) => {
  const hasData = errors.length > 0 || wordStats.length > 0 || scoreHistory.length > 0;

  if (!hasData) {
    return (
      <div style={{
        padding: '32px 20px',
        textAlign: 'center',
        color: '#94A3B8'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px', color: '#64748B' }}>
          暂无总结数据
        </h4>
        <p style={{ fontSize: '0.8rem' }}>
          完成至少一轮对话后即可查看详细报告
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {errors.length > 0 && (
        <section>
          <SectionTitle icon="⚠️" title="常见错误分析" count={errors.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {errors.map((err, idx) => {
              const config = errorTypeConfig[err.type] || errorTypeConfig.grammar;
              return (
                <div
                key={idx}
                className="animate-fade-in"
                style={{
                  animationDelay: `${idx * 80}ms`,
                  opacity: 0,
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: '#FEFCE8',
                  border: '1px solid #FEF08A',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: config.bg,
                    color: config.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '0.9rem'
                  }}>
                    {config.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: config.color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px'
                    }}>
                      {config.label}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#1E3A5F',
                      fontWeight: 500,
                      lineHeight: 1.5,
                      marginBottom: '4px'
                    }}>
                      <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{err.original}</span>
                      {err.correction && err.correction !== err.original && (
                        <span style={{ marginLeft: '8px', color: '#16A34A', fontWeight: 700 }}>
                          → {err.correction}
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#64748B',
                      lineHeight: 1.5,
                      margin: '4px 0 0 0'
                    }}>
                      💡 {err.suggestion}
                    </p>
                  </div>
                </div>
              </div>
              );
            }}
          </div>
        </section>
      )}

      {wordStats.length > 0 && (
        <section>
          <SectionTitle icon="📊" title="高频词汇使用" count={wordStats.length} />
          <div style={{
            height: '200px',
            background: '#F8FAFC',
            borderRadius: '14px',
            padding: '12px'
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={wordStats.map(w => ({ name: w.word, 次数: w.count }))}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={70}
                  tick={{ fontSize: 11, fill: '#1E3A5F', fontWeight: 500 }}
                />
                <Tooltip
                  cursor={{ fill: '#EFF6FF' }}
                  contentStyle={{
                    borderRadius: '10px',
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(30, 58, 95, 0.12)',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                  formatter={(value: number) => [`使用 ${value} 次`, '频率']}
                />
                <Bar
                  dataKey="次数"
                  fill="url(#barGradient)"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {scoreHistory.length > 0 && (
        <section>
          <SectionTitle icon="📈" title="综合评分走势" count={scoreHistory.length} />
          <div style={{
            height: '200px',
            background: '#F8FAFC',
            borderRadius: '14px',
            padding: '12px'
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={scoreHistory}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="index"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(v) => `第${v}次`}
                />
                <YAxis
                  domain={[40, 100]}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '10px',
                    border: 'none',
                    boxShadow: '0 4px 16px rgba(30, 58, 95, 0.12)',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                  formatter={(value: number) => [`${value}分`}
                  labelFormatter={(label) => `${label} 对话`}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="overall"
                  name="综合分"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="pronunciation"
                  name="发音"
                  stroke="#10B981"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ fill: '#10B981', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="grammar"
                  name="语法"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ fill: '#8B5CF6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
};

interface SectionTitleProps {
  icon: string;
  title: string;
  count: number;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ icon, title, count }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px'
  }}>
    <h4 style={{
      fontSize: '0.95rem',
      fontWeight: 700,
      color: '#1E3A5F',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span>{icon}</span>
      {title}
    </h4>
    <span style={{
      fontSize: '0.75rem',
      fontWeight: 600,
      padding: '2px 10px',
      borderRadius: '20px',
      background: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)',
      color: '#1D4ED8'
    }}>
      {count} 项
    </span>
  </div>
);
