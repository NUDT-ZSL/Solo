import React, { useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import type { ExamResult, WrongAnswer } from '../hooks/useExam';

interface LocationState {
  result: ExamResult;
  subject: string;
}

const DIMENSIONS = ['基础知识', '逻辑分析', '代码理解', '安全规范', '项目管理'];

export default function ResultDashboard() {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const result = state?.result;
  const subject = state?.subject || '';

  const radarRef = useRef<HTMLCanvasElement>(null);

  if (!result) {
    return (
      <div style={{ minHeight: '100vh', background: '#f7fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#718096', marginBottom: 16 }}>暂无考试结果</p>
          <Link to="/" style={{ color: '#3182ce' }}>返回首页</Link>
        </div>
      </div>
    );
  }

  const { score, totalQuestions, correctCount, wrongAnswers } = result;
  const dimensionScores = calcDimensionScores(wrongAnswers, totalQuestions);
  const suggestions = generateSuggestions(dimensionScores);

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <Link to="/" style={{ color: '#3182ce', fontSize: 14 }}>← 返回首页</Link>
        <span style={{ color: '#718096', fontSize: 14 }}>{subject} · 考试结果</span>
      </div>

      <div style={styles.twoCol}>
        <div style={styles.leftCol}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>考试成绩</h3>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ScoreRing score={score} />
            </div>
            <div style={styles.statsRow}>
              <div style={styles.statItem}>
                <div style={styles.statValue}>{totalQuestions}</div>
                <div style={styles.statLabel}>总题数</div>
              </div>
              <div style={styles.statItem}>
                <div style={{ ...styles.statValue, color: '#38a169' }}>{correctCount}</div>
                <div style={styles.statLabel}>正确</div>
              </div>
              <div style={styles.statItem}>
                <div style={{ ...styles.statValue, color: '#e53e3e' }}>{totalQuestions - correctCount}</div>
                <div style={styles.statLabel}>错误</div>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>知识点分析</h3>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RadarChart ref={radarRef} dimensionScores={dimensionScores} />
            </div>
            <div style={styles.suggestionList}>
              {suggestions.map((s, i) => (
                <div key={i} style={styles.suggestionItem}>
                  <span style={styles.suggestionDot}>💡</span>
                  <span style={{ color: '#4a5568', fontSize: 14, lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.rightCol}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              错题列表
              <span style={{ fontWeight: 400, fontSize: 13, color: '#a0aec0', marginLeft: 8 }}>
                共{wrongAnswers.length}题
              </span>
            </h3>
            {wrongAnswers.length === 0 ? (
              <p style={{ color: '#a0aec0', textAlign: 'center', padding: 20 }}>全部正确，太棒了！</p>
            ) : (
              <div style={styles.wrongList}>
                {wrongAnswers.map((w, i) => (
                  <WrongItem key={w.id} wrong={w} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 180;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 70;
    const lineWidth = 12;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI * score) / 100;

    let animProgress = 0;
    const duration = 1500;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      animProgress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - animProgress, 3);
      const currentEnd = startAngle + (endAngle - startAngle) * eased;

      ctx.clearRect(0, 0, size, size);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#edf2f7';
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      if (animProgress > 0) {
        const gradient = ctx.createLinearGradient(0, size, size, 0);
        gradient.addColorStop(0, '#e53e3e');
        gradient.addColorStop(0.5, '#ecc94b');
        gradient.addColorStop(1, '#38a169');
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, currentEnd);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      const displayScore = Math.round(score * eased);
      ctx.fillStyle = '#1a202c';
      ctx.font = 'bold 42px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${displayScore}`, cx, cy - 8);

      ctx.fillStyle = '#a0aec0';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.fillText('分', cx, cy + 22);

      if (animProgress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [score]);

  return <canvas ref={canvasRef} />;
}

interface RadarChartProps {
  dimensionScores: number[];
}

const RadarChart = React.forwardRef<HTMLCanvasElement, RadarChartProps>(
  ({ dimensionScores }, ref) => {
    useEffect(() => {
      const canvas = ref as React.MutableRefObject<HTMLCanvasElement | null>;
      const c = canvas.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const size = 280;
      c.width = size * dpr;
      c.height = size * dpr;
      c.style.width = `${size}px`;
      c.style.height = `${size}px`;
      ctx.scale(dpr, dpr);

      const cx = size / 2;
      const cy = size / 2;
      const maxR = 100;
      const sides = 5;

      function getPoint(index: number, r: number) {
        const angle = -Math.PI / 2 + (2 * Math.PI * index) / sides;
        return {
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
        };
      }

      for (let level = 1; level <= 5; level++) {
        const r = (maxR * level) / 5;
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
          const p = getPoint(i % sides, r);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let i = 0; i < sides; i++) {
        const p = getPoint(i, maxR);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const idx = i % sides;
        const r = (dimensionScores[idx] / 100) * maxR;
        const p = getPoint(idx, r);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(49, 130, 206, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#3182ce';
      ctx.lineWidth = 2;
      ctx.stroke();

      for (let i = 0; i < sides; i++) {
        const r = (dimensionScores[i] / 100) * maxR;
        const p = getPoint(i, r);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#3182ce';
        ctx.fill();

        const labelP = getPoint(i, maxR + 18);
        ctx.fillStyle = '#4a5568';
        ctx.font = '12px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(DIMENSIONS[i], labelP.x, labelP.y);
      }
    }, [dimensionScores, ref]);

    return <canvas ref={ref} />;
  }
);

RadarChart.displayName = 'RadarChart';

function WrongItem({ wrong, index }: { wrong: WrongAnswer; index: number }) {
  const optionLabels = ['A', 'B', 'C', 'D'];
  return (
    <div style={styles.wrongItem}>
      <div style={styles.wrongHeader}>
        <span style={styles.wrongIndex}>第{index + 1}题</span>
        <span style={styles.wrongTag}>{wrong.knowledgePoint}</span>
      </div>
      <div style={styles.wrongText}>{wrong.text}</div>
      <div style={styles.wrongAnswers}>
        <span style={{ color: '#e53e3e', fontSize: 13 }}>
          你的答案：{optionLabels[wrong.userAnswer]} · {wrong.options[wrong.userAnswer]}
        </span>
        <br />
        <span style={{ color: '#38a169', fontSize: 13 }}>
          正确答案：{optionLabels[wrong.correctAnswer]} · {wrong.options[wrong.correctAnswer]}
        </span>
      </div>
      {wrong.analysis && (
        <div style={styles.wrongAnalysis}>
          解析：{wrong.analysis}
        </div>
      )}
    </div>
  );
}

function calcDimensionScores(wrongAnswers: WrongAnswer[], total: number): number[] {
  const totalPerDim = Math.max(1, Math.ceil(total / 5));
  const wrongPerDim: Record<string, number> = {};
  for (const dim of DIMENSIONS) {
    wrongPerDim[dim] = 0;
  }
  for (const w of wrongAnswers) {
    if (wrongPerDim[w.knowledgePoint] !== undefined) {
      wrongPerDim[w.knowledgePoint]++;
    }
  }
  return DIMENSIONS.map(dim => {
    const wrong = wrongPerDim[dim] || 0;
    return Math.max(0, Math.round(((totalPerDim - wrong) / totalPerDim) * 100));
  });
}

function generateSuggestions(scores: number[]): string[] {
  const suggestions: string[] = [];
  const indexed = scores.map((s, i) => ({ dim: DIMENSIONS[i], score: s, idx: i }));
  indexed.sort((a, b) => a.score - b.score);

  const weak = indexed.filter(x => x.score < 70);
  if (weak.length === 0) {
    suggestions.push('各知识点掌握均衡，建议继续保持每日复习习惯。');
    suggestions.push('可尝试更高难度的模拟题来突破瓶颈。');
    suggestions.push('重点关注错题中的边缘知识点，防止遗忘。');
  } else {
    suggestions.push(`建议加强${weak[0].dim}类题目的练习，当前掌握度仅${weak[0].score}%。`);
    if (weak.length > 1) {
      suggestions.push(`其次关注${weak[1].dim}领域，建议通过专项练习提升。`);
    } else {
      suggestions.push('其他维度表现良好，保持现有学习节奏即可。');
    }
    suggestions.push('推荐每天抽出30分钟进行薄弱知识点专项训练，逐步提升整体水平。');
  }

  return suggestions;
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  topBar: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '20px 16px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  twoCol: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '20px 16px 40px',
    display: 'flex',
    gap: 20,
  },
  leftCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
    minWidth: 0,
  },
  rightCol: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '24px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#2d3748',
    marginBottom: 16,
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 40,
    marginTop: 16,
  },
  statItem: {
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#2d3748',
  },
  statLabel: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 2,
  },
  wrongList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    maxHeight: 600,
    overflowY: 'auto' as const,
  },
  wrongItem: {
    background: '#fff5f5',
    borderRadius: 8,
    padding: '14px 16px',
  },
  wrongHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  wrongIndex: {
    fontWeight: 600,
    fontSize: 13,
    color: '#e53e3e',
  },
  wrongTag: {
    fontSize: 11,
    background: '#fed7d7',
    color: '#c53030',
    padding: '2px 8px',
    borderRadius: 4,
  },
  wrongText: {
    fontSize: 14,
    color: '#2d3748',
    lineHeight: 1.6,
    marginBottom: 6,
  },
  wrongAnswers: {
    fontSize: 13,
    lineHeight: 1.8,
  },
  wrongAnalysis: {
    marginTop: 6,
    padding: '8px 10px',
    background: '#fff',
    borderRadius: 4,
    fontSize: 13,
    color: '#4a5568',
    lineHeight: 1.6,
  },
  suggestionList: {
    marginTop: 20,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  suggestionItem: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  },
  suggestionDot: {
    flexShrink: 0,
    fontSize: 14,
  },
};
