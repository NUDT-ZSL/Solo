import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface QuestionItem {
  id: string;
  question: string;
  options: [string, string, string, string];
  knowledgeTag: string;
  difficulty: 1 | 2 | 3;
}

export interface AnswerRecord {
  questionId: string;
  userAnswer: number;
  correctAnswer: number;
  correct: boolean;
  timeSpent: number;
  explanation: string;
  knowledgeTag: string;
  difficulty: 1 | 2 | 3;
}

interface QuizPanelProps {
  onComplete: (result: {
    total: number;
    correctCount: number;
    accuracy: number;
    answers: AnswerRecord[];
    wrongQuestions: QuestionItem[];
    byKnowledge: Array<{ tag: string; total: number; correct: number; rate: number }>;
    byDifficulty: Record<number, { total: number; correct: number; rate: number }>;
    weakTags: string[];
    simulatedAvg: { overall: number; byKnowledge: Array<{ tag: string; rate: number }> };
  }) => void;
  onBack: () => void;
  filterTag?: string;
  wrongIds?: string[];
}

const QUIZ_TIME = 30;
const TOTAL_QUESTIONS = 10;

export default function QuizPanel({ onComplete, onBack, filterTag, wrongIds }: QuizPanelProps) {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME);
  const [flipping, setFlipping] = useState(false);
  const [slideAnimKey, setSlideAnimKey] = useState(0);

  const startTimeRef = useRef<number>(Date.now());
  const timerRafRef = useRef<number | null>(null);
  const submittedRef = useRef<Set<string>>(new Set());

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const params = new URLSearchParams();
      if (wrongIds && wrongIds.length) {
        params.append('limit', String(wrongIds.length));
        params.append('tags', wrongIds.map(() => '').join(','));
      } else if (filterTag) {
        params.append('tags', filterTag);
        params.append('limit', String(TOTAL_QUESTIONS));
        params.append('random', 'true');
      } else {
        params.append('balanced', 'true');
        params.append('limit', String(TOTAL_QUESTIONS));
      }
      const res = await fetch(`/api/questions?${params.toString()}`);
      if (!res.ok) throw new Error('加载题目失败');
      const data = await res.json();
      let qs: QuestionItem[] = data.questions || [];
      if (wrongIds && wrongIds.length && qs.length !== wrongIds.length) {
        const res2 = await fetch(`/api/questions?limit=${Math.min(100, TOTAL_QUESTIONS * 3)}&random=true`);
        const fullQs = (await res2.json()).questions || [];
        qs = fullQs.filter((q: QuestionItem) => wrongIds.includes(q.id));
        if (qs.length < wrongIds.length) {
          qs = [...qs, ...fullQs.slice(0, wrongIds.length - qs.length)];
        }
      }
      if (!qs || qs.length === 0) throw new Error('题库为空，请稍后重试');
      setQuestions(qs);
      setCurrentIdx(0);
      setSelected(null);
      setShowFeedback(false);
      setAnswers([]);
      setTimeLeft(QUIZ_TIME);
      startTimeRef.current = Date.now();
      setSlideAnimKey(k => k + 1);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filterTag, wrongIds]);

  useEffect(() => {
    fetchQuestions();
    return () => {
      if (timerRafRef.current) cancelAnimationFrame(timerRafRef.current);
    };
  }, [fetchQuestions]);

  useEffect(() => {
    if (loading || showFeedback || questions.length === 0) {
      if (timerRafRef.current) cancelAnimationFrame(timerRafRef.current);
      return;
    }
    startTimeRef.current = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, QUIZ_TIME - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        handleSubmit(true);
        return;
      }
      timerRafRef.current = requestAnimationFrame(tick);
    };
    timerRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (timerRafRef.current) cancelAnimationFrame(timerRafRef.current);
    };
  }, [loading, currentIdx, questions.length, showFeedback]);

  const handleSubmit = useCallback(async (timedOut = false) => {
    if (currentIdx >= questions.length) return;
    const q = questions[currentIdx];
    if (submittedRef.current.has(q.id)) return;
    submittedRef.current.add(q.id);

    if (timerRafRef.current) cancelAnimationFrame(timerRafRef.current);

    const timeSpent = timedOut ? QUIZ_TIME : Math.min(QUIZ_TIME, (Date.now() - startTimeRef.current) / 1000);
    const userAnswer = timedOut ? -1 : (selected ?? -1);

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: [{ questionId: q.id, userAnswer, timeSpent }],
        }),
      });
      const data = await res.json();
      const r = data.results?.[0];
      const record: AnswerRecord = {
        questionId: q.id,
        userAnswer,
        correctAnswer: r?.correctAnswer ?? -1,
        correct: r?.correct ?? false,
        timeSpent,
        explanation: r?.explanation ?? '',
        knowledgeTag: q.knowledgeTag,
        difficulty: q.difficulty,
      };
      setAnswers(prev => {
        const next = [...prev, record];
        if (next.length === questions.length) {
          setTimeout(() => computeAndComplete(next), 700);
        }
        return next;
      });
      setShowFeedback(true);
    } catch (err) {
      const record: AnswerRecord = {
        questionId: q.id,
        userAnswer,
        correctAnswer: -1,
        correct: false,
        timeSpent,
        explanation: '网络异常，解析暂不可用',
        knowledgeTag: q.knowledgeTag,
        difficulty: q.difficulty,
      };
      setAnswers(prev => {
        const next = [...prev, record];
        if (next.length === questions.length) setTimeout(() => computeAndComplete(next), 700);
        return next;
      });
      setShowFeedback(true);
    }
  }, [currentIdx, questions, selected]);

  const computeAndComplete = useCallback((all: AnswerRecord[]) => {
    const correctCount = all.filter(a => a.correct).length;
    const tagMap: Record<string, { total: number; correct: number }> = {};
    const diffMap: Record<number, { total: number; correct: number; rate: number }> = { 1: { total: 0, correct: 0, rate: 0 }, 2: { total: 0, correct: 0, rate: 0 }, 3: { total: 0, correct: 0, rate: 0 } };
    all.forEach(a => {
      if (!tagMap[a.knowledgeTag]) tagMap[a.knowledgeTag] = { total: 0, correct: 0 };
      tagMap[a.knowledgeTag].total++;
      if (a.correct) tagMap[a.knowledgeTag].correct++;
      diffMap[a.difficulty].total++;
      if (a.correct) diffMap[a.difficulty].correct++;
    });
    const byKnowledge = Object.entries(tagMap).map(([tag, s]) => ({ tag, ...s, rate: s.total > 0 ? s.correct / s.total : 0 }));
    const byDifficulty: Record<number, { total: number; correct: number; rate: number }> = {};
    (Object.keys(diffMap) as unknown as number[]).forEach(k => {
      const key = Number(k);
      byDifficulty[key] = { ...diffMap[key], rate: diffMap[key].total > 0 ? diffMap[key].correct / diffMap[key].total : 0 };
    });
    const weakTags = byKnowledge.filter(s => s.rate < 0.6).sort((a, b) => a.rate - b.rate).map(s => s.tag);
    const wrongQIds = all.filter(a => !a.correct).map(a => a.questionId);
    const wrongQuestions = questions.filter(q => wrongQIds.includes(q.id));
    onComplete({
      total: all.length,
      correctCount,
      accuracy: all.length > 0 ? correctCount / all.length : 0,
      answers: all,
      wrongQuestions,
      byKnowledge,
      byDifficulty,
      weakTags,
      simulatedAvg: {
        overall: 0.68 + Math.random() * 0.08,
        byKnowledge: byKnowledge.map(s => ({ tag: s.tag, rate: 0.52 + Math.random() * 0.32 })),
      },
    });
  }, [questions, onComplete]);

  const handleNext = useCallback(() => {
    if (currentIdx >= questions.length - 1) return;
    setFlipping(true);
    setTimeout(() => {
      setCurrentIdx(i => i + 1);
      setSelected(null);
      setShowFeedback(false);
      setTimeLeft(QUIZ_TIME);
      startTimeRef.current = Date.now();
      setSlideAnimKey(k => k + 1);
      setTimeout(() => setFlipping(false), 60);
    }, 200);
  }, [currentIdx, questions.length]);

  const currentQ = questions[currentIdx];
  const currentAns = answers.find(a => a.questionId === currentQ?.id);
  const timerPercent = (timeLeft / QUIZ_TIME) * 100;
  const isUrgent = timeLeft <= 8;
  const correctCount = answers.filter(a => a.correct).length;

  if (loading) return (
    <div className="card">
      <div className="loading">
        <div className="spinner" />
        <div>正在加载题库...</div>
      </div>
    </div>
  );

  if (loadError) return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <div style={{ fontWeight: 700, color: '#991b1b' }}>加载失败</div>
        <div>{loadError}</div>
        <div className="btn-group" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={onBack}>返回首页</button>
          <button className="btn btn-primary" onClick={fetchQuestions}>重试</button>
        </div>
      </div>
    </div>
  );

  const diffLabel = ['', '初级', '中级', '高级'];

  return (
    <div>
      <div className="card">
        <div className="progress-info">
          <div>
            <span style={{ color: '#64748b' }}>进度：</span>
            <span className="progress-count">{Math.min(currentIdx + 1, questions.length)} / {questions.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {answers.length > 0 && <span className="score-chip">✓ {correctCount} 题</span>}
            {filterTag && <span className="tag-badge">专项: {filterTag}</span>}
            {wrongIds && <span className="tag-badge" style={{ background: '#fef3c7', color: '#92400e' }}>错题重练</span>}
          </div>
        </div>

        <div className="timer-label">
          <span>⏱️ 剩余时间</span>
          <span className={`timer-value ${isUrgent ? 'urgent' : ''}`}>{Math.ceil(timeLeft)}s</span>
        </div>
        <div className="timer-bar">
          <div
            className={`timer-fill ${isUrgent ? 'urgent' : ''}`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      {currentQ && (
        <div key={slideAnimKey} className={`card question-card ${showFeedback && currentAns?.correct ? 'correct-bg' : ''} ${showFeedback && currentAns && !currentAns.correct ? 'error-bg' : ''}`}>
          <div className={`question-inner ${flipping ? 'question-flipping' : ''} slide-enter`}>
            <div className="question-meta">
              <span className="tag-badge">{currentQ.knowledgeTag}</span>
              <span className={`difficulty-badge difficulty-${currentQ.difficulty}`}>难度：{diffLabel[currentQ.difficulty]}</span>
            </div>

            <div className="question-text">{currentIdx + 1}. {currentQ.question}</div>

            <div className="options-list">
              {currentQ.options.map((opt, i) => {
                const isSelected = selected === i;
                let cls = 'option-btn';
                if (showFeedback && currentAns) {
                  if (i === currentAns.correctAnswer) cls += ' correct';
                  else if (i === currentAns.userAnswer && !currentAns.correct) cls += ' wrong';
                } else if (isSelected) {
                  cls += ' selected';
                }
                return (
                  <button
                    key={i}
                    className={cls}
                    disabled={showFeedback}
                    onClick={() => !showFeedback && setSelected(i)}
                    aria-label={`选项${String.fromCharCode(65 + i)}`}
                  >
                    <span className="option-label">{String.fromCharCode(65 + i)}</span>
                    <span style={{ flex: 1 }}>{opt}</span>
                    {showFeedback && currentAns && i === currentAns.correctAnswer && <span>✅</span>}
                    {showFeedback && currentAns && i === currentAns.userAnswer && !currentAns.correct && <span>❌</span>}
                  </button>
                );
              })}
            </div>

            {showFeedback && currentAns && (
              <div style={{ animationDelay: '0.1s' }}>
                <div className={`feedback-header ${currentAns.correct ? '' : ''}`}>
                  <span className="feedback-icon">{currentAns.correct ? '🎉' : '💪'}</span>
                  <span style={{ color: currentAns.correct ? '#059669' : '#dc2626' }}>
                    {currentAns.correct
                      ? '太棒了！答对了！'
                      : currentAns.userAnswer === -1
                        ? '超时啦！下次注意时间～'
                        : '没关系，再接再厉！'}
                  </span>
                </div>
                <div className={`explanation-box ${currentAns.correct ? 'success' : 'error'}`}>
                  <div className="explanation-title">
                    <span>📚 {currentAns.correct ? '知识点解析' : '正确答案 & 解析'}</span>
                  </div>
                  {!currentAns.correct && currentAns.correctAnswer >= 0 && (
                    <div style={{ marginBottom: 8, fontSize: 14, color: '#991b1b', fontWeight: 600 }}>
                      正确答案：{String.fromCharCode(65 + currentAns.correctAnswer)}. {currentQ.options[currentAns.correctAnswer]}
                    </div>
                  )}
                  <div className="explanation-text">{currentAns.explanation}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={onBack}>退出练习</button>
              {!showFeedback ? (
                <button
                  className="btn btn-primary"
                  onClick={() => handleSubmit(false)}
                  disabled={selected === null}
                >
                  {timeLeft <= 0 ? '下一题' : '提交答案'}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleNext}
                  disabled={currentIdx >= questions.length - 1}
                >
                  {currentIdx >= questions.length - 1 ? '完成练习 🎯' : '下一题 →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
