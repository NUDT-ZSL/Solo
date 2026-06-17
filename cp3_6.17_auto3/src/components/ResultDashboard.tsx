import { useEffect, useRef, useState, useMemo } from 'react';
import {
  useLocation, useNavigate, useParams,
} from 'react-router-dom';
import {
  Home, ChevronRight, CheckCircle2, XCircle, Lightbulb,
  Trophy, Target, Calendar, Clock,
} from 'lucide-react';
import type { ExamRecord, Question, QuestionCategory } from '../types';

interface LocationState {
  result?: ExamRecord & { questions: Question[] };
  questions?: Question[];
}

const CATEGORIES: QuestionCategory[] = [
  '基础知识',
  '逻辑分析',
  '代码理解',
  '安全规范',
  '项目管理',
] as unknown as QuestionCategory[];

const CATEGORY_MAP: Record<string, QuestionCategory> = {
  '基础': '基础知识' as unknown as QuestionCategory,
  '逻辑分析': '逻辑分析',
  '代码理解': '代码理解',
  '安全规范': '安全规范',
  '项目管理': '项目管理',
};

function getScoreColor(score: number): string {
  if (score >= 90) return '#38a169';
  if (score >= 80) return '#3182ce';
  if (score >= 60) return '#d69e2e';
  return '#e53e3e';
}

function ScoreRing({ score, size = 200 }: { score: number; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let rafId: number;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(score * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [score]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 14;
    const lineWidth = 16;

    ctx.clearRect(0, 0, size, size);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#edf2f7';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * (displayScore / 100);

    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#e53e3e');
    grad.addColorStop(0.5, '#d69e2e');
    grad.addColorStop(1, '#38a169');

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }, [displayScore, size]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
      <div className="flex flex-col items-center">
        <div
          style={{
            fontSize: 54,
            fontWeight: 800,
            color: getScoreColor(displayScore),
            lineHeight: 1,
          }}
        >
          {displayScore}
        </div>
        <div
          style={{
            fontSize: 14,
            color: '#718096',
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          分
        </div>
      </div>
    </div>
  );
}

function RadarChart({
  scores,
  size = 280,
}: {
  scores: Record<string, number>;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 40;
    const levels = 5;
    const sides = CATEGORIES.length;
    const angleStep = (Math.PI * 2) / sides;
    const startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);

    const getPoint = (level: number, idx: number) => {
      const r = (radius * level) / levels;
      const angle = startAngle + idx * angleStep;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    };

    for (let l = 1; l <= levels; l++) {
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const p = getPoint(l, i);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(203, 213, 224, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = 0; i < sides; i++) {
      const p = getPoint(levels, i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(203, 213, 224, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const scoreValues = CATEGORIES.map((cat) => {
      const origKey = (Object.keys(CATEGORY_MAP).find(
        (k) => CATEGORY_MAP[k] === cat
      ) ?? cat) as QuestionCategory;
      return (scores[origKey] ?? 0);
    });

    ctx.beginPath();
    scoreValues.forEach((s, i) => {
      const level = (s / 100) * levels;
      const p = getPoint(level, i);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(49, 130, 206, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#3182ce';
    ctx.lineWidth = 2;
    ctx.stroke();

    scoreValues.forEach((s, i) => {
      const level = (s / 100) * levels;
      const p = getPoint(level, i);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#3182ce';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    ctx.fillStyle = '#4a5568';
    ctx.font = '600 13px "system-ui, sans-serif';
    ctx.textAlign = 'center';
    CATEGORIES.forEach((cat, i) => {
      const p = getPoint(levels + 1.3, i);
      ctx.fillText(cat, p.x, p.y + 4);
    });
  }, [scores, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ maxWidth: '100%' }}
    />
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${s}秒`;
}

export function ResultDashboard() {
  const location = useLocation();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const locationState = location.state as LocationState | null;

  const [record, setRecord] = useState<ExamRecord | null>(
    locationState?.result ?? null
  );
  const [questions, setQuestions] = useState<Question[]>(
    locationState?.questions ?? []
  );
  const [loading, setLoading] = useState(!locationState?.result);

  useEffect(() => {
    if (!locationState?.result && examId) {
      setLoading(true);
      void (async () => {
        try {
          const res = await fetch(`/api/exam/${examId}`);
          if (res.ok) {
            const data: ExamRecord & { questions: Question[] } =
              await res.json();
            setRecord(data);
            setQuestions(data.questions);
          }
        } catch {
          /* ignore */
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [examId, locationState?.result]);

  const wrongList = useMemo(() => {
    if (!record || questions.length === 0) return [];
    const qMap = new Map<string, Question>();
    questions.forEach((q) => qMap.set(q.id, q));
    return record.answers
      .filter((a) => !a.isCorrect)
      .map((a) => {
        const q = qMap.get(a.questionId);
        if (!q) return null;
        return { answer: a, question: q };
      })
      .filter(
        (x): x is { answer: ExamRecord['answers'][number]; question: Question } =>
          !!x
      );
  }, [record, questions, record?.answers]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#f7fafc' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="animate-spin rounded-full"
            style={{
              width: 40,
              height: 40,
              border: '3px solid #e2e8f0',
              borderTopColor: '#3182ce',
            }}
          />
          <p style={{ color: '#4a5568' }}>正在生成报告...</p>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#f7fafc' }}
      >
        <div
          className="text-center p-8"
          style={{
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <p style={{ color: '#e53e3e', marginBottom: 16 }}>未找到考试记录</p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 20px',
              background: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const pass = record.totalScore >= 60;
  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ background: '#f7fafc' }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth: 1200 }}
      >
        <div
          className="flex items-center justify-between mb-6"
        >
          <button
            onClick={() => navigate('/')}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
            className="flex items-center gap-2 px-4 py-2.5"
            style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              color: '#4a5568',
              cursor: 'pointer',
              fontSize: 14,
              transition: 'transform 0.1s',
            }}
          >
            <Home style={{ width: 16, height: 16 }} />
            返回首页
          </button>
          <button
            onClick={() => navigate('/history')}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = '';
            }}
            className="flex items-center gap-2 px-4 py-2.5"
            style={{
              background: '#3182ce',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              cursor: 'pointer',
              fontSize: 14,
              transition: 'transform 0.1s',
            }}
          >
            <Clock style={{ width: 16, height: 16 }} />
            历史成绩
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          style={{
            gridTemplateColumns: '1fr 1fr',
          }}
        >
          <div className="flex flex-col gap-6">
            <div
              className="p-6 flex flex-col items-center"
              style={{
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <div
              className="flex items-center gap-2 mb-2"
              style={{
                padding: '6px 14px',
                borderRadius: 100,
                background: pass ? '#f0fff4' : '#fff5f5',
                color: pass ? '#38a169' : '#e53e3e',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {pass ? <Trophy style={{ width: 14, height: 14 }} /> : <Target style={{ width: 14, height: 14 }} />}
              {pass ? '恭喜通过考试' : '未通过，继续加油'}
            </div>
              <ScoreRing score={record.totalScore} />
              <div
                className="grid grid-cols-2 gap-6 mt-6 w-full"
                style={{ width: '100%' }}
              >
                <div
                  className="text-center p-4 rounded-lg"
                  style={{ background: '#f7fafc' }}
                >
                  <div
                    style={{ fontSize: 13, color: '#718096' }}
                  >
                    正确题数
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: '#38a169',
                      marginTop: 4,
                    }}
                  >
                    {record.correctCount}/{record.totalQuestions}
                  </div>
                </div>
                <div
                  className="text-center p-4 rounded-lg"
                  style={{ background: '#f7fafc' }}
                >
                  <div
                    style={{ fontSize: 13, color: '#718096' }}
                  >
                    用时
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: '#3182ce',
                      marginTop: 4,
                    }}
                  >
                    {formatTime(record.timeUsed)}
                  </div>
                </div>
              </div>
              <div
                className="w-full mt-4 flex items-center gap-3 text-sm"
                style={{
                  padding: '12px 16px',
                  background: '#ebf8ff',
                  borderRadius: 8,
                  color: '#2c5282',
                }}
              >
                <Calendar style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>考试时间：{record.subjectName} | {record.date}</span>
              </div>
            </div>

            <div
              className="p-6"
              style={{
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <h3
                style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#2d3748',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
                <Target style={{ color: '#3182ce', width: 20, height: 20 }} />
                知识点掌握分析
              </h3>
              <div className="flex justify-center mb-4">
                <RadarChart scores={record.categoryScores} />
              </div>
              <div
                className="mt-4 space-y-3"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13,
                  }}
                >
                  <Lightbulb
                    style={{ color: '#d69e2e', width: 18, height: 18, flexShrink: 0 }}
                  />
                  <div
                    style={{
                      fontWeight: 600,
                      color: '#d69e2e',
                    }}
                  >
                    复习建议
                  </div>
                </div>
                <ul className="space-y-2">
                  {record.suggestions.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        padding: '10px 14px',
                        background: '#fffaf0',
                        borderRadius: 8,
                        fontSize: 13,
                        color: '#744210',
                        lineHeight: 1.6,
                      }}
                    >
                      {i + 1}. {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div>
            <div
              className="p-6 h-full"
              style={{
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#2d3748',
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <XCircle
                  style={{ color: '#e53e3e', width: 20, height: 20 }} />
                错题分析 ({wrongList.length > 0
                  ? `共 ${wrongList.length} 道错题
                  : '全部正确，太棒了！'
              </h3>
              {wrongList.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-16">
                  <CheckCircle2
                    style={{ color: '#38a169', width: 64, height: 64, marginBottom: 16 }}
                  />
                  <p
                    style={{ color: '#4a5568', fontSize: 15 }}
                  >
                    全部答对了！知识掌握非常扎实 💪
                  </p>
                </div>
              ) : (
                <div
                  className="space-y-4"
                  style={{
                    maxHeight: 'calc(100vh - 280px',
                    overflowY: 'auto',
                    paddingRight: 4,
                  }}
                >
                  {wrongList.map(({ question, idx) => {
                    const q = question;
                    const userAnswer = record.answers.find(
                      (a) => a.questionId === q.id
                    )?.answer;
                    return (
                      <div
                        key={q.id}
                        style={{
                          background: '#fff5f5',
                          borderRadius: 10,
                          padding: '16px 18px',
                          border: '1px solid #fed7d7',
                        }}
                      >
                        <div
                          className="flex items-start gap-2 mb-3"
                          style={{ marginBottom: 12 }}
                        >
                          <span
                            style={{
                              padding: '2px 8px',
                              background: '#fc8181',
                              color: 'white',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            错题 {idx + 1}
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              background: '#e6fffa',
                              color: '#00b5d8',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              marginLeft: 6,
                              flexShrink: 0,
                            }}
                          >
                            {q.category}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            color: '#2d3748',
                            fontWeight: 500,
                            lineHeight: 1.7,
                            marginBottom: 12,
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {q.text}
                        </div>
                        <div
                          className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3"
                          style={{ marginBottom: 12 }}
                        >
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = optIdx === q.correctAnswer;
                            const isUser = optIdx === userAnswer;
                            let bg = 'white';
                            let border = '#e2e8f0';
                            let color = '#4a5568';
                            if (isCorrect) {
                              bg = '#f0fff4';
                              border = '#9ae6b4';
                              color = '#22543d';
                            } else if (isUser) {
                              bg = '#fff5f5';
                              border = '#feb2b2';
                              color = '#742a2a';
                            }
                            return (
                              <div
                                key={optIdx}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: 6,
                                  fontSize: 13,
                                  background: bg,
                                  border: `1px solid ${border}`,
                                  color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                }}
                              >
                                <span
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isCorrect ? '#c6f6d5' : 'transparent',
                                  }}
                                >
                                  {optionLabels[optIdx]}
                                </span>
                                <span style={{ flex: 1 }}>{opt}</span>
                                {isCorrect && (
                                  <CheckCircle2
                                    style={{
                                      width: 16,
                                      height: 16,
                                      color: '#38a169',
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div
                          style={{
                            padding: '10px 14px',
                            background: '#fefcbf',
                            borderRadius: 6,
                            fontSize: 13,
                            color: '#744210',
                            lineHeight: 1.6,
                          }}
                        >
                          💡 <strong>解析：</strong>
                          {q.explanation}
                        </div>
                        {userAnswer !== undefined &&
                            userAnswer !== q.correctAnswer && (
                            <div
                              className="mt-2"
                              style={{
                                fontSize: 12,
                                color: '#742a2a',
                              }}
                            >
                              您的答案：
                              <strong>
                                {optionLabels[userAnswer ?? 0]}. {q.options[userAnswer ?? 0]}
                              </strong>
                            </div>
                          )}
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
      <style>{`
        @media (max-width: 768px) {
          [style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
