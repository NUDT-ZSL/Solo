import React from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import useExam from '../hooks/useExam';

export default function ExamPanel({ examineeId }: { examineeId: string }) {
  const [searchParams] = useSearchParams();
  const subject = searchParams.get('subject') || 'Java基础';
  const navigate = useNavigate();
  const {
    questions,
    currentIndex,
    answers,
    timeLeft,
    isFinished,
    result,
    loading,
    error,
    selectAnswer,
    goToNext,
    goToPrev,
    goToToIndex,
    submitExam,
    currentQuestion,
  } = useExam(subject, examineeId);

  const [showConfirm, setShowConfirm] = React.useState(false);
  const [activeBtn, setActiveBtn] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isFinished && result) {
      navigate('/result', { state: { result, subject } });
    }
  }, [isFinished, result, navigate, subject]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;

  const handleBtnDown = (id: string) => setActiveBtn(id);
  const handleBtnUp = () => setActiveBtn(null);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <p style={{ color: '#e53e3e' }}>{error}</p>
          <Link to="/" style={{ color: '#3182ce', marginTop: 12, display: 'inline-block' }}>返回首页</Link>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.subjectTag}>{subject}</div>
          <div style={styles.timer}>{formatTime(timeLeft)}</div>
          <div style={styles.progress}>{answeredCount}/{totalQuestions} 已答</div>
        </div>

        <div style={styles.progressBar}>
          <div style={{
            ...styles.progressFill,
            width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
          }} />
        </div>

        <div style={styles.questionCard}>
          <div style={styles.questionIndex}>
            {currentIndex + 1}/{totalQuestions}
          </div>
          <div style={styles.questionText}>{currentQuestion.question}</div>

          <div style={styles.optionsList}>
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = answers[currentQuestion.id] === idx;
              const btnId = `opt-${idx}`;
              return (
                <button
                  key={idx}
                  onClick={() => selectAnswer(currentQuestion.id, idx)}
                  onMouseDown={() => handleBtnDown(btnId)}
                  onMouseUp={handleBtnUp}
                  onMouseLeave={handleBtnUp}
                  onTouchStart={() => handleBtnDown(btnId)}
                  onTouchEnd={handleBtnUp}
                  style={{
                    ...styles.optionBtn,
                    background: isSelected ? '#3182ce' : '#fff',
                    color: isSelected ? '#fff' : '#2d3748',
                    border: isSelected ? '2px solid #3182ce' : '2px solid #e2e8f0',
                    transform: activeBtn === btnId ? 'scale(0.97)' : 'scale(1)',
                  }}
                >
                  <span style={styles.optionLabel}>{optionLabels[idx]}</span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={styles.navRow}>
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            onMouseDown={() => handleBtnDown('prev')}
            onMouseUp={handleBtnUp}
            onMouseLeave={handleBtnUp}
            style={{
              ...styles.navBtn,
              opacity: currentIndex === 0 ? 0.4 : 1,
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              transform: activeBtn === 'prev' ? 'scale(0.97)' : 'scale(1)',
            }}
          >
            上一题
          </button>

          <div style={styles.dotRow}>
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => { goToToIndex(i); }}
                style={{
                  ...styles.dot,
                  background: i === currentIndex ? '#3182ce' : answers[questions[i].id] !== undefined ? '#00b5d8' : '#e2e8f0',
                }}
              />
            ))}
          </div>

          {currentIndex < totalQuestions - 1 ? (
            <button
              onClick={goToNext}
              onMouseDown={() => handleBtnDown('next')}
              onMouseUp={handleBtnUp}
              onMouseLeave={handleBtnUp}
              style={{
                ...styles.navBtn,
                transform: activeBtn === 'next' ? 'scale(0.97)' : 'scale(1)',
              }}
            >
              下一题
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              onMouseDown={() => handleBtnDown('submit')}
              onMouseUp={handleBtnUp}
              onMouseLeave={handleBtnUp}
              style={{
                ...styles.navBtn,
                ...styles.submitBtn,
                transform: activeBtn === 'submit' ? 'scale(0.97)' : 'scale(1)',
              }}
            >
              交卷
            </button>
          )}
        </div>
      </div>

      {showConfirm && (
        <div style={styles.overlay} onClick={() => setShowConfirm(false)}>
          <div style={styles.confirmCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#2d3748', marginBottom: 12 }}>确认交卷？</h3>
            <p style={{ color: '#718096', fontSize: 14, marginBottom: 24 }}>
              已答 {answeredCount}/{totalQuestions} 题
              {answeredCount < totalQuestions && `，还有 ${totalQuestions - answeredCount} 题未作答`}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setShowConfirm(false)} style={styles.cancelBtn}>继续答题</button>
              <button onClick={() => { setShowConfirm(false); submitExam(); }} style={styles.confirmBtn}>确认交卷</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  center: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '20px 16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectTag: {
    background: '#ebf8ff',
    color: '#3182ce',
    padding: '4px 14px',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 600,
  },
  timer: {
    fontFamily: 'monospace',
    color: '#e53e3e',
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: 2,
  },
  progress: {
    color: '#718096',
    fontSize: 14,
  },
  progressBar: {
    height: 4,
    background: '#e2e8f0',
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3182ce, #00b5d8)',
    borderRadius: 2,
    transition: 'width 0.2s ease',
  },
  questionCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '28px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: 20,
  },
  questionIndex: {
    color: '#a0aec0',
    fontSize: 13,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 17,
    color: '#2d3748',
    lineHeight: 1.7,
    marginBottom: 24,
    whiteSpace: 'pre-wrap' as const,
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  optionBtn: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 16px',
    fontSize: 15,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left' as const,
    outline: 'none',
  },
  optionLabel: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    background: 'rgba(0,0,0,0.05)',
    flexShrink: 0,
  },
  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap' as const,
  },
  navBtn: {
    padding: '10px 28px',
    borderRadius: 8,
    border: '2px solid #3182ce',
    background: '#fff',
    color: '#3182ce',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  },
  submitBtn: {
    background: '#3182ce',
    color: '#fff',
  },
  dotRow: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    maxWidth: 400,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.2s',
  },
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  confirmCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '32px 28px',
    maxWidth: 360,
    width: '90%',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    textAlign: 'center' as const,
  },
  cancelBtn: {
    padding: '10px 24px',
    borderRadius: 8,
    border: '2px solid #e2e8f0',
    background: '#fff',
    color: '#718096',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  },
  confirmBtn: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    background: '#3182ce',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  },
};
