import React, { useState, useRef, useEffect } from 'react';

interface AnswerSlotProps {
  active: boolean;
  riddleId: number | null;
  onSubmit: (riddleId: number, answer: string) => void;
  onCancel: () => void;
}

export default function AnswerSlot({ active, riddleId, onSubmit, onCancel }: AnswerSlotProps) {
  const [answer, setAnswer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanOffset, setScanOffset] = useState(0);

  useEffect(() => {
    if (active && inputRef.current) {
      inputRef.current.focus();
    }
    if (!active) {
      setAnswer('');
    }
  }, [active, riddleId]);

  useEffect(() => {
    let raf: number;
    const animate = () => {
      setScanOffset((prev) => (prev + 1) % 400);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (riddleId !== null && answer.trim()) {
      onSubmit(riddleId, answer.trim());
      setAnswer('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className={`answer-slot ${active ? 'active' : ''}`}>
      <div className="scan-line" style={{ backgroundPositionX: scanOffset }} />
      <div className="answer-slot-inner">
        {active ? (
          <>
            <div className="answer-slot-title">📝 输入答案</div>
            <form onSubmit={handleSubmit} className="answer-form">
              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入谜底..."
                className="answer-input"
                autoComplete="off"
              />
              <button type="submit" className="submit-btn">
                提交
              </button>
              <button type="button" className="cancel-btn" onClick={onCancel}>
                取消
              </button>
            </form>
          </>
        ) : (
          <div className="answer-slot-placeholder">
            🔮 拖拽灯谜卡片到此处答题
          </div>
        )}
      </div>
    </div>
  );
}
