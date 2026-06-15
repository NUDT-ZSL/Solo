import React, { useState } from 'react';

const CATEGORIES = ['技术协作', '创新能力', '响应速度', '文档质量', '沟通效率'];

interface FormProps {
  onSubmit: (data: { category: string; score: number; note: string }) => void;
}

const Form: React.FC<FormProps> = ({ onSubmit }) => {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [score, setScore] = useState(3);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const scorePercent = ((score - 1) / 4) * 100;

  const glowColor = `hsl(${(1 - scorePercent / 100) * 240}, 100%, 50%)`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ category, score, note: note.slice(0, 100) });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 500);
      setNote('');
      setScore(3);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2 className="form-title">匿名评分</h2>

      <div className="form-group">
        <label className="form-label">评价项</label>
        <select
          className="form-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">
          评分 <span className="score-value" style={{ color: glowColor }}>{score}</span>
        </label>
        <div className="slider-container">
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="slider"
            style={{
              background: `linear-gradient(to right, #1E90FF ${scorePercent}%, #333 ${scorePercent}%)`,
            }}
          />
          <div
            className="slider-glow"
            style={{
              left: `${scorePercent}%`,
              background: `radial-gradient(circle, ${glowColor}80, transparent)`,
            }}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">匿名备注（可选）</label>
        <textarea
          className="form-textarea"
          maxLength={100}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 100))}
          placeholder="最多100字..."
        />
        <span className="char-count">{note.length}/100</span>
      </div>

      <button
        type="submit"
        className={`submit-btn ${success ? 'submit-success' : ''}`}
        disabled={submitting}
      >
        {submitting ? '提交中...' : '提交评分'}
      </button>
    </form>
  );
};

export default Form;
