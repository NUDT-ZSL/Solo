import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, RecommendedDrink } from '../types';
import { getQuestions, recommendDrink, getRecommendationReason } from '../logic/flavorRecommend';
import { addFavorite, getFavorites } from '../logic/unlockLogic';
import { HiddenMenu } from '../types';
import './FlavorExplore.css';

interface FlavorExploreProps {
  user: User;
  showToast: (msg: string) => void;
}

const FlavorExplore: React.FC<FlavorExploreProps> = ({ user, showToast }) => {
  const navigate = useNavigate();
  const questions = getQuestions();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([null, null, null]);
  const [result, setResult] = useState<RecommendedDrink | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isAnimating, setIsAnimating] = useState(false);
  const [favorited, setFavorited] = useState(false);

  const handleSelect = (answer: string) => {
    if (isAnimating) return;
    const newAnswers = [...answers];
    newAnswers[currentStep] = answer;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (isAnimating || answers[currentStep] === null) return;
    if (currentStep < questions.length - 1) {
      setSlideDirection('left');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      const answerMap: Record<string, string> = {};
      questions.forEach((q, i) => {
        const key = q.id === 1 ? 'region' : q.id === 2 ? 'roast' : 'brew';
        answerMap[key] = answers[i] || '';
      });
      const recommended = recommendDrink(answerMap as any);
      setResult(recommended);
      const favs = getFavorites(user.id);
      setFavorited(favs.some((f) => f.id === 'rec_' + recommended.id));
    }
  };

  const handlePrev = () => {
    if (isAnimating || currentStep === 0) return;
    setSlideDirection('right');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => prev - 1);
      setIsAnimating(false);
    }, 300);
  };

  const handleFavorite = () => {
    if (!result) return;
    const menu: HiddenMenu = {
      id: 'rec_' + result.id,
      name: result.name,
      story: result.desc,
      imageSvg: ''
    };
    const ok = addFavorite(user.id, menu);
    if (ok) {
      setFavorited(true);
      showToast('已加入收藏！');
    } else {
      showToast('已经收藏过了');
    }
  };

  const handleRestart = () => {
    setAnswers([null, null, null]);
    setResult(null);
    setCurrentStep(0);
    setFavorited(false);
  };

  const getReason = () => {
    if (!result) return '';
    const answerMap: Record<string, string> = {};
    questions.forEach((q, i) => {
      const key = q.id === 1 ? 'region' : q.id === 2 ? 'roast' : 'brew';
      answerMap[key] = answers[i] || '';
    });
    return getRecommendationReason(answerMap as any);
  };

  return (
    <div className="page-container explore-page">
      <div className="page-content">
        <h1 className="page-title">发现你的本命咖啡</h1>
        <p className="explore-subtitle">回答3个小问题，找到最适合你的那一杯</p>

        {!result ? (
          <>
            <div className="progress-dots">
              {questions.map((_, i) => (
                <span
                  key={i}
                  className={`progress-dot ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'active' : ''}`}
                />
              ))}
            </div>

            <div className="question-slider">
              <div
                className="question-track"
                style={{
                  transform: `translateX(-${currentStep * 100}%)`,
                  transition: isAnimating ? 'transform 0.3s ease-out' : 'none'
                }}
              >
                {questions.map((q, idx) => (
                  <div key={q.id} className="question-slide">
                    <div className="question-illustration">
                      <svg viewBox="0 0 160 160" width="130" height="130">
                        <defs>
                          <linearGradient id={`qbg-${q.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#BCAAA4" />
                            <stop offset="100%" stopColor="#8D6E63" />
                          </linearGradient>
                        </defs>
                        <circle cx="80" cy="80" r="65" fill={`url(#qbg-${q.id})`} opacity="0.4" />
                        <path
                          d="M45 55h70c0 32-16 50-35 50S45 87 45 55z"
                          fill="#5D4037"
                          stroke="#3E2723"
                          strokeWidth="2.5"
                        />
                        <ellipse cx="80" cy="55" rx="35" ry="6" fill="#3E2723" />
                        <path
                          d="M115 59c9 2 15 13 15 26s-6 24-15 26"
                          fill="none"
                          stroke="#3E2723"
                          strokeWidth="2.5"
                        />
                        <ellipse cx="80" cy="55" rx="26" ry="4.5" fill="#FF8A65" opacity="0.8" />
                        {q.id === 1 && (
                          <>
                            <circle cx="55" cy="30" r="8" fill="#E57373" opacity="0.7" />
                            <circle cx="100" cy="25" r="6" fill="#FFB74D" opacity="0.8" />
                            <circle cx="75" cy="20" r="5" fill="#81C784" opacity="0.7" />
                          </>
                        )}
                        {q.id === 2 && (
                          <>
                            <circle cx="60" cy="100" r="4" fill="#FFE0B2" opacity="0.6" />
                            <circle cx="95" cy="105" r="3" fill="#FFE0B2" opacity="0.5" />
                            <circle cx="75" cy="110" r="3.5" fill="#FFE0B2" opacity="0.7" />
                          </>
                        )}
                        {q.id === 3 && (
                          <>
                            <path d="M65 35c2-8 9-8 11 0" stroke="#FFE0B2" strokeWidth="2" fill="none" />
                            <path d="M78 30c2-8 9-8 11 0" stroke="#FFE0B2" strokeWidth="2" fill="none" />
                          </>
                        )}
                      </svg>
                    </div>
                    <h2 className="question-title">{q.title}</h2>
                    <div className="question-options">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          className={`option-btn ${answers[idx] === opt ? 'selected' : ''}`}
                          onClick={() => handleSelect(opt)}
                          disabled={isAnimating}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="question-nav">
              <button
                className="btn-outline"
                onClick={handlePrev}
                disabled={currentStep === 0 || isAnimating}
              >
                上一题
              </button>
              <button
                className="btn-primary"
                onClick={handleNext}
                disabled={answers[currentStep] === null || isAnimating}
              >
                {currentStep === questions.length - 1 ? '查看结果' : '下一题'}
              </button>
            </div>
          </>
        ) : (
          <div className="result-card">
            <div className="result-image">
              <svg viewBox="0 0 160 160" width="140" height="140">
                <defs>
                  <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#BCAAA4" />
                    <stop offset="100%" stopColor="#5D4037" />
                  </linearGradient>
                </defs>
                <circle cx="80" cy="80" r="70" fill="url(#resGrad)" opacity="0.3" />
                <path
                  d="M40 50h80c0 38-18 60-40 60S40 88 40 50z"
                  fill="#5D4037"
                  stroke="#3E2723"
                  strokeWidth="3"
                />
                <ellipse cx="80" cy="50" rx="40" ry="7" fill="#3E2723" />
                <path
                  d="M120 55c10 3 17 15 17 30s-7 27-17 30"
                  fill="none"
                  stroke="#3E2723"
                  strokeWidth="3"
                />
                <ellipse cx="80" cy="50" rx="30" ry="5" fill="#FF8A65" />
                <path d="M62 28c3-10 12-10 15 0" stroke="#FFE0B2" strokeWidth="2.5" fill="none" />
                <path d="M80 22c3-10 12-10 15 0" stroke="#FFE0B2" strokeWidth="2.5" fill="none" />
                <path d="M68 15c2-7 9-7 11 0" stroke="#FFE0B2" strokeWidth="2" fill="none" opacity="0.7" />
              </svg>
            </div>
            <h2 className="result-title">{result.name}</h2>
            <p className="result-reason">{getReason()}</p>
            <p className="result-desc">{result.desc}</p>
            <div className="result-tags">
              <span className="result-tag">产地：{result.region}</span>
              <span className="result-tag">烘焙：{result.roast}</span>
              <span className="result-tag">冲煮：{result.brew}</span>
            </div>
            <div className="result-actions">
              <button
                className={`btn-accent ${favorited ? 'favorited' : ''}`}
                onClick={handleFavorite}
              >
                {favorited ? '♥ 已收藏' : '♡ 收藏'}
              </button>
              <button className="btn-outline" onClick={handleRestart}>
                重新测试
              </button>
              <button className="btn-secondary" onClick={() => navigate('/')}>
                返回首页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlavorExplore;
