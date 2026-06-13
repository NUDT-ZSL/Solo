import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
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
import ReactWordcloud from 'react-wordcloud';
import { surveyApi, QuestionStat, StatsResponse } from '../api/surveyApi';

interface StatsPanelProps {
  surveyId: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#84cc16'];
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#84cc16', '#a855f7', '#f97316'];

const StatsPanel: React.FC<StatsPanelProps> = ({ surveyId }) => {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const result = await surveyApi.getStats(surveyId);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [surveyId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
        <div>加载统计数据中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div>{error}</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { stats, totalResponses } = data;

  const renderBarChart = (stat: QuestionStat, questionIndex: number) => {
    if (!stat.options) return null;

    const chartData = stat.options.map(opt => ({
      name: opt.name,
      count: opt.count,
      percentage: opt.percentage,
    }));

    const getBarColor = (index: number, isHovered: boolean) => {
      const baseR = 59;
      const baseG = 130;
      const baseB = 246;
      if (isHovered) {
        return `rgb(${Math.max(0, baseR - 30)}, ${Math.max(0, baseG - 30)}, ${Math.max(0, baseB - 30)})`;
      }
      const step = index * 8;
      return `rgb(${Math.min(255, baseR + step)}, ${Math.max(0, baseG - step)}, ${Math.max(99, baseB - step)})`;
    };

    return (
      <div style={{ width: '100%', height: Math.max(300, stat.options.length * 60) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
            <XAxis type="number" stroke="#64748b" fontSize={12} />
            <YAxis
              dataKey="name"
              type="category"
              width={140}
              stroke="#64748b"
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: '12px 16px',
              }}
              formatter={(value: number, _name: string, props: { payload: { name: string; percentage: number } }) => [
                <div key="tooltip">
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{value} 票</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>占比 {props.payload.percentage}%</div>
                </div>,
                props.payload.name,
              ]}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onMouseEnter={(_data, index) => setHoveredBarIndex(questionIndex * 1000 + index)}
              onMouseLeave={() => setHoveredBarIndex(null)}
            >
              {chartData.map((_, index) => {
                const globalIndex = questionIndex * 1000 + index;
                const isHovered = hoveredBarIndex === globalIndex;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(index, isHovered)}
                    style={{
                      transition: 'all 0.2s ease',
                    }}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderPieChart = (stat: QuestionStat, questionIndex: number) => {
    if (!stat.options) return null;

    const chartData = stat.options.map(opt => ({
      name: opt.name,
      value: opt.count,
      percentage: opt.percentage,
    }));

    const isPieHovered = (index: number) => hoveredPieIndex === questionIndex * 1000 + index;

    return (
      <div style={{ width: '100%', height: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              onMouseEnter={(_data, index) => setHoveredPieIndex(questionIndex * 1000 + index)}
              onMouseLeave={() => setHoveredPieIndex(null)}
            >
              {chartData.map((entry, index) => {
                const isHovered = isPieHovered(index);
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                    style={{
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      transformOrigin: 'center',
                      transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                      filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
                    }}
                    stroke={isHovered ? '#ffffff' : 'none'}
                    strokeWidth={isHovered ? 2 : 0}
                  />
                );
              })}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: '12px 16px',
              }}
              formatter={(value: number, _name: string, props: { payload: { name: string; percentage: number } }) => [
                <div key="pie-tooltip">
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{value} 票</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>占比 {props.payload.percentage}%</div>
                </div>,
                props.payload.name,
              ]}
            />
            <Legend 
              verticalAlign="bottom"
              height={40}
              formatter={(value) => <span style={{ color: '#475569', fontSize: 13 }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderWordCloud = (stat: QuestionStat) => {
    if (!stat.wordCloud || stat.wordCloud.length === 0) {
      return (
        <div style={{ 
          textAlign: 'center', 
          padding: 60, 
          color: '#94a3b8',
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💭</div>
          <div>暂无文本反馈数据</div>
        </div>
      );
    }

    const words = stat.wordCloud.map(w => ({
      text: w.text,
      value: w.value,
    }));

    const maxValue = Math.max(...words.map(w => w.value));

    const callbacks = {
      getWordColor: (word: { text: string; value: number }) => {
        const ratio = word.value / maxValue;
        const r = Math.round(192 - (192 - 147) * ratio);
        const g = Math.round(132 - (132 - 51) * ratio);
        const b = Math.round(252 - (252 - 234) * ratio);
        return `rgb(${r}, ${g}, ${b})`;
      },
      getWordTooltip: (word: { text: string; value: number }) => (
        `${word.text}: ${word.value}次`
      ),
    };

    const options = {
      rotations: 0,
      rotationAngles: [0, 0],
      fontSizes: [14, 72] as [number, number],
      scale: 'sqrt' as const,
      fontStyle: 'normal',
      fontWeight: 600,
      padding: 4,
      enableTooltip: true,
    };

    return (
      <div style={{ 
        background: '#ffffff',
        borderRadius: 12,
        padding: 24,
        minHeight: 350,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <ReactWordcloud
          words={words}
          options={options}
          callbacks={callbacks}
        />
      </div>
    );
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'single': return '单选题';
      case 'multiple': return '多选题';
      case 'text': return '文本题';
      default: return type;
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        color: 'white',
        padding: 28,
        borderRadius: 16,
        marginBottom: 28,
        boxShadow: '0 4px 20px rgba(37, 99, 235, 0.3)',
      }}>
        <h2 style={{ margin: 0, fontSize: 26, marginBottom: 8, fontWeight: 700 }}>{data.survey.title}</h2>
        <div style={{ opacity: 0.95, fontSize: 16 }}>
          已收集 <span style={{ fontWeight: 700, fontSize: 20 }}>{totalResponses}</span> 份回答
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {stats.map((stat, index) => (
          <div
            key={stat.questionId}
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 28,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  color: 'white',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {index + 1}
                </span>
                <span style={{
                  color: '#64748b',
                  fontSize: 14,
                  background: '#f1f5f9',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontWeight: 500,
                }}>
                  {getTypeLabel(stat.type)}
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: 19, color: '#1e293b', fontWeight: 600, lineHeight: 1.5 }}>
                {stat.questionText}
              </h3>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 20,
              '@media (min-width: 768px)': {
                gridTemplateColumns: '1fr 1fr',
              },
            }}>
              <div>
                {stat.type === 'multiple' && renderBarChart(stat, index)}
                {stat.type === 'single' && renderPieChart(stat, index)}
                {stat.type === 'text' && renderWordCloud(stat)}
              </div>
            </div>

            {stat.options && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 12,
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid #f1f5f9',
              }}>
                {stat.options.map((opt, i) => (
                  <div key={i} style={{
                    background: '#f8fafc',
                    padding: '14px 18px',
                    borderRadius: 10,
                    borderLeft: `4px solid ${COLORS[i % COLORS.length]}`,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                  >
                    <div style={{ fontSize: 14, color: '#475569', marginBottom: 4, fontWeight: 500 }}>{opt.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
                      {opt.count} <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>({opt.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsPanel;
