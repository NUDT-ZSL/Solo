import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Question } from '../types';
import { useExam } from '../hooks/useExam';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function ExamPanel() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { state, startExam, selectAnswer, nextQuestion, prevQuestion, finishExam, resetExam, goToQuestion } = useExam();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`/api/questions?subject=${subjectId}`);
        const questions: Question[] = await response.json();
        startExam(questions);
        setLoading(false);
      } catch (error) {
        console.error('获取题目失败:', error);
        setLoading(false);
      }
    };

    fetchQuestions();

    return () => {
      resetExam();
    };
  }, [subjectId, startExam, resetExam]);

  useEffect(() => {
    if (state.isFinished && state.result) {
      navigate(`/result/${state.result.id}`);
    }
  }, [state.isFinished, state.result, navigate]);

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: '18px', color: '#4a5568' }}>正在加载题目...</div>
      </div>
    );
  }

  if (!state.isStarted || state.questions.length === 0) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: '18px', color: '#4a5568' }}>未找到考试信息</div>
      </div>
    );
  }

  const currentQuestion = state.questions[state.currentIndex];
  const selectedAnswer = state.answers.get(currentQuestion.id);
  const answeredCount = state.answers.size;
  const allAnswered = answeredCount === state.questions.length;

  return (
    <div className="container">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '16px', fontWeight: 500, color: '#2d3748' }}>
              题目 {state.currentIndex + 1} / {state.questions.length}
            </div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '24px',
                fontWeight: 600,
                color: '#e53e3e',
              }}
            >
              {formatTime(state.timeRemaining)}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '18px', lineHeight: 1.6, color: '#2d3748', marginBottom: '20px' }}>
              {currentQuestion.text}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  className={`option-btn ${selectedAnswer === index ? 'selected' : ''}`}
                  onClick={() => selectAnswer(currentQuestion.id, index)}
                >
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: selectedAnswer === index ? 'white' : '#e2e8f0',
                      color: selectedAnswer === index ? '#3182ce' : '#4a5568',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={prevQuestion}
              disabled={state.currentIndex === 0}
            >
              上一题
            </button>

            <div style={{ fontSize: '14px', color: '#718096' }}>
              已答 {answeredCount} / {state.questions.length} 题
            </div>

            {state.currentIndex === state.questions.length - 1 ? (
              <button
                className="btn btn-secondary"
                onClick={finishExam}
                disabled={!allAnswered}
              >
                提交试卷
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={nextQuestion}
              >
                下一题
              </button>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#4a5568', marginBottom: '12px' }}>
            答题进度
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {state.questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => goToQuestion(index)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: state.answers.has(q.id) ? '#3182ce' : '#e2e8f0',
                  color: state.answers.has(q.id) ? 'white' : '#4a5568',
                  transition: 'all 0.2s ease',
                }}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
