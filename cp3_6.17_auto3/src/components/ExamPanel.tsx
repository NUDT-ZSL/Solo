import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExam } from '../hooks/useExam';
import { formatTime } from '../utils/helpers';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

interface RippleData {
  id: number;
  x: number;
  y: number;
}

export default function ExamPanel() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { state, startExam, selectAnswer, goToQuestion, submitExam } = useExam();
  const [ripples, setRipples] = useState<Record<string, RippleData[]>>({});
  const rippleIdRef = useRef(0);
  const hasStartedRef = useRef(false);
  const autoSubmitRef = useRef(false);

  useEffect(() => {
    if (subjectId && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startExam(subjectId);
    }
  }, [subjectId, startExam]);

  const handleRipple = useCallback(
    (questionId: string, optionIndex: number, e: React.MouseEvent<HTMLButtonElement>) => {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const rippleId = rippleIdRef.current++;
      const ripple: RippleData = { id: rippleId, x, y };

      const key = `${questionId}-${optionIndex}`;
      setRipples((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), ripple],
      }));

      setTimeout(() => {
        setRipples((prev) => ({
          ...prev,
          [key]: (prev[key] || []).filter((r) => r.id !== rippleId),
        }));
      }, 500);
    },
    []
  );

  const handleSelectOption = useCallback(
    (questionId: string, optionIndex: number, e: React.MouseEvent<HTMLButtonElement>) => {
      handleRipple(questionId, optionIndex, e);
      selectAnswer(questionId, optionIndex);
    },
    [handleRipple, selectAnswer]
  );

  const handleSubmit = useCallback(async () => {
    if (!subjectId || autoSubmitRef.current) return;
    const result = await submitExam(subjectId);
    if (result) {
      navigate(`/result/${result.id}`);
    }
  }, [subjectId, submitExam, navigate]);

  useEffect(() => {
    if (state.status === 'in_progress' && state.timeRemaining === 0 && !autoSubmitRef.current) {
      autoSubmitRef.current = true;
      handleSubmit();
    }
  }, [state.timeRemaining, state.status, handleSubmit]);

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div style={{ padding: 120, textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ marginTop: 16, color: '#718096' }}>正在加载题目...</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div style={{ padding: 120, textAlign: 'center' }}>
        <p style={{ color: 'var(--color-red)', fontSize: 18 }}>{state.error}</p>
        <button className="btn btn-outline" style={{ marginTop: 16, padding: '0 24px' }} onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    );
  }

  if (state.status === 'submitting') {
    return (
      <div style={{ padding: 120, textAlign: 'center' }}>
        <div className="spinner" />
        <p style={{ marginTop: 16, color: '#718096' }}>正在提交试卷并评分...</p>
      </div>
    );
  }

  const { questions, currentIndex, answers, timeRemaining } = state;
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const answeredCount = Object.keys(answers).length;
  const isLast = currentIndex === totalQuestions - 1;
  const isFirst = currentIndex === 0;
  const isLowTime = timeRemaining <= 300;

  if (!currentQuestion) {
    return (
      <div style={{ padding: 120, textAlign: 'center' }}>
        <p style={{ color: '#718096' }}>没有可用的题目</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <nav className="top-nav">
        <div className="nav-logo" onClick={() => navigate('/')}>
          📝 模考通
        </div>
        <div className="nav-links">
          <span
            className="nav-link"
            style={{ color: 'var(--color-red)' }}
            onClick={() => {
              if (confirm('确定要退出考试吗？已作答的内容将不会保存。')) {
                navigate('/');
              }
            }}
          >
            退出考试
          </span>
        </div>
      </nav>

      <div className="exam-container">
        <div
          className="card"
          style={{
            padding: '20px 28px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 14, color: '#a0aec0', fontWeight: 500, marginBottom: 6 }}>
              题目进度
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-primary)' }}>
                {currentIndex + 1}
              </span>
              <span style={{ fontSize: 18, color: '#a0aec0', fontWeight: 500 }}>
                / {totalQuestions}
              </span>
            </div>
            <div className="progress-track" style={{ width: 200, marginTop: 10 }}>
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, color: '#a0aec0', fontWeight: 500, marginBottom: 6 }}>
              剩余时间
            </div>
            <div
              className="mono-red"
              style={{
                fontSize: 32,
                fontWeight: 700,
                animation: isLowTime ? 'pulse 1s ease-in-out infinite' : 'none',
              }}
            >
              {formatTime(timeRemaining)}
            </div>
            <div style={{ fontSize: 13, color: '#a0aec0', marginTop: 4 }}>
              已答 {answeredCount} / {totalQuestions}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>

        <div className="card slide-in" key={currentQuestion.id} style={{ padding: '28px 32px', marginBottom: 16 }}>
          <div
            style={{
              display: 'inline-block',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-primary)',
              background: '#ebf8ff',
              padding: '3px 10px',
              borderRadius: 4,
              marginBottom: 16,
            }}
          >
            单选题
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#2d3748',
              lineHeight: 1.7,
              margin: '0 0 24px',
            }}
          >
            {currentQuestion.text}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {currentQuestion.options.map((option, index) => {
              const isSelected = answers[currentQuestion.id] === index;
              const rippleKey = `${currentQuestion.id}-${index}`;
              const currentRipples = ripples[rippleKey] || [];

              return (
                <button
                  key={index}
                  className={`option-btn ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => handleSelectOption(currentQuestion.id, index, e)}
                >
                  <span className="option-label">{OPTION_LABELS[index]}</span>
                  <span style={{ flex: 1, position: 'relative', zIndex: 1 }}>{option}</span>
                  {currentRipples.map((r) => (
                    <span
                      key={r.id}
                      className="ripple"
                      style={{
                        left: r.x,
                        top: r.y,
                        width: 60,
                        height: 60,
                      }}
                    />
                  ))}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <button
            className="btn btn-outline"
            style={{ flex: '0 0 140px' }}
            disabled={isFirst}
            onClick={() => goToQuestion(currentIndex - 1)}
          >
            ← 上一题
          </button>

          <button
            className="btn btn-primary"
            style={{ flex: 1, maxWidth: 220 }}
            onClick={handleSubmit}
          >
            {answeredCount === totalQuestions ? '提交试卷' : `提交 (${answeredCount}/${totalQuestions})`}
          </button>

          <button
            className="btn btn-outline"
            style={{ flex: '0 0 140px' }}
            disabled={isLast}
            onClick={() => goToQuestion(currentIndex + 1)}
          >
            下一题 →
          </button>
        </div>
      </div>
    </div>
  );
}
