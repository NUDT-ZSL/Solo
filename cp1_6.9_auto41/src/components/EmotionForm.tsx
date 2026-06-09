import { useState, useCallback } from 'react';
import type { EmotionType } from '../types';
import { EMOTION_CONFIG, INTENSITY_LABELS, EMOTION_TYPES } from '../types';

interface EmotionFormProps {
  onSubmit: (data: {
    date: string;
    type: EmotionType;
    intensity: number;
    note: string;
  }) => Promise<boolean>;
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default function EmotionForm({ onSubmit }: EmotionFormProps) {
  const [date, setDate] = useState<string>(getTodayDate());
  const [type, setType] = useState<EmotionType>('happy');
  const [intensity, setIntensity] = useState<number>(3);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const resetForm = useCallback(() => {
    setDate(getTodayDate());
    setType('happy');
    setIntensity(3);
    setNote('');
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedNote = note.trim();
      if (trimmedNote.length < 10) {
        alert('文字说明不少于10个字');
        return;
      }

      setIsSubmitting(true);
      try {
        const success = await onSubmit({
          date,
          type,
          intensity,
          note: trimmedNote,
        });
        if (success) {
          resetForm();
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [date, type, intensity, note, onSubmit, resetForm]
  );

  return (
    <div className="glass-card form-card">
      <h2>记录此刻的情绪</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">日期</label>
          <input
            type="date"
            className="form-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={getTodayDate()}
          />
        </div>

        <div className="form-group">
          <label className="form-label">情绪类型</label>
          <select
            className="form-select"
            value={type}
            onChange={(e) => setType(e.target.value as EmotionType)}
          >
            {EMOTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {EMOTION_CONFIG[t].label}
              </option>
            ))}
          </select>
          <div
            style={{
              marginTop: '12px',
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {EMOTION_TYPES.map((t) => {
              const cfg = EMOTION_CONFIG[t];
              const isActive = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: `2px solid ${
                      isActive ? cfg.color : 'rgba(255,255,255,0.1)'
                    }`,
                    background: isActive
                      ? `${cfg.color}22`
                      : 'rgba(255,255,255,0.04)',
                    color: isActive ? cfg.color : 'rgba(224,224,224,0.7)',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: cfg.color,
                      boxShadow: isActive ? `0 0 8px ${cfg.color}` : 'none',
                    }}
                  />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">情绪强度</label>
          <div className="slider-container">
            <input
              type="range"
              className="intensity-slider"
              min="0"
              max="5"
              step="1"
              value={intensity}
              onChange={(e) => setIntensity(parseInt(e.target.value))}
            />
            <div className="intensity-labels">
              {INTENSITY_LABELS.map((label, i) => (
                <span key={i}>{i}-{label}</span>
              ))}
            </div>
            <div className="intensity-value">
              当前: {intensity} - {INTENSITY_LABELS[intensity]}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            文字说明 <span style={{ color: '#6C63FF' }}>(至少10个字)</span>
          </label>
          <textarea
            className="form-textarea"
            placeholder="描述此刻的心情，是什么让你产生了这样的感受？"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
          <div
            style={{
              marginTop: '6px',
              textAlign: 'right',
              fontSize: '12px',
              color:
                note.trim().length >= 10
                  ? 'rgba(46, 204, 113, 0.8)'
                  : 'rgba(224, 224, 224, 0.4)',
            }}
          >
            {note.trim().length}/500
            {note.trim().length < 10 && ' (还需 ' + (10 - note.trim().length) + ' 字)'}
          </div>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={isSubmitting}
          style={{
            opacity: isSubmitting ? 0.6 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? '记录中...' : '💫 记录情绪'}
        </button>
      </form>
    </div>
  );
}
