import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { paperApi } from '../api';
import type { PaperAnalysis, QuestionAnalysis, Question, Paper } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ResultAnalyzerProps {
  paperId: string;
}

export const ResultAnalyzer: React.FC<ResultAnalyzerProps> = ({ paperId }) => {
  const [analysis, setAnalysis] = useState<PaperAnalysis | null>(null);
  const [paper, setPaper] = useState<(Paper & { questions: Question[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [analysisData, paperData] = await Promise.all([
        paperApi.getAnalysis(paperId),
        paperApi.getById(paperId),
      ]);
      setAnalysis(analysisData);
      setPaper(paperData);
    } catch {}
    setLoading(false);
  }, [paperId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = useMemo(() => {
    if (!analysis) return null;
    const labels = analysis.questionAnalysis.map((qa) => `第${qa.questionIndex}题`);
    const data = analysis.questionAnalysis.map((qa) => qa.correctRate);
    const colors = analysis.questionAnalysis.map((_, i, arr) => {
      const ratio = i / Math.max(arr.length - 1, 1);
      const r = Math.round(52 + (155 - 52) * ratio);
      const g = Math.round(152 + (89 - 152) * ratio);
      const b = Math.round(219 + (182 - 219) * ratio);
      return `rgba(${r}, ${g}, ${b}, 0.85)`;
    });

    return {
      labels,
      datasets: [
        {
          label: '正确率 (%)',
          data,
          backgroundColor: colors,
          borderRadius: { topLeft: 4, topRight: 4 },
          barThickness: 40,
          maxBarThickness: 40,
        },
      ],
    };
  }, [analysis]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `正确率: ${ctx.parsed.y}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: '#bdc3c7', callback: (v: any) => `${v}%` },
        grid: { color: '#34495e40' },
      },
      x: {
        ticks: { color: '#bdc3c7' },
        grid: { display: false },
      },
    },
  }), []);

  const sortedAnalysis = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.questionAnalysis].sort((a, b) => a.correctRate - b.correctRate);
  }, [analysis]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#bdc3c7' }}>加载分析数据...</div>;
  }

  if (!analysis || !paper) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#e74c3c' }}>无法加载分析数据</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#ecf0f1', marginBottom: 8 }}>
        成绩分析 — {paper.title}
      </h2>

      <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ background: '#2c3e50', borderRadius: 8, padding: '16px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#3498db' }}>{analysis.totalSubmissions}</div>
          <div style={{ fontSize: 14, color: '#bdc3c7' }}>提交人数</div>
        </div>
        <div style={{ background: '#2c3e50', borderRadius: 8, padding: '16px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#2ecc71' }}>{analysis.avgTotalScore}</div>
          <div style={{ fontSize: 14, color: '#bdc3c7' }}>平均分</div>
        </div>
        <div style={{ background: '#2c3e50', borderRadius: 8, padding: '16px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#f39c12' }}>{paper.questions.length}</div>
          <div style={{ fontSize: 14, color: '#bdc3c7' }}>总题数</div>
        </div>
      </div>

      {chartData && (
        <div style={{ background: '#2c3e50', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#ecf0f1', marginBottom: 16 }}>各题正确率</h3>
          <div style={{ height: 300 }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      <div style={{ background: '#2c3e50', borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#ecf0f1', marginBottom: 16 }}>
          题目详情（按正确率从低到高）
        </h3>

        {sortedAnalysis.map((qa) => {
          const question = paper.questions.find((q) => q.id === qa.questionId);
          const isExpanded = expandedQ === qa.questionId;
          const isLow = qa.correctRate < 50;
          const indicatorColor = isLow ? '#e74c3c' : '#2ecc71';

          return (
            <div
              key={qa.questionId}
              style={{
                marginBottom: 8,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #34495e',
              }}
            >
              <div
                onClick={() => setExpandedQ(isExpanded ? null : qa.questionId)}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  background: isExpanded ? '#3d566e' : '#2c3e50',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = '#3d566e'; }}
                onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = '#2c3e50'; }}
              >
                <div style={{
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderBottom: isLow ? 'none' : `8px solid ${indicatorColor}`,
                  borderTop: isLow ? `8px solid ${indicatorColor}` : 'none',
                  flexShrink: 0,
                }} />

                <span style={{ fontSize: 14, color: '#bdc3c7', minWidth: 50 }}>
                  第{qa.questionIndex}题
                </span>

                <span style={{ flex: 1, color: '#ecf0f1', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {question?.content || ''}
                </span>

                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: indicatorColor,
                  minWidth: 60,
                  textAlign: 'right',
                }}>
                  {qa.correctRate}%
                </span>

                <span style={{ fontSize: 14, color: '#bdc3c7', minWidth: 80, textAlign: 'right' }}>
                  {qa.correctCount}/{qa.totalAttempts}
                </span>

                <span style={{ fontSize: 12, color: '#7f8c8d' }}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>

              {isExpanded && qa.studentAnswers.length > 0 && (
                <div style={{ background: '#1a252c', padding: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 12px', color: '#bdc3c7', borderBottom: '1px solid #34495e' }}>学生</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', color: '#bdc3c7', borderBottom: '1px solid #34495e' }}>答案</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', color: '#bdc3c7', borderBottom: '1px solid #34495e' }}>得分</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', color: '#bdc3c7', borderBottom: '1px solid #34495e' }}>结果</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qa.studentAnswers.map((sa, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#2c3e50' : '#34495e' }}>
                          <td style={{ padding: '8px 12px', color: '#ecf0f1' }}>{sa.studentName}</td>
                          <td style={{ padding: '8px 12px', color: '#ecf0f1', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {Array.isArray(sa.answer) ? sa.answer.join(', ') : sa.answer}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#ecf0f1', textAlign: 'center' }}>{sa.score}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ color: sa.isCorrect ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>
                              {sa.isCorrect ? '✓' : '✗'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isExpanded && qa.studentAnswers.length === 0 && (
                <div style={{ background: '#1a252c', padding: 16, textAlign: 'center', color: '#7f8c8d', fontSize: 14 }}>
                  暂无学生作答数据
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
