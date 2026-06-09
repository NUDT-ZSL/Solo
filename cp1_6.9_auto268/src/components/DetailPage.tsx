import { useState, useEffect, useRef } from 'react';
import type { Riddle, AttemptResponse } from '../api';

interface DetailPageProps {
  riddle: Riddle | null;
  onBack: () => void;
  onAttempt: (id: string, guess: string) => Promise<AttemptResponse>;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
}

function DetailPage({ riddle, onBack, onAttempt }: DetailPageProps) {
  const [guess, setGuess] = useState('');
  const [wrongCount, setWrongCount] = useState(0);
  const [showParticles, setShowParticles] = useState(false);
  const [showThanks, setShowThanks] = useState(false);
  const [thanksText, setThanksText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const particleCanvasRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!showParticles) return;

    startTimeRef.current = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const progress = Math.min(elapsed / 1200, 1);

      setParticles((prev) =>
        prev.map((p) => {
          const gravity = 0.12;
          const friction = 0.985;
          const newVy = p.vy + gravity;
          const newX = p.x + p.vx;
          const newY = p.y + newVy;
          const newOpacity = 1 - progress;

          return {
            ...p,
            x: newX,
            y: newY,
            vx: p.vx * friction,
            vy: newVy * friction + gravity * 0.3,
            opacity: Math.max(0, newOpacity),
          };
        })
      );

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [showParticles]);

  useEffect(() => {
    if (showThanks) {
      const timer = setTimeout(() => {
        onBack();
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [showThanks, onBack]);

  useEffect(() => {
    if (wrongCount >= 3 && !showThanks) {
      setErrorMsg('三次都没有猜对，谜语已沉入池底...');
      setTimeout(() => {
        onBack();
      }, 1800);
    }
  }, [wrongCount, showThanks, onBack]);

  const generateParticles = () => {
    const newParticles: Particle[] = [];
    const count = 50;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 4 + Math.random() * 10;
      newParticles.push({
        id: i,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 4 + Math.random() * 4,
        opacity: 1,
        hue: 35 + Math.random() * 20,
      });
    }

    setParticles(newParticles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || !riddle || isSubmitting || showThanks) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const result = await onAttempt(riddle.id, guess.trim());

      if (result.correct) {
        generateParticles();
        setShowParticles(true);
        setThanksText(result.thanks || '感谢你解开了这个谜题！');

        setTimeout(() => {
          setShowThanks(true);
        }, 800);
      } else {
        setWrongCount((prev) => prev + 1);
        setErrorMsg('答案不对哦，再想想看...');
        setGuess('');
      }
    } catch (error) {
      setErrorMsg('网络出现问题，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const correctRate = riddle
    ? riddle.attempts > 0
      ? Math.round((riddle.correctCount / riddle.attempts) * 100)
      : 0
    : 0;

  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (correctRate / 100) * circumference;

  if (!riddle) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'rgba(200, 180, 220, 0.8)',
      }}>
        谜语已消失在夜雾中...
      </div>
    );
  }

  return (
    <div
      className="detail-page-container"
      style={{
        overflow: showParticles ? 'hidden' : undefined,
      }}
    >
      {showParticles && (
        <div
          ref={particleCanvasRef}
          className="particles-layer"
        >
          {particles.map((p) => (
            <div
              key={p.id}
              className="particle"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: `radial-gradient(circle, hsla(${p.hue}, 100%, 70%, ${p.opacity}) 0%, hsla(${p.hue + 10}, 100%, 50%, ${p.opacity * 0.8}) 100%)`,
                boxShadow: `0 0 ${p.size * 2}px hsla(${p.hue}, 100%, 60%, ${p.opacity * 0.6})`,
                transform: `translate(${p.x}px, ${p.y}px)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="detail-content">
        <button
          onClick={onBack}
          className="back-button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          返回谜池
        </button>

        <div className="detail-grid">
          <div className="left-section">
            <div className="question-card">
              <div className="question-label">
                ✦ 谜 面 ✦
              </div>

              <p className="question-text">
                {riddle.question}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="guess-form">
              <div className="guess-group">
                <label className="guess-label">
                  写下你的答案
                </label>
                <div className="guess-input-row">
                  <input
                    type="text"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSubmit(e);
                      }
                    }}
                    placeholder="输入答案..."
                    disabled={showThanks || wrongCount >= 3}
                    className="guess-input"
                    maxLength={30}
                  />
                  <button
                    type="submit"
                    disabled={!guess.trim() || showThanks || wrongCount >= 3 || isSubmitting}
                    className="guess-button"
                  >
                    {isSubmitting ? '验证中...' : '猜 一 猜'}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <p className={`error-msg ${wrongCount >= 3 ? 'error-final' : ''}`}>
                  {wrongCount >= 3 ? `💫 ${errorMsg}` : `✦ ${errorMsg} (${wrongCount}/3)`}
                </p>
              )}

              {wrongCount > 0 && wrongCount < 3 && (
                <div className="wrong-dots">
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className={`wrong-dot ${n <= wrongCount ? 'wrong-dot-active' : ''}`}
                    />
                  ))}
                </div>
              )}
            </form>
          </div>

          <div className="right-section">
            <div className="stats-card">
              <h3 className="stats-title">
                ✧ 共 鸣 数 据 ✧
              </h3>

              <div className="ring-container">
                <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="60"
                    cy="60"
                    r="42"
                    fill="none"
                    stroke="rgba(100, 90, 150, 0.2)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="42"
                    fill="none"
                    stroke="url(#ringGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{
                      transition: 'strokeDashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                  <defs>
                    <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFB870" />
                      <stop offset="50%" stopColor="#FF8C5A" />
                      <stop offset="100%" stopColor="#FF6B35" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="ring-label">
                  <span className="ring-value">
                    {correctRate}%
                  </span>
                  <span className="ring-caption">
                    答对率
                  </span>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">
                    {riddle.attempts}
                  </div>
                  <div className="stat-label">
                    被尝试
                  </div>
                </div>

                <div className="stat-item stat-item-warm">
                  <div className="stat-value stat-value-warm">
                    {riddle.correctCount}
                  </div>
                  <div className="stat-label stat-label-warm">
                    已答对
                  </div>
                </div>
              </div>
            </div>

            {riddle.solved && (
              <div className="solved-badge">
                <span>
                  ✦ 此谜已被解开 ✦
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showThanks && (
        <div className="thanks-overlay">
          <div className="thanks-card">
            <div className="thanks-icon">
              <span>✦</span>
            </div>

            <h3 className="thanks-title">
              答 谢 便 签
            </h3>

            <p className="thanks-text">
              {thanksText || '感谢你解开了这个谜题！'}
            </p>

            <div className="thanks-countdown">
              即将返回谜池...
            </div>
          </div>
        </div>
      )}

      <style>{`
        .detail-page-container {
          position: relative;
          width: 100%;
          min-height: 100vh;
          padding: 32px 24px 60px;
          background: radial-gradient(ellipse at 50% 30%, rgba(60, 40, 100, 0.3) 0%, transparent 60%);
        }

        .particles-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .particle {
          position: absolute;
          left: 50%;
          top: 50%;
          border-radius: 50%;
          will-change: transform, opacity;
        }

        .detail-content {
          max-width: 1000px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: rgba(200, 180, 220, 0.7);
          font-size: 14px;
          letter-spacing: 2px;
          cursor: pointer;
          padding: 8px 12px;
          margin-bottom: 32px;
          transition: color 0.2s ease, transform 0.2s ease;
          font-family: inherit;
        }

        .back-button:hover {
          color: rgba(230, 210, 255, 1);
          transform: translateX(-4px);
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 48px;
          align-items: start;
        }

        .left-section {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .question-card {
          position: relative;
          padding: 40px 36px;
          background: rgba(15, 10, 40, 0.6);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 20px;
          border: 1px solid rgba(150, 130, 200, 0.2);
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .question-label {
          position: absolute;
          top: 16px;
          left: 24px;
          font-size: 11px;
          letter-spacing: 2px;
          color: rgba(200, 180, 220, 0.4);
        }

        .question-text {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 24px;
          line-height: 1.8;
          text-align: center;
          margin: 0;
          letter-spacing: 1px;
          background: linear-gradient(180deg, #6B7DB7 0%, #EDEFFF 60%, #FFFFFF 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 20px rgba(180, 170, 255, 0.2));
        }

        .guess-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .guess-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .guess-label {
          font-size: 13px;
          color: rgba(200, 180, 220, 0.75);
          letter-spacing: 2px;
        }

        .guess-input-row {
          display: flex;
          gap: 12px;
        }

        .guess-input {
          flex: 1;
          padding: 14px 18px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(150, 130, 200, 0.35);
          border-radius: 12px;
          color: rgba(240, 235, 255, 0.95);
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          letter-spacing: 0.5px;
          font-family: inherit;
        }

        .guess-input:focus {
          border-color: rgba(255, 180, 120, 0.6);
          box-shadow: 0 0 16px rgba(255, 140, 90, 0.15);
        }

        .guess-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .guess-button {
          padding: 14px 32px;
          background: linear-gradient(135deg, #FF8C5A 0%, #FF6B35 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 2px;
          cursor: pointer;
          opacity: 1;
          transition: filter 0.2s ease, transform 0.15s ease, opacity 0.2s ease;
          box-shadow: 0 6px 20px rgba(255, 107, 53, 0.35);
          white-space: nowrap;
          font-family: inherit;
        }

        .guess-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .guess-button:hover:not(:disabled) {
          filter: brightness(1.15);
        }

        .guess-button:active:not(:disabled) {
          transform: scale(0.96);
        }

        .error-msg {
          font-size: 13px;
          color: rgba(255, 140, 140, 0.85);
          letter-spacing: 1px;
          margin: 0;
          animation: fadeIn 0.3s ease;
        }

        .error-final {
          color: rgba(180, 140, 220, 0.8);
        }

        .wrong-dots {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .wrong-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(150, 130, 200, 0.3);
          transition: background 0.3s ease;
        }

        .wrong-dot-active {
          background: rgba(255, 120, 120, 0.8);
        }

        .right-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .stats-card {
          padding: 28px 24px;
          background: rgba(15, 10, 40, 0.55);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(150, 130, 200, 0.2);
          box-shadow: 0 6px 30px rgba(0, 0, 0, 0.3);
        }

        .stats-title {
          font-size: 13px;
          font-weight: 400;
          color: rgba(200, 180, 220, 0.6);
          letter-spacing: 3px;
          margin: 0 0 20px;
          text-align: center;
        }

        .ring-container {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 24px;
          position: relative;
          width: 120px;
          height: 120px;
          margin-left: auto;
          margin-right: auto;
        }

        .ring-label {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .ring-value {
          font-size: 28px;
          font-weight: 300;
          color: #FFD89B;
          letter-spacing: 0.5px;
        }

        .ring-caption {
          font-size: 10px;
          color: rgba(200, 180, 220, 0.5);
          letter-spacing: 1px;
          margin-top: 2px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .stat-item {
          padding: 14px 12px;
          background: rgba(80, 70, 130, 0.2);
          border-radius: 10px;
          text-align: center;
          border: 1px solid rgba(150, 130, 200, 0.1);
        }

        .stat-item-warm {
          background: rgba(255, 180, 100, 0.08);
          border: 1px solid rgba(255, 180, 100, 0.15);
        }

        .stat-value {
          font-size: 22px;
          font-weight: 300;
          color: rgba(200, 220, 255, 0.95);
          margin-bottom: 2px;
        }

        .stat-value-warm {
          color: #FFD89B;
        }

        .stat-label {
          font-size: 10px;
          color: rgba(180, 170, 220, 0.55);
          letter-spacing: 1.5px;
        }

        .stat-label-warm {
          color: rgba(255, 210, 160, 0.6);
        }

        .solved-badge {
          padding: 16px 20px;
          background: rgba(255, 215, 100, 0.08);
          border: 1px solid rgba(255, 215, 100, 0.2);
          border-radius: 12px;
          text-align: center;
        }

        .solved-badge span {
          font-size: 13px;
          color: #FFD89B;
          letter-spacing: 1px;
        }

        .thanks-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          padding: 24px;
          animation: fadeIn 0.4s ease;
        }

        .thanks-card {
          position: relative;
          max-width: 480px;
          width: 100%;
          padding: 40px 36px 36px;
          background: linear-gradient(180deg, #FFFFFF 0%, #F8F5FF 100%);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 215, 100, 0.2);
          animation: thanksPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        .thanks-icon {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFD89B 0%, #FFB870 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(255, 180, 100, 0.4);
        }

        .thanks-icon span {
          font-size: 24px;
        }

        .thanks-title {
          text-align: center;
          font-size: 18px;
          font-weight: 400;
          color: #3D3055;
          letter-spacing: 3px;
          margin: 8px 0 20px;
        }

        .thanks-text {
          font-size: 16px;
          line-height: 1.8;
          color: #4A3E63;
          text-align: center;
          margin: 0;
          letter-spacing: 0.5px;
        }

        .thanks-countdown {
          margin-top: 28px;
          text-align: center;
          font-size: 12px;
          color: #9A8FB8;
          letter-spacing: 2px;
          animation: blink 1s ease-in-out infinite;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes thanksPopIn {
          0% {
            opacity: 0;
            transform: scale(0.7) translateY(20px);
          }
          60% {
            transform: scale(1.05) translateY(-4px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes blink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        @media (max-width: 768px) {
          .detail-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }

        @media (max-width: 480px) {
          .guess-input-row {
            flex-direction: column;
          }

          .guess-button {
            width: 100%;
          }

          .question-text {
            font-size: 20px;
          }

          .question-card {
            padding: 36px 24px;
          }
        }
      `}</style>
    </div>
  );
}

export default DetailPage;
