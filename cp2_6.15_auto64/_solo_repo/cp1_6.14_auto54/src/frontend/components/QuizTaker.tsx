import React, { useState, useEffect, useCallback, useRef } from 'react';
import { paperApi, answerApi } from '../api';
import type { Question, Paper, AnswerRecord } from '../types';

interface QuizTakerProps {
  paperId: string;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const QuizTaker: React.FC<QuizTakerProps> = ({ paperId, onToast }) => {
  const [paper, setPaper] = useState<(Paper & { questions: Question[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentId] = useState(() => `student_${Math.random().toString(36).slice(2, 8)}`);
  const [studentName, setStudentName] = useState('');
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [feedbackMap, setFeedbackMap] = useState<Record<string, { isCorrect: boolean; score: number; loading: boolean; details?: any }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPaper = useCallback(async () => {
    setLoading(true);
    try {
      const data = await paperApi.getById(paperId);
      setPaper(data);
      setTimeLeft(data.duration * 60);
    } catch {
      onToast('加载试卷失败', 'error');
    }
    setLoading(false);
  }, [paperId, onToast]);

  useEffect(() => {
    loadPaper();
  }, [loadPaper]);

  useEffect(() => {
    if (!started || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, submitted]);

  useEffect(() => {
    if (!started || !paper || submitted) return;
    const saveDraft = async () => {
      for (const qId of Object.keys(answers)) {
        const ans = answers[qId];
        if (ans !== undefined && ans !== '') {
          try {
            await answerApi.saveAnswer({
              paperId,
              questionId: qId,
              studentId,
              studentName: studentName || '匿名学生',
              answer: ans,
            });
          } catch {}
        }
      }
    };
    const timeout = setTimeout(saveDraft, 2000);
    return () => clearTimeout(timeout);
  }, [answers, started, paper, submitted, paperId, studentId, studentName]);

  const loadDraft = useCallback(async () => {
    try {
      const drafts = await answerApi.getDraftAnswers(paperId, studentId);
      if (drafts.length > 0) {
        const draftAnswers: Record<string, string | string[]> = {};
        const draftFeedback: Record<string, any> = {};
        for (const d of drafts) {
          draftAnswers[d.questionId] = d.answer;
          draftFeedback[d.questionId] = { isCorrect: d.isCorrect, score: d.score, loading: false };
        }
        setAnswers(draftAnswers);
        setFeedbackMap(draftFeedback);
      }
    } catch {}
  }, [paperId, studentId]);

  useEffect(() => {
    if (started) loadDraft();
  }, [started, loadDraft]);

  const handleStart = () => {
    if (!studentName.trim()) {
      onToast('请输入姓名', 'error');
      return;
    }
    setStartedAt(Date.now());
    setStarted(true);
  };

  const handleChoiceAnswer = async (question: Question, option: string) => {
    let newAnswer: string | string[];
    if (question.type === 'single') {
      newAnswer = option;
    } else {
      const current = (answers[question.id] as string[]) || [];
      newAnswer = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    }
    setAnswers((prev) => ({ ...prev, [question.id]: newAnswer }));

    if (question.type === 'single') {
      setFeedbackMap((prev) => ({ ...prev, [question.id]: { loading: true, isCorrect: false, score: 0 } }));
      try {
        const result = await answerApi.saveAnswer({
          paperId,
          questionId: question.id,
          studentId,
          studentName: studentName || '匿名',
          answer: newAnswer,
        });
        setFeedbackMap((prev) => ({
          ...prev,
          [question.id]: { loading: false, isCorrect: result.isCorrect, score: result.score, details: result.gradeDetails },
        }));
      } catch {
        setFeedbackMap((prev) => ({ ...prev, [question.id]: { loading: false, isCorrect: false, score: 0 } }));
      }
    }
  };

  const handleFillOrEssaySubmit = async (question: Question) => {
    const answer = answers[question.id];
    if (!answer || (typeof answer === 'string' && !answer.trim())) {
      onToast('请先作答', 'error');
      return;
    }
    setFeedbackMap((prev) => ({ ...prev, [question.id]: { loading: true, isCorrect: false, score: 0 } }));
    try {
      const result = await answerApi.saveAnswer({
        paperId,
        questionId: question.id,
        studentId,
        studentName: studentName || '匿名',
        answer: answer,
      });
      setFeedbackMap((prev) => ({
        ...prev,
        [question.id]: { loading: false, isCorrect: result.isCorrect, score: result.score, details: result.gradeDetails },
      }));
    } catch {
      setFeedbackMap((prev) => ({ ...prev, [question.id]: { loading: false, isCorrect: false, score: 0 } }));
    }
  };

  const handleSubmit = async (auto = false) => {
    if (!auto && !confirm('确定提交试卷？提交后不可修改。')) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);
    try {
      const result = await answerApi.submitPaper({
        paperId,
        studentId,
        studentName: studentName || '匿名',
        startedAt,
      });
      setSubmissionResult(result);
      onToast('提交成功！', 'success');
    } catch {
      onToast('提交失败', 'error');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#bdc3c7' }}>加载中...</div>;
  }

  if (!paper) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#e74c3c' }}>试卷不存在</div>;
  }

  if (!started) {
    return (
      <div style={{ maxWidth: 500, margin: '60px auto', background: '#2c3e50', borderRadius: 12, padding: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#ecf0f1', marginBottom: 16 }}>{paper.title}</h2>
        <div style={{ color: '#bdc3c7', marginBottom: 8 }}>题目数量：{paper.questions.length}</div>
        <div style={{ color: '#bdc3c7', marginBottom: 24 }}>考试时长：{paper.duration} 分钟</div>
        <input
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="请输入姓名"
          style={{
            width: '100%',
            background: '#34495e',
            color: '#ecf0f1',
            border: '2px solid transparent',
            borderRadius: 6,
            padding: 10,
            fontSize: 16,
            marginBottom: 20,
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
        />
        <button
          onClick={handleStart}
          style={{
            width: '100%',
            height: 40,
            borderRadius: 8,
            border: 'none',
            background: '#3498db',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s, transform 0.1s',
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseOver={(e) => e.currentTarget.style.background = '#2980b9'}
          onMouseOut={(e) => { e.currentTarget.style.background = '#3498db'; e.currentTarget.style.transform = 'scale(1)'; }}
        >
          开始作答
        </button>
      </div>
    );
  }

  if (submitted && submissionResult) {
    return (
      <div style={{ maxWidth: 500, margin: '60px auto', background: '#2c3e50', borderRadius: 12, padding: 32, textAlign: 'center' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#2ecc71', marginBottom: 16 }}>提交成功</h2>
        <div style={{ fontSize: 48, fontWeight: 700, color: '#3498db', marginBottom: 8 }}>
          {submissionResult.totalScore}
        </div>
        <div style={{ color: '#bdc3c7', marginBottom: 8 }}>总分</div>
        <div style={{ color: '#bdc3c7', marginBottom: 24 }}>
          正确 {submissionResult.answers?.filter((a: any) => a.isCorrect).length || 0} / {submissionResult.totalQuestions}
        </div>
        <div style={{ textAlign: 'left' }}>
          {submissionResult.answers?.map((a: any, i: number) => {
            const q = paper.questions.find((q) => q.id === a.questionId);
            return (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #34495e', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: a.isCorrect ? '#2ecc71' : '#e74c3c', fontSize: 18 }}>{a.isCorrect ? '✓' : '✗'}</span>
                <span style={{ flex: 1, color: '#ecf0f1', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {q?.content || `题目${i + 1}`}
                </span>
                <span style={{ color: '#bdc3c7', fontSize: 14 }}>{a.score}分</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentQuestion = paper.questions[currentQIdx];
  const feedback = feedbackMap[currentQuestion?.id];

  const renderQuestion = (q: Question) => {
    const fb = feedbackMap[q.id];

    if (q.type === 'single') {
      return (
        <div>
          {(q.options || []).map((opt, i) => {
            const isSelected = answers[q.id] === opt;
            let bg = '#34495e';
            if (fb && !fb.loading) {
              if (isSelected && fb.isCorrect) bg = '#2ecc7130';
              else if (isSelected && !fb.isCorrect) bg = '#e74c3c30';
            } else if (isSelected) {
              bg = '#3498db30';
            }
            return (
              <div
                key={i}
                className={fb && !fb.loading && isSelected ? (fb.isCorrect ? 'flash-correct' : 'shake-wrong') : ''}
                onClick={() => handleChoiceAnswer(q, opt)}
                style={{
                  background: bg,
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 8,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #3498db' : '2px solid transparent',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: isSelected ? '2px solid #3498db' : '2px solid #7f8c8d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: isSelected ? '#3498db' : '#7f8c8d',
                  flexShrink: 0,
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span style={{ color: '#ecf0f1', fontSize: 14 }}>{opt}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (q.type === 'multiple') {
      return (
        <div>
          {(q.options || []).map((opt, i) => {
            const selected = (answers[q.id] as string[]) || [];
            const isSelected = selected.includes(opt);
            return (
              <div
                key={i}
                onClick={() => handleChoiceAnswer(q, opt)}
                style={{
                  background: isSelected ? '#3498db30' : '#34495e',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 8,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #3498db' : '2px solid transparent',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  border: isSelected ? '2px solid #3498db' : '2px solid #7f8c8d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: isSelected ? '#3498db' : '#7f8c8d',
                  flexShrink: 0,
                }}>
                  {isSelected ? '✓' : ''}
                </span>
                <span style={{ color: '#ecf0f1', fontSize: 14 }}>{opt}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (q.type === 'fill') {
      return (
        <div>
          <input
            value={(answers[q.id] as string) || ''}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            placeholder="请输入答案"
            style={{
              width: '100%',
              background: '#34495e',
              color: '#ecf0f1',
              border: '2px solid transparent',
              borderRadius: 6,
              padding: 10,
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.15s',
              marginBottom: 12,
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
          />
          <button
            onClick={() => handleFillOrEssaySubmit(q)}
            disabled={fb?.loading}
            style={{
              height: 40,
              borderRadius: 8,
              border: 'none',
              background: '#3498db',
              color: '#fff',
              padding: '0 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: fb?.loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.1s',
            }}
          >
            {fb?.loading ? <span className="spin-icon">⟳</span> : '提交本题'}
          </button>
        </div>
      );
    }

    if (q.type === 'essay') {
      return (
        <div>
          <textarea
            value={(answers[q.id] as string) || ''}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            placeholder="请输入答案"
            rows={6}
            style={{
              width: '100%',
              background: '#34495e',
              color: '#ecf0f1',
              border: '2px solid transparent',
              borderRadius: 6,
              padding: 10,
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.15s',
              marginBottom: 12,
              resize: 'vertical',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
          />
          <button
            onClick={() => handleFillOrEssaySubmit(q)}
            disabled={fb?.loading}
            style={{
              height: 40,
              borderRadius: 8,
              border: 'none',
              background: '#3498db',
              color: '#fff',
              padding: '0 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: fb?.loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.1s',
            }}
          >
            {fb?.loading ? <span className="spin-icon">⟳</span> : '提交本题'}
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <div style={{
        position: 'sticky',
        top: 56,
        background: '#1a252cdd',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '12px 20px',
        borderRadius: 8,
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
      }}>
        <span style={{ fontSize: 14, color: '#bdc3c7' }}>
          {currentQIdx + 1} / {paper.questions.length}
        </span>
        <span style={{
          fontSize: 24,
          fontWeight: 700,
          color: timeLeft < 300 ? '#e74c3c' : '#ecf0f1',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatTime(timeLeft)}
        </span>
        <button
          onClick={() => handleSubmit()}
          style={{
            height: 36,
            borderRadius: 8,
            border: 'none',
            background: '#2ecc71',
            color: '#fff',
            padding: '0 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#27ae60'}
          onMouseOut={(e) => e.currentTarget.style.background = '#2ecc71'}
        >
          交卷
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {paper.questions.map((q, i) => {
          const hasAnswer = answers[q.id] !== undefined && answers[q.id] !== '';
          const fb = feedbackMap[q.id];
          let dotColor = '#7f8c8d';
          if (fb && !fb.loading) dotColor = fb.isCorrect ? '#2ecc71' : '#e74c3c';
          else if (hasAnswer) dotColor = '#3498db';

          return (
            <div
              key={q.id}
              onClick={() => setCurrentQIdx(i)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: i === currentQIdx ? '#3498db' : '#2c3e50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 14,
                color: i === currentQIdx ? '#fff' : '#bdc3c7',
                position: 'relative',
                flexShrink: 0,
                border: `2px solid ${dotColor}`,
                transition: 'all 0.15s',
              }}
            >
              {i + 1}
            </div>
          );
        })}
      </div>

      {currentQuestion && (
        <div style={{ background: '#2c3e50', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <span style={{ background: '#3498db20', color: '#3498db', padding: '2px 10px', borderRadius: 4, fontSize: 13 }}>
              {{ single: '单选', multiple: '多选', fill: '填空', essay: '简答' }[currentQuestion.type]}
            </span>
            <span style={{ background: '{{ easy: "#2ecc71", medium: "#f39c12", hard: "#e74c3c" }[currentQuestion.difficulty]}20', color: { easy: '#2ecc71', medium: '#f39c12', hard: '#e74c3c' }[currentQuestion.difficulty], padding: '2px 10px', borderRadius: 4, fontSize: 13 }}>
              {{ easy: '简单', medium: '中等', hard: '困难' }[currentQuestion.difficulty]}
            </span>
          </div>

          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#ecf0f1', marginBottom: 20, lineHeight: 1.6 }}>
            {currentQIdx + 1}. {currentQuestion.content}
          </h3>

          {renderQuestion(currentQuestion)}

          {feedback && !feedback.loading && (
            <div style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              background: feedback.isCorrect ? '#2ecc7115' : '#e74c3c15',
              border: `1px solid ${feedback.isCorrect ? '#2ecc7140' : '#e74c3c40'}`,
            }}>
              <span style={{ color: feedback.isCorrect ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>
                {feedback.isCorrect ? '✓ 正确' : '✗ 错误'}
              </span>
              <span style={{ color: '#bdc3c7', marginLeft: 12, fontSize: 14 }}>
                得分：{feedback.score}
              </span>
              {feedback.details && feedback.details.matchedKeywords.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 13, color: '#bdc3c7' }}>
                  匹配关键词：{feedback.details.matchedKeywords.join('、')}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button
              onClick={() => setCurrentQIdx(Math.max(0, currentQIdx - 1))}
              disabled={currentQIdx === 0}
              style={{
                height: 40,
                borderRadius: 8,
                border: '1px solid #34495e',
                background: 'transparent',
                color: currentQIdx === 0 ? '#7f8c8d' : '#ecf0f1',
                padding: '0 24px',
                fontSize: 14,
                cursor: currentQIdx === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              上一题
            </button>
            <button
              onClick={() => setCurrentQIdx(Math.min(paper.questions.length - 1, currentQIdx + 1))}
              disabled={currentQIdx === paper.questions.length - 1}
              style={{
                height: 40,
                borderRadius: 8,
                border: 'none',
                background: currentQIdx === paper.questions.length - 1 ? '#7f8c8d' : '#3498db',
                color: '#fff',
                padding: '0 24px',
                fontSize: 14,
                cursor: currentQIdx === paper.questions.length - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              下一题
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
