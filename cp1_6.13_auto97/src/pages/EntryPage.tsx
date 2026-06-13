import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const EntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [mood, setMood] = useState<number>(5);
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const getIndicatorColor = (val: number): string => {
    if (val <= 3) return '#ef4444';
    if (val <= 6) return '#eab308';
    return '#22c55e';
  };

  const getSliderBackground = (): string => {
    return 'linear-gradient(to top, #ef4444, #eab308, #22c55e)';
  };

  const handleSubmit = async () => {
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
  };

  const indicatorColor = getIndicatorColor(mood);

  return (
    <div style={{ padding: '32px 24px', maxWidth: 480, margin: '0 auto' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', marginBottom: 32, textAlign: 'center' }}>
        记录此刻心情
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, marginBottom: 40 }}>
        <div style={{ position: 'relative', height: 260, display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min={1}
            max={10}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            style={{
              writingMode: 'vertical-lr' as React.CSSProperties['writingMode'],
              direction: 'rtl',
              appearance: 'none',
              WebkitAppearance: 'none',
              width: 260,
              height: 8,
              background: getSliderBackground(),
              borderRadius: 4,
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </div>

        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: indicatorColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 24,
            fontWeight: 700,
            boxShadow: `0 0 20px ${indicatorColor}66`,
            transition: 'all 0.2s ease-out',
          }}
        >
          {mood}
        </div>
      </div>

      <div style={{ marginBottom: 12, fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
        {mood <= 2 ? '😢 非常低落' : mood <= 4 ? '😕 有些低落' : mood <= 6 ? '😐 一般般' : mood <= 8 ? '🙂 不错' : '😊 非常棒！'}
      </div>

      <div style={{ marginBottom: 24 }}>
        <textarea
          value={note}
          onChange={(e) => {
            if (e.target.value.length <= 150) setNote(e.target.value);
          }}
          placeholder="写下此刻的想法（最多150字）..."
          maxLength={150}
          style={{
            width: '100%',
            height: 100,
            padding: '12px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 14,
            lineHeight: 1.6,
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
        />
        <div style={{ textAlign: 'right', fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          {note.length}/150
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '12px 0',
          backgroundColor: submitting ? '#a5b4fc' : '#6366f1',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease-out',
        }}
        onMouseEnter={(e) => {
          if (!submitting) e.currentTarget.style.backgroundColor = '#4f46e5';
        }}
        onMouseLeave={(e) => {
          if (!submitting) e.currentTarget.style.backgroundColor = '#6366f1';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {submitting ? '记录中...' : '记录'}
      </button>
    </div>
  );
};

export default EntryPage;
