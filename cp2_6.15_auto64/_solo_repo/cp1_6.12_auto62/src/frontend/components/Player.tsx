import React from 'react';

interface QuizData {
  id: string;
  videoId: string;
  timePoint: number;
  question: string;
  options: string[];
  correctIndex: number;
  subtitleText: string;
}

interface AnswerResult {
  quizId: string;
  selectedIndex: number;
  isCorrect: boolean;
  answerTime: number;
}

interface PlayerProps {
  videoId: string;
  onBack: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function Player({ videoId, onBack }: PlayerProps) {
  const [quizzes, setQuizzes] = React.useState<QuizData[]>([]);
  const [activeQuiz, setActiveQuiz] = React.useState<QuizData | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [answers, setAnswers] = React.useState<AnswerResult[]>([]);
  const [showResults, setShowResults] = React.useState(false);
  const [quizVisible, setQuizVisible] = React.useState(false);
  const [answeredQuizIds, setAnsweredQuizIds] = React.useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const quizStartTimeRef = React.useRef<number>(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const animationRef = React.useRef<number>(0);
  const checkedPointsRef = React.useRef<Set<number>>(new Set());

  const studentId = React.useMemo(() => `student_${Math.random().toString(36).substring(2, 8)}`, []);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const res = await fetch(`/api/videos/${videoId}/quizzes`);
        const data = await res.json();
        setQuizzes(data);
      } catch {
        console.error('Failed to load quizzes');
      } finally {
        setLoading(false);
      }
    };
    loadQuizzes();
  }, [videoId]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || quizzes.length === 0) return;

    const checkTimePoints = () => {
      const currentTime = video.currentTime;
      for (const quiz of quizzes) {
        if (answeredQuizIds.has(quiz.id)) continue;
        if (checkedPointsRef.current.has(quiz.id)) continue;

        if (currentTime >= quiz.timePoint && currentTime < quiz.timePoint + 1) {
          checkedPointsRef.current.add(quiz.id);
          video.pause();
          setActiveQuiz(quiz);
          setQuizVisible(true);
          quizStartTimeRef.current = Date.now();
          break;
        }
      }
      animationRef.current = requestAnimationFrame(checkTimePoints);
    };

    video.addEventListener('play', () => {
      animationRef.current = requestAnimationFrame(checkTimePoints);
    });

    video.addEventListener('pause', () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    });

    video.addEventListener('ended', () => {
      if (answers.length > 0) {
        setTimeout(() => setShowResults(true), 500);
      }
    });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [quizzes, answeredQuizIds, answers.length]);

  const handleAnswer = async (index: number) => {
    if (!activeQuiz || selectedIndex !== null) return;

    setSelectedIndex(index);
    setShowFeedback(true);

    const answerTime = (Date.now() - quizStartTimeRef.current) / 1000;
    const isCorrect = index === activeQuiz.correctIndex;

    const result: AnswerResult = {
      quizId: activeQuiz.id,
      selectedIndex: index,
      isCorrect,
      answerTime,
    };

    setAnswers(prev => [...prev, result]);
    setAnsweredQuizIds(prev => new Set([...prev, activeQuiz.id]));

    try {
      await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: activeQuiz.id,
          videoId,
          studentId,
          selectedIndex: index,
          isCorrect,
          answerTime,
        }),
      });
    } catch {
      console.error('Failed to submit answer');
    }

    setTimeout(() => {
      setShowFeedback(false);
      setSelectedIndex(null);
      setActiveQuiz(null);
      setQuizVisible(false);
      if (videoRef.current) {
        videoRef.current.play();
      }
    }, 1500);
  };

  const handleJumpToTime = (timePoint: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timePoint;
      videoRef.current.play();
      setShowResults(false);
    }
  };

  const correctCount = answers.filter(a => a.isCorrect).length;
  const totalTime = answers.reduce((sum, a) => sum + a.answerTime, 0);
  const wrongAnswers = answers.filter(a => !a.isCorrect);
  const correctRate = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 56px)', color: '#a0aec0' }}>
        加载中...
      </div>
    );
  }

  return (
    <div className="player-page">
      <style>{`
        .player-page {
          display: flex;
          height: calc(100vh - 56px);
          overflow: hidden;
          position: relative;
        }

        .player-video-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          padding-right: 16px;
        }

        .player-video-container {
          width: 100%;
          max-width: 960px;
          aspect-ratio: 16/9;
          background: #000;
          border-radius: var(--radius);
          overflow: hidden;
          position: relative;
        }

        .player-video-container video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .player-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 15px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
        }

        .quiz-sidebar {
          width: 320px;
          min-width: 320px;
          background: var(--bg-secondary);
          border-left: 1px solid var(--border-color);
          position: relative;
          overflow: hidden;
        }

        .quiz-card {
          padding: 24px 20px;
          transform: translateX(100%);
          opacity: 0;
          transition: transform 0.2s ease, opacity 0.2s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(0,0,0,0.5);
        }

        .quiz-card.visible {
          transform: translateX(0);
          opacity: 1;
        }

        .quiz-card-header {
          margin-bottom: 16px;
        }

        .quiz-card-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent-blue);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .quiz-card-question {
          font-size: 16px;
          font-weight: 600;
          line-height: 1.5;
        }

        .quiz-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
          overflow-y: auto;
        }

        .quiz-option-btn {
          padding: 14px 18px;
          border: 2px solid var(--border-color);
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          color: var(--text-primary);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .quiz-option-btn:hover:not(:disabled) {
          border-color: var(--accent-blue);
          background: rgba(59,130,246,0.08);
        }

        .quiz-option-btn:disabled {
          cursor: default;
        }

        .quiz-option-btn.selected-correct {
          border-color: var(--accent-green);
          background: rgba(34,197,94,0.15);
          animation: flashGreen 0.5s ease;
        }

        .quiz-option-btn.selected-wrong {
          border-color: var(--accent-red);
          background: rgba(239,68,68,0.15);
          animation: flashRed 0.5s ease;
        }

        .quiz-option-btn.reveal-correct {
          border-color: var(--accent-green);
          background: rgba(34,197,94,0.08);
        }

        @keyframes flashGreen {
          0%, 100% { background: rgba(34,197,94,0.15); }
          50% { background: rgba(34,197,94,0.35); }
        }

        @keyframes flashRed {
          0%, 100% { background: rgba(239,68,68,0.15); }
          50% { background: rgba(239,68,68,0.35); }
        }

        .option-letter {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          flex-shrink: 0;
          transition: transform 0.15s;
        }

        .quiz-option-btn:hover:not(:disabled) .option-letter {
          transform: scale(1.1);
        }

        .quiz-option-btn.selected-correct .option-letter {
          background: var(--accent-green);
          color: #fff;
        }

        .quiz-option-btn.selected-wrong .option-letter {
          background: var(--accent-red);
          color: #fff;
        }

        .quiz-feedback {
          margin-top: 16px;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          text-align: center;
        }

        .feedback-correct { background: rgba(34,197,94,0.15); color: var(--accent-green); }
        .feedback-wrong { background: rgba(239,68,68,0.15); color: var(--accent-red); }

        .no-quiz-placeholder {
          padding: 40px 20px;
          text-align: center;
          color: var(--text-secondary);
        }

        .no-quiz-icon { font-size: 48px; margin-bottom: 12px; }
        .no-quiz-text { font-size: 14px; line-height: 1.6; }

        .progress-bar {
          padding: 12px 20px;
          border-top: 1px solid var(--border-color);
          background: rgba(0,0,0,0.2);
        }

        .progress-label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
        }

        .progress-track {
          height: 4px;
          background: var(--border-color);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--accent-blue);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .results-overlay {
          position: fixed;
          top: 56px;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(26,35,50,0.95);
          z-index: 1500;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .results-card {
          background: var(--bg-card);
          border-radius: 16px;
          padding: 32px 36px;
          width: 600px;
          max-width: 95vw;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 8px 40px rgba(0,0,0,0.4);
        }

        .results-card h2 {
          font-size: 22px;
          color: var(--text-dark);
          margin-bottom: 24px;
          text-align: center;
        }

        .results-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }

        .result-stat {
          text-align: center;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .result-stat-value {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .result-stat-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }

        .wrong-list h3 {
          font-size: 15px;
          color: var(--text-dark);
          margin-bottom: 12px;
          font-weight: 600;
        }

        .wrong-item {
          padding: 12px 16px;
          background: #fef2f2;
          border-radius: 8px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .wrong-item-text {
          font-size: 13px;
          color: #991b1b;
          flex: 1;
        }

        .wrong-item-jump {
          padding: 4px 12px;
          border-radius: 6px;
          background: var(--accent-blue);
          color: #fff;
          border: none;
          font-size: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: opacity 0.15s;
        }

        .wrong-item-jump:hover { opacity: 0.85; }

        .results-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 24px;
        }

        .player-back-btn {
          position: absolute;
          top: 16px;
          left: 16px;
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(0,0,0,0.5);
          color: #fff;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          z-index: 10;
          transition: background 0.15s;
        }

        .player-back-btn:hover { background: rgba(0,0,0,0.7); }

        @media (max-width: 768px) {
          .player-page { flex-direction: column; }

          .player-video-area {
            padding: 12px;
            padding-bottom: 0;
          }

          .quiz-sidebar {
            position: fixed;
            top: 56px;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            min-width: unset;
            z-index: 500;
            display: none;
          }

          .quiz-sidebar.mobile-visible {
            display: block;
          }

          .quiz-card {
            width: 100%;
          }
        }
      `}</style>

      <div className="player-video-area">
        <button className="player-back-btn" onClick={onBack}>← 返回编辑</button>
        <div className="player-video-container">
          <video
            ref={videoRef}
            controls
            preload="metadata"
          >
            <source src={`/api/video-file/${videoId}`} type="video/mp4" />
            您的浏览器不支持视频播放
          </video>
        </div>
      </div>

      <div className={`quiz-sidebar ${(quizVisible && activeQuiz) || isMobile ? 'mobile-visible' : ''}`}>
        {activeQuiz && quizVisible ? (
          <div className={`quiz-card ${quizVisible ? 'visible' : ''}`}>
            <div className="quiz-card-header">
              <div className="quiz-card-label">答题时间</div>
              <div className="quiz-card-question">{activeQuiz.question}</div>
            </div>
            <div className="quiz-options">
              {activeQuiz.options.map((opt, i) => {
                let btnClass = 'quiz-option-btn';
                if (showFeedback && selectedIndex === i) {
                  btnClass += i === activeQuiz.correctIndex ? ' selected-correct' : ' selected-wrong';
                } else if (showFeedback && i === activeQuiz.correctIndex && selectedIndex !== i) {
                  btnClass += ' reveal-correct';
                }
                return (
                  <button
                    key={i}
                    className={btnClass}
                    onClick={() => handleAnswer(i)}
                    disabled={selectedIndex !== null}
                  >
                    <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            {showFeedback && (
              <div className={`quiz-feedback ${selectedIndex === activeQuiz.correctIndex ? 'feedback-correct' : 'feedback-wrong'}`}>
                {selectedIndex === activeQuiz.correctIndex ? '✓ 回答正确！' : '✗ 回答错误'}
              </div>
            )}
          </div>
        ) : (
          <div className="no-quiz-placeholder">
            <div className="no-quiz-icon">📝</div>
            <div className="no-quiz-text">
              视频播放到标记点时<br/>将自动弹出题目
            </div>
            {quizzes.length > 0 && (
              <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b' }}>
                共 {quizzes.length} 道题目等待回答
              </div>
            )}
          </div>
        )}

        {quizzes.length > 0 && (
          <div className="progress-bar">
            <div className="progress-label">
              <span>答题进度</span>
              <span>{answers.length} / {quizzes.length}</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${quizzes.length > 0 ? (answers.length / quizzes.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {showResults && (
        <div className="results-overlay" onClick={() => setShowResults(false)}>
          <div className="results-card" onClick={e => e.stopPropagation()}>
            <h2>📊 答题统计</h2>
            <div className="results-summary">
              <div className="result-stat">
                <div className="result-stat-value" style={{ color: correctRate >= 70 ? '#22c55e' : correctRate >= 40 ? '#f59e0b' : '#ef4444' }}>
                  {correctRate}%
                </div>
                <div className="result-stat-label">正确率</div>
              </div>
              <div className="result-stat">
                <div className="result-stat-value" style={{ color: '#3b82f6' }}>{correctCount}/{answers.length}</div>
                <div className="result-stat-label">正确/总题数</div>
              </div>
              <div className="result-stat">
                <div className="result-stat-value" style={{ color: '#8b5cf6' }}>{totalTime.toFixed(1)}s</div>
                <div className="result-stat-label">总用时</div>
              </div>
            </div>

            {wrongAnswers.length > 0 && (
              <div className="wrong-list">
                <h3>❌ 错题列表 ({wrongAnswers.length})</h3>
                {wrongAnswers.map(wa => {
                  const quiz = quizzes.find(q => q.id === wa.quizId);
                  if (!quiz) return null;
                  return (
                    <div key={wa.quizId} className="wrong-item">
                      <span className="wrong-item-text">
                        {quiz.question.substring(0, 40)}...
                      </span>
                      <button className="wrong-item-jump" onClick={() => handleJumpToTime(quiz.timePoint)}>
                        ⏱ {formatTime(quiz.timePoint)}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="results-actions">
              <button className="btn btn-secondary" onClick={() => setShowResults(false)}>继续观看</button>
              <button className="btn btn-primary" onClick={onBack}>返回编辑</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
