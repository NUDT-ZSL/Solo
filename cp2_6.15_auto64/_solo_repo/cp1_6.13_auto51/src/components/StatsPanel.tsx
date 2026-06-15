import React, { useEffect, useState, useCallback } from 'react';
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

const COLOR_PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#ef4444', '#84cc16', '#a855f7', '#f97316',
  '#14b8a6', '#eab308', '#f43f5e', '#6366f1', '#22c55e',
];

const BAR_COLOR_START = { r: 59, g: 130, b: 246 };
const BAR_COLOR_END = { r: 99, g: 102, b: 241 };

function getGradientColor(index: number, total: number, darken: boolean = false) {
  const ratio = total <= 1 ? 0 : index / (total - 1);
  const darkenFactor = darken ? 0.75 : 1;
  const r = Math.round((BAR_COLOR_START.r + (BAR_COLOR_END.r - BAR_COLOR_START.r) * ratio) * darkenFactor);
  const g = Math.round((BAR_COLOR_START.g + (BAR_COLOR_END.g - BAR_COLOR_START.g) * ratio) * darkenFactor);
  const b = Math.round((BAR_COLOR_START.b + (BAR_COLOR_END.b - BAR_COLOR_START.b) * ratio) * darkenFactor);
  return `rgb(${r}, ${g}, ${b})`;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ surveyId }) => {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBarIdx, setHoveredBarIdx] = useState<{ qIdx: number; optIdx: number } | null>(null);
  const [hoveredPieIdx, setHoveredPieIdx] = useState<{ qIdx: number; optIdx: number } | null>(null);

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

  const getTypeLabel = useCallback((type: string) => {
    switch (type) {
      case 'single': return '单选题';
      case 'multiple': return '多选题';
      case 'text': return '文本题';
      default: return type;
    }
  }, []);

  const renderBarChart = useCallback((stat: QuestionStat, qIdx: number) => {
    if (!stat.options || stat.options.length === 0) return null;

    const chartData = stat.options.map(opt => ({
      name: opt.name,
      count: opt.count,
      percentage: opt.percentage,
    }));

    return (
      <div style={{ width: '100%', height: Math.max(280, stat.options.length * 55 + 80) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 50, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              stroke="#475569"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
              contentStyle={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                padding: '12px 16px',
              }}
              labelStyle={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}
              formatter={(value: number, _n: string, props: { payload: { percentage: number } }) => [
                <div key="bar-tip">
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 16 }}>{value} 票</div>
                  <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
                    占比 <span style={{ fontWeight: 600, color: '#3b82f6' }}>{props.payload.percentage}%</span>
                  </div>
                </div>,
                null,
              ]}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onMouseEnter={(_d: unknown, idx: number) => setHoveredBarIdx({ qIdx, optIdx: idx })}
              onMouseLeave={() => setHoveredBarIdx(null)}
            >
              {chartData.map((_, index) => {
                const isHovered = hoveredBarIdx?.qIdx === qIdx && hoveredBarIdx?.optIdx === index;
                return (
                  <Cell
                    key={`bar-cell-${index}`}
                    fill={getGradientColor(index, chartData.length, isHovered)}
                    style={{ transition: 'all 0.2s ease' }}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }, [hoveredBarIdx]);

  const renderPieChart = useCallback((stat: QuestionStat, qIdx: number) => {
    if (!stat.options || stat.options.length === 0) return null;

    const totalCount = stat.options.reduce((s, o) => s + o.count, 0);
    const chartData = stat.options.map(opt => ({
      name: opt.name,
      value: opt.count,
      percentage: totalCount > 0 ? Math.round((opt.count / totalCount) * 100) : 0,
    }));

    const OUTER_RADIUS = 110;
    const HOVER_OFFSET = 8;

    return (
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={OUTER_RADIUS}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              label={({ name, percent }) => totalCount > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
              labelLine={{ stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '2,2' }}
              onMouseEnter={(_d: unknown, idx: number) => setHoveredPieIdx({ qIdx, optIdx: idx })}
              onMouseLeave={() => setHoveredPieIdx(null)}
            >
              {chartData.map((entry, index) => {
                const isHovered = hoveredPieIdx?.qIdx === qIdx && hoveredPieIdx?.optIdx === index;
                return (
                  <Cell
                    key={`pie-cell-${index}`}
                    fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    stroke={isHovered ? '#ffffff' : 'transparent'}
                    strokeWidth={isHovered ? 3 : 0}
                    style={{
                      transformOrigin: 'center',
                      transform: isHovered ? `translate(0, -${HOVER_OFFSET}px) scale(1.04)` : 'none',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      filter: isHovered ? 'drop-shadow(0 6px 16px rgba(0,0,0,0.2))' : 'none',
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                padding: '12px 16px',
              }}
              formatter={(value: number, _n: string, props: { payload: { name: string; percentage: number } }) => [
                <div key="pie-tip">
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 16 }}>
                    {value} 票
                  </div>
                  <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
                    占比 <span style={{ fontWeight: 600, color: '#8b5cf6' }}>{props.payload.percentage}%</span>
                  </div>
                </div>,
                props.payload.name,
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={40}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span style={{ color: '#475569', fontSize: 13, paddingLeft: 4 }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }, [hoveredPieIdx]);

  const renderWordCloud = useCallback((stat: QuestionStat) => {
    if (!stat.wordCloud || stat.wordCloud.length === 0) {
      return (
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 48,
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #f1f5f9',
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>💭</div>
          <div style={{ color: '#94a3b8', fontSize: 15 }}>暂无文本反馈数据</div>
          <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 4 }}>收集成员回答后将在此显示词云</div>
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
        const ratio = maxValue > 1 ? word.value / maxValue : 1;
        const r = Math.round(192 - (192 - 147) * ratio);
        const g = Math.round(132 - (132 - 51) * ratio);
        const b = Math.round(252 - (252 - 234) * ratio);
        return `rgb(${r}, ${g}, ${b})`;
      },
      getWordTooltip: (word: { text: string; value: number }) => {
        return `${word.text}：出现 ${word.value} 次`;
      },
    };

    const wordcloudOptions = {
      rotations: 0,
      rotationAngles: [0, 0] as [number, number],
      fontSizes: [16, 64] as [number, number],
      fontStyle: 'normal',
      fontWeight: 600,
      padding: 6,
      scale: 'sqrt' as const,
      enableTooltip: true,
      deterministic: false,
      spiral: 'archimedean' as const,
    };

    return (
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: 24,
        minHeight: 360,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #f1f5f9',
      }}>
        <ReactWordcloud
          words={words}
          options={wordcloudOptions}
          callbacks={callbacks}
        />
      </div>
    );
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#64748b' }}>
        <div style={{
          width: 48, height: 48, margin: '0 auto 16px',
          border: '4px solid #e2e8f0', borderTopColor: '#3b82f6',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{ fontSize: 15 }}>正在加载统计数据...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        textAlign: 'center', padding: '60px 24px',
        background: '#ffffff', borderRadius: 12, margin: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div style={{ color: '#ef4444', fontSize: 15 }}>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, totalResponses } = data;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 40px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        color: 'white',
        padding: 28,
        borderRadius: 16,
        marginBottom: 28,
        boxShadow: '0 4px 24px rgba(37, 99, 235, 0.3)',
      }}>
        <h2 style={{
          margin: 0, fontSize: 26, fontWeight: 700, marginBottom: 8,
          lineHeight: 1.3,
        }}>{data.survey.title}</h2>
        <div style={{ opacity: 0.95, fontSize: 16 }}>
          已收集 <span style={{ fontWeight: 700, fontSize: 22 }}>{totalResponses}</span> 份回答
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {stats.map((stat, qIdx) => (
          <div
            key={stat.questionId}
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: 28,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #f1f5f9',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: 10, flexWrap: 'wrap',
              }}>
                <span style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  color: 'white', width: 32, height: 32,
                  borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, flexShrink: 0,
                }}>
                  {qIdx + 1}
                </span>
                <span style={{
                  color: '#64748b', fontSize: 13,
                  background: '#f1f5f9', padding: '5px 14px',
                  borderRadius: 20, fontWeight: 500,
                }}>
                  {getTypeLabel(stat.type)}
                </span>
                <span style={{
                  color: '#94a3b8', fontSize: 12,
                  marginLeft: 'auto',
                }}>
                  共 {stat.totalResponses} 人回答
                </span>
              </div>
              <h3 style={{
                margin: 0, fontSize: 18, color: '#1e293b',
                fontWeight: 600, lineHeight: 1.5,
              }}>
                {stat.questionText}
              </h3>
            </div>

            {stat.type === 'multiple' && renderBarChart(stat, qIdx)}
            {stat.type === 'single' && renderPieChart(stat, qIdx)}
            {stat.type === 'text' && renderWordCloud(stat)}

            {stat.options && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 12,
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid #f1f5f9',
              }}>
                {stat.options.map((opt, i) => (
                  <div key={i} style={{
                    background: '#f8fafc',
                    padding: '14px 16px',
                    borderRadius: 10,
                    borderLeft: `4px solid ${COLOR_PALETTE[i % COLOR_PALETTE.length]}`,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                  >
                    <div style={{
                      fontSize: 13, color: '#475569',
                      marginBottom: 4, fontWeight: 500,
                      lineHeight: 1.4,
                    }}>{opt.name}</div>
                    <div style={{
                      fontSize: 20, fontWeight: 700, color: '#1e293b',
                    }}>
                      {opt.count}
                      <span style={{
                        fontSize: 13, color: '#64748b',
                        fontWeight: 500, marginLeft: 4,
                      }}>({opt.percentage}%)</span>
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
