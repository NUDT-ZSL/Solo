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

const StatsPanel: React.FC<StatsPanelProps> = ({ surveyId }) => {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const renderBarChart = (stat: QuestionStat) => {
    if (!stat.options) return null;

    const chartData = stat.options.map(opt => ({
      name: opt.name,
      count: opt.count,
    }));

    return (
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" stroke="#64748b" fontSize={12} />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              stroke="#64748b"
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`rgb(${59 + (index * 5) % 4}, ${130 - (index * 10) % 20}, ${246 - (index * 15) % 30})`}
                  style={{
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderPieChart = (stat: QuestionStat) => {
    if (!stat.options) return null;

    const chartData = stat.options.map(opt => ({
      name: opt.name,
      value: opt.count,
      percentage: opt.percentage,
    }));

    return (
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  style={{
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    transformOrigin: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number, name: string, props: { payload: { percentage: number } }) => [
                `${value}票 (${props.payload.percentage}%)`,
                name,
              ]}
            />
            <Legend />
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
          padding: 40, 
          color: '#94a3b8',
          background: '#ffffff',
          borderRadius: 12,
        }}>
          暂无文本数据
        </div>
      );
    }

    const words = stat.wordCloud.map(w => ({
      text: w.text,
      value: w.value,
    }));

    const callbacks = {
      getWordColor: (word: { value: number }) => {
        const maxValue = Math.max(...words.map(w => w.value));
        const ratio = word.value / maxValue;
        const r = Math.round(192 - (192 - 147) * ratio);
        const g = Math.round(132 - (132 - 51) * ratio);
        const b = Math.round(252 - (252 - 234) * ratio);
        return `rgb(${r}, ${g}, ${b})`;
      },
    };

    const options = {
      rotations: 0,
      rotationAngles: [0, 0],
      fontSizes: [16, 60],
      scale: 'log' as const,
    };

    return (
      <div style={{ 
        background: '#ffffff',
        borderRadius: 12,
        padding: 20,
        minHeight: 300,
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
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        color: 'white',
        padding: 24,
        borderRadius: 12,
        marginBottom: 24,
      }}>
        <h2 style={{ margin: 0, fontSize: 24, marginBottom: 8 }}>{data.survey.title}</h2>
        <div style={{ opacity: 0.9 }}>已收集 {totalResponses} 份回答</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {stats.map((stat, index) => (
          <div
            key={stat.questionId}
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 24,
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
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  color: 'white',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                }}>
                  {index + 1}
                </span>
                <span style={{
                  color: '#64748b',
                  fontSize: 14,
                  background: '#f1f5f9',
                  padding: '4px 12px',
                  borderRadius: 20,
                }}>
                  {getTypeLabel(stat.type)}
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>{stat.questionText}</h3>
            </div>

            {stat.type === 'multiple' && renderBarChart(stat)}
            {stat.type === 'single' && renderPieChart(stat)}
            {stat.type === 'text' && renderWordCloud(stat)}

            {stat.options && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 12,
                marginTop: 16,
              }}>
                {stat.options.map((opt, i) => (
                  <div key={i} style={{
                    background: '#f8fafc',
                    padding: '12px 16px',
                    borderRadius: 8,
                    borderLeft: `4px solid ${COLORS[i % COLORS.length]}`,
                  }}>
                    <div style={{ fontSize: 14, color: '#475569', marginBottom: 4 }}>{opt.name}</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>
                      {opt.count} <span style={{ fontSize: 14, color: '#64748b' }}>({opt.percentage}%)</span>
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
