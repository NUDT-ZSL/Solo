import { useState, useRef, useEffect } from 'react';
import type { Category } from './shared/types';

interface Props {
  onSubmit: (data: { category: Category; score: number; comment?: string }) => Promise<void>;
}

const CATEGORY_OPTIONS: Category[] = ['技术协作', '创新能力', '响应速度', '文档质量', '沟通效率'];

function getScoreColor(score: number): string {
  const ratio = (score - 1) / 4;
  const r = Math.round(30 + (255 - 30) * ratio);
  const g = Math.round(144 + (69 - 144) * ratio);
  const b = Math.round(255 + (0 - 255) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function Form({ onSubmit }: Props) {
  const [category, setCategory] = useState<Category>('技术协作');
  const [score, setScore] = useState<number>(3);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const trimmedComment = comment.slice(0, 100);
      await onSubmit({ category, score, comment: trimmedComment });
      setSubmitSuccess(true);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setSubmitSuccess(false);
        successTimerRef.current = null;
      }, 500);
      setScore(3);
      setComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-card">
      <h2>匿名评分</h2>

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as Category)}
      >
        {CATEGORY_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      <div className="score-slider">
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          style={{
            '--slider-color': getScoreColor(score),
            '--slider-percent': `${((score - 1) / 4) * 100}%`,
          } as React.CSSProperties}
        />
        <span className="score-display" style={{ color: getScoreColor(score) }}>
          {score}
        </span>
      </div>

      <textarea
        placeholder="输入匿名备注（最多100字）"
        maxLength={100}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="char-count">
        {comment.length}/100
      </div>

      <button
        className={`submit-btn ${submitSuccess ? 'success' : ''}`}
        disabled={isSubmitting}
        onClick={handleSubmit}
      >
        提交评分
      </button>
    </div>
  );
}
