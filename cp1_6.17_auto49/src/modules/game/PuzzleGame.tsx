import React, { useState, useEffect, useCallback } from 'react';
import { MusicItem, useDataStore } from '../data/DataStore';

interface PuzzleGameProps {
  item: MusicItem;
  onClose: () => void;
  onComplete: (correct: boolean, attempts: number) => void;
}

export const PuzzleGame: React.FC<PuzzleGameProps> = ({ item, onClose, onComplete }) => {
  const { recordExploration, getItemRecord } = useDataStore();
  const [displayedRiddle, setDisplayedRiddle] = useState('');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'typing' | 'input' | 'success' | 'error'>('typing');
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const existingRecord = getItemRecord(item.id);
  const currentAttempts = (existingRecord?.attempts || 0) + attempts;
  const remainingAttempts = Math.max(0, 3 - currentAttempts);

  useEffect(() => {
    let index = 0;
    const riddle = item.riddle;
    const interval = setInterval(() => {
      if (index < riddle.length) {
        setDisplayedRiddle(riddle.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setStatus('input');
      }
    }, 150);

    return () => clearInterval(interval);
  }, [item.riddle]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'input' || !answer.trim()) return;

    const isCorrect = answer.trim().toLowerCase() === item.answer.toLowerCase();
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (isCorrect) {
      setStatus('success');
      setFlash(true);
      recordExploration(item.id, true, newAttempts);
      setTimeout(() => {
        onComplete(true, newAttempts);
        onClose();
      }, 1500);
    } else {
      setStatus('error');
      setShake(true);
      setTimeout(() => setShake(false), 300);

      const totalAttempts = (existingRecord?.attempts || 0) + newAttempts;
      if (totalAttempts >= 3) {
        recordExploration(item.id, false, newAttempts);
        setTimeout(() => {
          alert('错误次数过多，该物件已锁定10分钟');
          onComplete(false, newAttempts);
          onClose();
        }, 1000);
      } else {
        recordExploration(item.id, false, newAttempts);
        setTimeout(() => {
          setAnswer('');
          setStatus('input');
        }, 1000);
      }
    }
  }, [answer, attempts, status, item, recordExploration, onComplete, onClose, existingRecord]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="puzzle-overlay" onClick={handleOverlayClick}>
      <div className={`puzzle-panel ${shake ? 'shake' : ''}`}>
        <button className="close-btn" onClick={onClose} aria-label="关闭">
          ×
        </button>

        <div className="puzzle-header">
          <div className="puzzle-icon">{item.icon}</div>
          <h3 className="puzzle-title">{item.name}的谜语</h3>
        </div>

        <div className="riddle-container">
          <p className="riddle-text">{displayedRiddle}</p>
          {status === 'typing' && <span className="typing-cursor">|</span>}
        </div>

        {status !== 'typing' && (
          <form onSubmit={handleSubmit} className="puzzle-form">
            <div className="input-wrapper">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="输入答案（不区分大小写）"
                maxLength={10}
                className={`puzzle-input ${flash ? 'flash-success' : ''} ${status === 'error' ? 'flash-error' : ''}`}
                autoFocus
                disabled={status === 'success'}
              />
            </div>
            
            <div className="form-footer">
              <span className="attempts-info">
                剩余尝试次数: <strong>{remainingAttempts}</strong>
              </span>
              <button
                type="submit"
                className="btn btn-submit"
                disabled={status === 'success' || !answer.trim()}
              >
                {status === 'success' ? '✓ 正确！' : '提交答案'}
              </button>
            </div>
          </form>
        )}

        {status === 'success' && (
          <div className="success-message">
            <span className="success-icon">🎉</span>
            <p>恭喜你解锁了隐藏曲目！</p>
            <p className="track-title">{item.unlockedTrack.title}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="error-message">
            <span className="error-icon">❌</span>
            <p>答案不对哦，再想想~</p>
          </div>
        )}

        <div className="hint-text">
          提示: 答案是两个字，与这个物件有关
        </div>
      </div>

      <style>{`
        .puzzle-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
          padding: 20px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .puzzle-panel {
          background: #1E1E2E;
          border-radius: 12px;
          padding: 32px;
          max-width: 500px;
          width: 100%;
          position: relative;
          animation: slideIn 0.3s ease-out;
          border: 2px solid #FFD54F;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .puzzle-panel.shake {
          animation: shake 0.3s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          color: #9E9E9E;
          font-size: 24px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #E0E0E0;
        }

        .puzzle-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .puzzle-icon {
          font-size: 48px;
          margin-bottom: 8px;
        }

        .puzzle-title {
          color: #FFD54F;
          margin: 0;
          font-size: 20px;
        }

        .riddle-container {
          background: #263238;
          padding: 24px;
          border-radius: 8px;
          margin-bottom: 24px;
          min-height: 80px;
        }

        .riddle-text {
          color: #E0E0E0;
          font-size: 18px;
          line-height: 1.8;
          margin: 0;
        }

        .typing-cursor {
          color: #FFD54F;
          animation: blink 0.7s infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .puzzle-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-wrapper {
          position: relative;
        }

        .puzzle-input {
          width: 100%;
          padding: 14px 18px;
          background: #263238;
          border: 2px solid #37474F;
          border-radius: 8px;
          color: #E0E0E0;
          font-size: 16px;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .puzzle-input:focus {
          outline: none;
          border-color: #FFD54F;
          box-shadow: 0 0 0 3px rgba(255, 213, 79, 0.2);
        }

        .puzzle-input.flash-success {
          animation: flashGreen 0.5s ease-in-out 2;
        }

        @keyframes flashGreen {
          0%, 100% { border-color: #37474F; }
          50% { border-color: #66BB6A; box-shadow: 0 0 15px #66BB6A; }
        }

        .puzzle-input.flash-error {
          border-color: #E53935;
          box-shadow: 0 0 15px rgba(229, 57, 53, 0.5);
        }

        .form-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .attempts-info {
          color: #9E9E9E;
          font-size: 14px;
        }

        .attempts-info strong {
          color: #FFD54F;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease-out;
        }

        .btn-submit {
          background: linear-gradient(135deg, #FFD54F 0%, #FFB300 100%);
          color: #121212;
        }

        .btn-submit:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 8px 25px rgba(255, 213, 79, 0.4);
        }

        .btn-submit:disabled {
          background: #455A64;
          color: #78909C;
          cursor: not-allowed;
        }

        .success-message, .error-message {
          text-align: center;
          padding: 16px;
          border-radius: 8px;
          margin-top: 16px;
          animation: fadeIn 0.3s ease;
        }

        .success-message {
          background: rgba(102, 187, 106, 0.2);
          border: 1px solid #66BB6A;
        }

        .success-icon {
          font-size: 32px;
          display: block;
          margin-bottom: 8px;
        }

        .success-message p {
          margin: 4px 0;
          color: #E0E0E0;
        }

        .track-title {
          color: #FFD54F;
          font-weight: bold;
          font-size: 18px;
        }

        .error-message {
          background: rgba(229, 57, 53, 0.2);
          border: 1px solid #E53935;
        }

        .error-icon {
          font-size: 32px;
          display: block;
          margin-bottom: 8px;
        }

        .error-message p {
          margin: 0;
          color: #EF9A9A;
        }

        .hint-text {
          text-align: center;
          color: #607D8B;
          font-size: 13px;
          margin-top: 16px;
          font-style: italic;
        }

        [data-theme='light'] .puzzle-panel {
          background: #FFFFFF;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        }

        [data-theme='light'] .puzzle-title {
          color: #FF8F00;
        }

        [data-theme='light'] .riddle-container {
          background: #FFF8E1;
        }

        [data-theme='light'] .riddle-text {
          color: #212121;
        }

        [data-theme='light'] .typing-cursor {
          color: #FF8F00;
        }

        [data-theme='light'] .puzzle-input {
          background: #FFFFFF;
          border-color: #E0E0E0;
          color: #212121;
        }

        [data-theme='light'] .puzzle-input:focus {
          border-color: #FFB300;
          box-shadow: 0 0 0 3px rgba(255, 179, 0, 0.2);
        }

        [data-theme='light'] .attempts-info {
          color: #757575;
        }

        [data-theme='light'] .attempts-info strong {
          color: #FF8F00;
        }

        [data-theme='light'] .success-message p {
          color: #2E7D32;
        }

        [data-theme='light'] .error-message p {
          color: #C62828;
        }

        [data-theme='light'] .hint-text {
          color: #9E9E9E;
        }

        [data-theme='light'] .track-title {
          color: #E65100;
        }

        @media (max-width: 768px) {
          .puzzle-panel {
            padding: 20px;
          }

          .riddle-text {
            font-size: 16px;
          }

          .form-footer {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .btn-submit {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
