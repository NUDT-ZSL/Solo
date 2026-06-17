import { Navigate } from 'react-router-dom';
import useExam from '../hooks/useExam';
import './ExamPanel.css';

interface ExamPanelProps {
  subjectId: string;
}

const ExamPanel = ({ subjectId }: ExamPanelProps) => {
  const {
    questions,
    currentIndex,
    answers,
    timeLeft,
    isLoading,
    isSubmitted,
    result,
    subject,
    goToQuestion,
    selectAnswer,
    submitExam,
    formatTime,
  } = useExam(subjectId);

  if (isLoading) {
    return (
      <div className="exam-container">
        <div className="exam-card loading">
          <div className="loading-spinner"></div>
          <p>正在加载题目...</p>
        </div>
      </div>
    );
  }

  if (isSubmitted && result) {
    return <Navigate to={`/result/${result.recordId}`} replace />;
  }

  if (questions.length === 0) {
    return (
      <div className="exam-container">
        <div className="exam-card">
          <p>暂无题目</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const selectedAnswer = answers[currentIndex];
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const answeredCount = answers.filter((a) => a !== null).length;
  const allAnswered = answeredCount === questions.length;

  const handlePrev = () => goToQuestion(currentIndex - 1);
  const handleNext = () => goToQuestion(currentIndex + 1);
  const handleSubmit = () => {
    if (allAnswered || window.confirm('还有题目未作答，确定要提交吗？')) {
      void submitExam();
    }
  };

  return (
    <div className="exam-container">
      <div className="exam-card">
        <div className="exam-header">
          <div className="exam-subject">
            <span className="subject-label">考试科目</span>
            <span className="subject-name">{subject?.name || '未知'}</span>
          </div>
          <div className={`exam-timer ${timeLeft < 300 ? 'warning' : ''}`}>
            <span className="timer-label">剩余时间</span>
            <span className="timer-value monospace">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <div className="exam-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            ></div>
          </div>
          <span className="progress-text">
            已答 {answeredCount}/{questions.length} 题
          </span>
        </div>

        <div className="question-section">
          <div className="question-number">
            第 <span className="current-num">{currentIndex + 1}</span> / {questions.length} 题
          </div>
          <div className="question-text">
            {currentQuestion.text}
          </div>
        </div>

        <div className="options-section">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              className={`option-btn ${selectedAnswer === index ? 'selected' : ''}`}
              onClick={() => selectAnswer(index)}
            >
              <span className="option-label">{String.fromCharCode(65 + index)}</span>
              <span className="option-text">{option}</span>
            </button>
          ))}
        </div>

        <div className="exam-footer">
          <button
            className="btn btn-outline nav-btn"
            onClick={handlePrev}
            disabled={isFirstQuestion}
          >
            上一题
          </button>

          <div className="question-nav">
            {questions.map((_, index) => (
              <button
                key={index}
                className={`nav-dot ${index === currentIndex ? 'current' : ''} ${answers[index] !== null ? 'answered' : ''}`}
                onClick={() => goToQuestion(index)}
                title={`第${index + 1}题`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {isLastQuestion ? (
            <button
              className="btn btn-primary nav-btn submit-btn"
              onClick={handleSubmit}
            >
              提交试卷
            </button>
          ) : (
            <button
              className="btn btn-primary nav-btn"
              onClick={handleNext}
            >
              下一题
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamPanel;
