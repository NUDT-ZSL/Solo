import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExamRecord, WrongAnswer, ReviewSuggestion, DimensionScores } from '../types';
import {
  DIMENSION_NAMES,
  formatTime,
  formatDate,
  generateReviewSuggestions,
  getScoreColor,
  getProgressGradient,
} from '../utils/helpers';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const DIMENSION_KEYS: Array<keyof typeof DIMENSION_NAMES> = [
  'basic',
  'logic',
  'code',
  'security',
  'management',
];

export default function ResultDashboard() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<ExamRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [animatedScore, setAnimatedScore] = useState(0);
  const [ringProgress, setRingProgress] = useState(0);

  const ringCanvasRef = useRef<HTMLCanvasElement>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!examId) return;
    fetch(`/api/exam/${examId}`)
      .then((res) => res.json())
      .then((data: ExamRecord) => {
        setRecord(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [examId]);

  const score = record?.score ?? 0;

  useEffect(() => {
    if (loading || !record) return;
    const duration = 1500;
    const startTime = performance.now();
    let rafId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setRingProgress(eased);
      setAnimatedScore(Math.round(score * eased));
      if (t < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [loading, record, score]);

  const drawRing = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) / 2 - 16;
      const lineWidth = 16;

      ctx.clearRect(0, 0, w, h);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      if (ringProgress > 0) {
        const [startColor, endColor] = getProgressGradient(score);
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, startColor);
        gradient.addColorStop(1, endColor);

        ctx.beginPath();
        ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (ringProgress * score / 100));
        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    },
    [ringProgress, score]
  );

  useEffect(() => {
    const canvas = ringCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const size = 240;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);
    drawRing(ctx, size, size);
  }, [drawRing, ringProgress]);

  const drawRadar = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, scores: DimensionScores) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) / 2 - 40;
      const numAxes = DIMENSION_KEYS.length;
      const angleStep = (Math.PI * 2) / numAxes;

      const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

      gridLevels.forEach((level) => {
        ctx.beginPath();
        for (let i = 0; i <= numAxes; i++) {
          const angle = -Math.PI / 2 + i * angleStep;
          const r = radius * level;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(49, 130, 206, ${0.08 + level * 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      for (let i = 0; i < numAxes; i++) {
        const angle = -Math.PI / 2 + i * angleStep;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.strokeStyle = 'rgba(49, 130, 206, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      DIMENSION_KEYS.forEach((key, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const value = scores[key] / 100;
        const r = radius * value;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(49, 130, 206, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#3182ce';
      ctx.lineWidth = 2;
      ctx.stroke();

      DIMENSION_KEYS.forEach((key, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const value = scores[key] / 100;
        const r = radius * value;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#3182ce';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      DIMENSION_KEYS.forEach((key, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const labelR = radius + 22;
        const x = cx + Math.cos(angle) * labelR;
        const y = cy + Math.sin(angle) * labelR;
        ctx.fillStyle = '#4a5568';
        ctx.font = '600 12px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(DIMENSION_NAMES[key], x, y);

        const scoreR = radius + 38;
        const sx = cx + Math.cos(angle) * scoreR;
        const sy = cy + Math.sin(angle) * scoreR;
        ctx.fillStyle = '#3182ce';
        ctx.font = '600 11px -apple-system, sans-serif';
        ctx.fillText(`${scores[key]}`, sx, sy);
      });
    },
    []
  );

  useEffect(() => {
    if (!record) return;
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const size = 300;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);
    drawRadar(ctx, size, size, record.dimensionScores);
  }, [record, drawRadar]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 120, textAlign: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!record) {
    return (
      <div style={{ padding: 120, textAlign: 'center' }}>
        <p style={{ color: '#718096' }}>未找到考试记录</p>
        <button className="btn btn-outline" style={{ marginTop: 16, padding: '0 24px' }} onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    );
  }

  const suggestions: ReviewSuggestion[] = generateReviewSuggestions(record.dimensionScores);
  const scoreColor = getScoreColor(score);
  const passLabel = score >= 60 ? '通过' : '未通过';

  return (
    <div className="fade-in">
      <nav className="top-nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          📝 模考通
        </div>
        <div className="nav-links">
          <span className="nav-link" onClick={() => navigate('/history')}>
            历史成绩
          </span>
          <span className="nav-link" onClick={() => navigate('/')}>
            再考一次
          </span>
        </div>
      </nav>

      <div className="page-container">
        <div style={{ marginBottom: 24 }}>
          <button
            className="btn btn-outline"
            style={{ padding: '0 16px', height: 38, fontSize: 14 }}
            onClick={() => navigate('/')}
          >
            ← 返回首页
          </button>
        </div>

        <div className="two-column">
          <div className="col-left" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 28, textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#718096' }}>
                {record.subjectName}
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#a0aec0' }}>
                {formatDate(record.createdAt)} · 用时 {formatTime(record.timeTaken)}
              </p>

              <div className="score-ring-container">
                <canvas ref={ringCanvasRef} />
                <div className="score-ring-center">
                  <span
                    style={{
                      fontSize: 56,
                      fontWeight: 800,
                      color: scoreColor,
                      lineHeight: 1,
                    }}
                  >
                    {animatedScore}
                  </span>
                  <span style={{ fontSize: 14, color: '#a0aec0', marginTop: 4 }}>分</span>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: score >= 60 ? '#38a169' : '#e53e3e',
                      background: score >= 60 ? '#f0fff4' : '#fff5f5',
                      padding: '2px 12px',
                      borderRadius: 12,
                    }}
                  >
                    {passLabel}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  marginTop: 24,
                  paddingTop: 20,
                  borderTop: '1px solid #edf2f7',
                }}
              >
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#38a169' }}>
                    {record.correctCount}
                  </div>
                  <div style={{ fontSize: 12, color: '#a0aec0' }}>答对</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#e53e3e' }}>
                    {record.wrongAnswers.length}
                  </div>
                  <div style={{ fontSize: 12, color: '#a0aec0' }}>答错</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#3182ce' }}>
                    {record.totalQuestions}
                  </div>
                  <div style={{ fontSize: 12, color: '#a0aec0' }}>总题数</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#2d3748' }}>
                📊 知识点分析雷达图
              </h4>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <canvas ref={radarCanvasRef} />
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#2d3748' }}>
                💡 复习建议
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {suggestions.map((s) => (
                  <div key={s.dimension} className="suggestion-item">
                    <span className="suggestion-number">{s.priority}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 2 }}>
                        {s.dimensionName}
                      </div>
                      <div style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.5 }}>
                        {s.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-right">
            <div className="card" style={{ padding: 24 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#2d3748' }}>
                  错题列表
                </h3>
                <span
                  style={{
                    fontSize: 13,
                    color: '#e53e3e',
                    background: '#fff5f5',
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontWeight: 600,
                  }}
                >
                  共 {record.wrongAnswers.length} 题
                </span>
              </div>

              {record.wrongAnswers.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    color: '#38a169',
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  🎉 恭喜！全部答对，没有错题！
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {record.wrongAnswers.map((wa: WrongAnswer, index: number) => {
                    const isExpanded = expandedIds.has(wa.questionId);
                    return (
                      <div
                        key={wa.questionId}
                        className={`wrong-item ${isExpanded ? 'expanded' : ''}`}
                      >
                        <div
                          className="wrong-item-header"
                          onClick={() => toggleExpand(wa.questionId)}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#e53e3e',
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            #{index + 1}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 14,
                                color: '#2d3748',
                                lineHeight: 1.5,
                                marginBottom: 6,
                              }}
                            >
                              {wa.questionText}
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: '#e53e3e',
                                  background: '#fed7d7',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                }}
                              >
                                你的选择: {OPTION_LABELS[wa.userAnswer]}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  color: '#718096',
                                  background: '#edf2f7',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                }}
                              >
                                {DIMENSION_NAMES[wa.category as keyof typeof DIMENSION_NAMES] || wa.category}
                              </span>
                            </div>
                          </div>
                          <span className="expand-icon" style={{ color: '#a0aec0', fontSize: 14 }}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>

                        <div className="wrong-item-body">
                          <div
                            style={{
                              paddingTop: 12,
                              borderTop: '1px dashed #fed7d7',
                            }}
                          >
                            <div style={{ marginBottom: 10 }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#38a169',
                                  marginBottom: 6,
                                }}
                              >
                                ✓ 正确答案
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: '#2d3748',
                                  background: '#f0fff4',
                                  border: '1px solid #c6f6d5',
                                  borderRadius: 6,
                                  padding: '8px 12px',
                                }}
                              >
                                {OPTION_LABELS[wa.correctAnswer]}. {wa.options[wa.correctAnswer]}
                              </div>
                            </div>

                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#3182ce',
                                  marginBottom: 6,
                                }}
                              >
                                📖 解析
                              </div>
                              <p
                                style={{
                                  fontSize: 13,
                                  color: '#4a5568',
                                  lineHeight: 1.7,
                                  margin: 0,
                                  background: '#f7fafc',
                                  borderRadius: 6,
                                  padding: '8px 12px',
                                }}
                              >
                                {wa.analysis}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
