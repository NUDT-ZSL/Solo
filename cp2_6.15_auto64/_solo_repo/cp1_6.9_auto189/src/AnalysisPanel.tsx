import { useState, useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  LabelList
} from 'recharts';
import type { EvaluateResponse, SentenceIssue } from './types';

interface AnalysisPanelProps {
  result: EvaluateResponse;
  originalText?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#FF9800';
  return '#F44336';
}

function getScoreGrade(score: number): string {
  if (score >= 90) return '优秀';
  if (score >= 80) return '良好';
  if (score >= 70) return '中等';
  if (score >= 60) return '及格';
  return '需提高';
}

function AnalysisPanel({ result }: AnalysisPanelProps) {
  const [hoveredIssue, setHoveredIssue] = useState<SentenceIssue | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const radarData = useMemo(() => {
    return result.dimensions.map(d => ({
      subject: d.name,
      score: (d.score / d.maxScore) * 100,
      fullMark: 100
    }));
  }, [result.dimensions]);

  const barData = useMemo(() => {
    return result.dimensions.map(d => ({
      name: d.name,
      score: d.score,
      fullMark: d.maxScore,
      color: d.color
    }));
  }, [result.dimensions]);

  const issueMap = useMemo(() => {
    const map = new Map<number, SentenceIssue>();
    result.issues.forEach(issue => {
      map.set(issue.sentenceIndex, issue);
    });
    return map;
  }, [result.issues]);

  const handleSentenceMouseEnter = (
    e: React.MouseEvent<HTMLSpanElement>,
    issue: SentenceIssue
  ) => {
    setHoveredIssue(issue);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const container = (e.currentTarget as HTMLElement).closest('.highlight-container');
    let containerTop = 0;
    if (container) {
      containerTop = (container as HTMLElement).getBoundingClientRect().top;
    }
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - containerTop - 8
    });
  };

  const handleSentenceMouseLeave = () => {
    setHoveredIssue(null);
  };

  return (
    <div style={{ marginTop: '36px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#333'
        }}>
          评估结果
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{
            fontSize: '13px',
            color: '#666',
            backgroundColor: '#F5F5F5',
            padding: '4px 10px',
            borderRadius: '4px'
          }}>
            字数：{result.wordCount} 词
          </span>
          <span style={{
            fontSize: '13px',
            color: '#666',
            backgroundColor: '#F5F5F5',
            padding: '4px 10px',
            borderRadius: '4px'
          }}>
            句子：{result.sentences.length} 句
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4%',
        marginBottom: '28px'
      }}>
        <div style={{
          width: '48%',
          minWidth: '300px',
          backgroundColor: '#FAFAFA',
          borderRadius: '10px',
          padding: '20px',
          border: '1px solid #EEEEEE',
          position: 'relative'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            分项柱状图
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={barData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              barCategoryGap="20px"
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#666' }}
                axisLine={{ stroke: '#E0E0E0' }}
                tickLine={false}
                height={30}
              />
              <YAxis
                domain={[0, 25]}
                ticks={[0, 5, 10, 15, 20, 25]}
                tick={{ fontSize: 11, fill: '#999' }}
                axisLine={{ stroke: '#E0E0E0' }}
                tickLine={false}
                width={30}
              />
              <Bar
                dataKey="score"
                barSize={40}
                radius={[6, 6, 0, 0]}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="score"
                  position="top"
                  formatter={(value: number) => value.toString()}
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    fill: 'var(--bar-color)'
                  }}
                  content={({ x, y, value, index }: any) => {
                    const colors = ['#2196F3', '#4CAF50', '#FF9800', '#F44336'];
                    return (
                      <text
                        x={x + 20}
                        y={y - 6}
                        fill={colors[index] || '#333'}
                        fontSize={14}
                        fontWeight={700}
                        textAnchor="middle"
                      >
                        {value}
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{
          width: '48%',
          minWidth: '300px',
          backgroundColor: '#FAFAFA',
          borderRadius: '10px',
          padding: '20px',
          border: '1px solid #EEEEEE',
          position: 'relative'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            四维雷达图
          </div>
          <div style={{ position: 'relative', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="75%"
                data={radarData}
              >
                <PolarGrid stroke="#E0E0E0" strokeWidth={1} />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{
                    fontSize: 12,
                    fill: '#555',
                    fontWeight: 500
                  }}
                  tickFormatter={(value: string) => value}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  ticks={[25, 50, 75, 100]}
                  tick={{ fontSize: 9, fill: '#BBB' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Radar
                  name="得分"
                  dataKey="score"
                  stroke="#FF6F61"
                  fill="#FF6F61"
                  fillOpacity={0.25}
                  strokeWidth={2}
                  animationDuration={800}
                  animationEasing="ease-out"
                  dot={{
                    r: 4,
                    fill: '#FF6F61',
                    stroke: '#FFFFFF',
                    strokeWidth: 2
                  }}
                  activeDot={{
                    r: 6,
                    fill: '#FF6F61',
                    stroke: '#FFFFFF',
                    strokeWidth: 2
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>

            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 700,
                color: getScoreColor(result.totalScore),
                lineHeight: 1.2
              }}>
                {result.totalScore}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#999',
                marginTop: '2px'
              }}>
                {getScoreGrade(result.totalScore)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px'
        }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#333'
          }}>
            原文分析
          </h3>
          <div style={{
            display: 'flex',
            gap: '16px',
            fontSize: '12px',
            color: '#666'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                backgroundColor: 'rgba(255, 235, 59, 0.3)',
                border: '1px solid #FFEB3B'
              }} />
              语法错误
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                backgroundColor: 'rgba(189, 189, 189, 0.2)',
                border: '1px solid #BDBDBD'
              }} />
              弱化表达
            </span>
          </div>
        </div>

        <div
          className="highlight-container"
          style={{
            position: 'relative',
            width: '60%',
            backgroundColor: '#FFFFFF',
            border: '1px solid #EEEEEE',
            borderRadius: '8px',
            padding: '14px 16px',
            fontSize: '14px',
            lineHeight: 1.8,
            color: '#555',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '320px',
            overflowY: 'auto',
            willChange: 'transform'
          }}
        >
          {result.sentences.map((sentence, index) => {
            const issue = issueMap.get(index);
            let bgColor = 'transparent';

            if (issue) {
              if (issue.type === 'grammar') {
                bgColor = 'rgba(255, 235, 59, 0.3)';
              } else {
                bgColor = 'rgba(189, 189, 189, 0.2)';
              }
            }

            return (
              <span
                key={index}
                onMouseEnter={issue ? (e) => handleSentenceMouseEnter(e, issue) : undefined}
                onMouseLeave={issue ? handleSentenceMouseLeave : undefined}
                style={{
                  backgroundColor: bgColor,
                  borderRadius: issue ? '3px' : '0',
                  padding: issue ? '0 2px' : '0',
                  cursor: issue ? 'help' : 'default',
                  transition: 'background-color 0.15s ease',
                  display: 'inline'
                }}
              >
                {sentence}
                {index < result.sentences.length - 1 ? ' ' : ''}
              </span>
            );
          })}

          {hoveredIssue && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(
                  Math.max(tooltipPos.x, 100),
                  (hoveredIssue as any)._containerWidth || 600
                ),
                top: Math.max(tooltipPos.y - 40, 0),
                transform: 'translateX(-50%)',
                backgroundColor: '#333333',
                color: '#FFFFFF',
                fontSize: '14px',
                padding: '8px 12px',
                borderRadius: '4px',
                zIndex: 100,
                maxWidth: '280px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                pointerEvents: 'none',
                whiteSpace: 'normal'
              }}
            >
              <div style={{
                fontWeight: 600,
                marginBottom: '4px',
                color: hoveredIssue.type === 'grammar' ? '#FFEB3B' : '#E0E0E0',
                fontSize: '12px'
              }}>
                {hoveredIssue.type === 'grammar' ? '⚠️ 语法问题' : '💡 表达建议'}
              </div>
              <div style={{ lineHeight: 1.5 }}>{hoveredIssue.description}</div>
            </div>
          )}
        </div>
      </div>

      {result.issues.length > 0 && (
        <div style={{
          marginTop: '24px',
          width: '60%'
        }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '12px'
          }}>
            问题汇总 ({result.issues.length} 项)
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {result.issues.map((issue, index) => (
              <div
                key={index}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${issue.type === 'grammar' ? '#FFC107' : '#9E9E9E'}`,
                  backgroundColor: issue.type === 'grammar' ? '#FFFDE7' : '#FAFAFA',
                  fontSize: '13px'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: issue.type === 'grammar' ? '#FFECB3' : '#E0E0E0',
                    color: issue.type === 'grammar' ? '#F57F17' : '#616161'
                  }}>
                    {issue.type === 'grammar' ? '语法' : '表达'}
                  </span>
                  <span style={{
                    color: '#333',
                    fontWeight: 500
                  }}>
                    {issue.description}
                  </span>
                </div>
                <div style={{
                  color: '#777',
                  fontStyle: 'italic',
                  fontSize: '12px',
                  paddingLeft: '4px',
                  lineHeight: 1.6
                }}>
                  「{issue.sentence}」
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalysisPanel;
