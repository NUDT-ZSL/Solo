import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function lerpColor(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function hexToRgb(hex: string): number[] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function getMoodIndicatorColor(mood: number): string {
  const red = hexToRgb('#ef4444');
  const yellow = hexToRgb('#eab308');
  const green = hexToRgb('#22c55e');
  if (mood <= 5) {
    const t = (mood - 1) / 4;
    const c = lerpColor(red, yellow, t);
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }
  const t = (mood - 5) / 5;
  const c = lerpColor(yellow, green, t);
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

const EntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [mood, setMood] = useState<number>(5);
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await axios.post('/api/entries', {
        mood,
        note: note.trim(),
        date: new Date().toISOString().slice(0, 10),
      });
      navigate('/');
    } catch (err) {
      console.error('Failed to save entry:', err);
      setSubmitting(false);
    }
  }, [submitting, mood, note, navigate]);

  const indicatorColor = getMoodIndicatorColor(mood);

  const moodLabel =
    mood <= 2 ? '😢 非常低落' :
    mood <= 4 ? '😕 有些低落' :
    mood <= 6 ? '😐 一般般' :
    mood <= 8 ? '🙂 不错' :
    '😊 非常棒！';

  return (
    <div className="entry-page">
      <h2 className="entry-title">记录此刻心情</h2>

      <div className="entry-slider-area">
        <div className="entry-slider-track-wrapper">
          <div className="entry-slider-track">
            <div
              className="entry-slider-fill"
              style={{ height: `${((mood - 1) / 9) * 100}%` }}
            />
            <div
              className="entry-slider-thumb"
              style={{ bottom: `${((mood - 1) / 9) * 100}%` }}
            />
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
              <div
                key={v}
                className="entry-slider-tick"
                style={{ bottom: `${((v - 1) / 9) * 100}%` }}
              />
            ))}
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            className="entry-slider-input"
          />
        </div>

        <div className="entry-indicator-area">
          <div
            className="entry-indicator"
            style={{
              backgroundColor: indicatorColor,
              boxShadow: `0 0 24px ${indicatorColor}88, 0 0 48px ${indicatorColor}44`,
            }}
          >
            <span className="entry-indicator-value">{mood}</span>
          </div>
          <div className="entry-mood-label">{moodLabel}</div>
        </div>
      </div>

      <div className="entry-textarea-wrapper">
        <textarea
          value={note}
          onChange={(e) => {
            if (e.target.value.length <= 150) setNote(e.target.value);
          }}
          placeholder="写下此刻的想法（最多150字）..."
          maxLength={150}
          className="entry-textarea"
        />
        <div className="entry-char-count">{note.length}/150</div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="entry-submit-btn"
        style={{ backgroundColor: submitting ? '#a5b4fc' : '#6366f1' }}
      >
        {submitting ? '记录中...' : '记录'}
      </button>
    </div>
  );
};

export default EntryPage;
