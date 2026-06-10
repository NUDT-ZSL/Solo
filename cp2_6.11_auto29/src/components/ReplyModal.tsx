import { useState } from 'react';
import { EMOTION_COLORS, EMOTION_LABELS, EmotionType } from '../types';

interface ReplyModalProps {
  open: boolean;
  storyId: string;
  storyEmotion: EmotionType;
  onClose: () => void;
  onSubmit: (content: string, type: 'text' | 'voice', emotion: EmotionType) => Promise<void>;
}

export default function ReplyModal({ open, storyId, storyEmotion, onClose, onSubmit }: ReplyModalProps) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'text' | 'voice'>('text');
  const [emotion, setEmotion] = useState<EmotionType>(storyEmotion);
  const [recording, setRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const emotions: EmotionType[] = ['joy', 'sadness', 'nostalgia', 'confusion', 'surprise'];

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(content.trim(), type, emotion);
      setContent('');
      setType('text');
      setEmotion(storyEmotion);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecord = () => {
    if (recording) {
      setRecording(false);
      setContent('🎤 [语音回响] 一段温暖的话语...');
      setType('voice');
    } else {
      setRecording(true);
      setTimeout(() => {
        setRecording(false);
        setContent('🎤 [语音回响] 一段温暖的话语...');
        setType('voice');
      }, 2000);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.3s ease'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="glass-card"
        style={{
          padding: 32,
          maxWidth: 500,
          width: '100%',
          animation: 'fadeIn 0.3s ease',
          position: 'relative'
        }}
      >
        <h3 style={{ fontSize: 20, marginBottom: 20, fontFamily: "'Noto Serif SC', serif" }}>
          💬 留下你的回响
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <textarea
            placeholder="写下你的回响（最多200字）..."
            value={content}
            onChange={e => setContent(e.target.value.slice(0, 200))}
            rows={4}
            disabled={submitting || recording}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              padding: 12,
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', marginTop: -8 }}>
            {content.length}/200
          </div>

          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>选择情绪：</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {emotions.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmotion(e)}
                  disabled={submitting}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 16,
                    border: `2px solid ${emotion === e ? EMOTION_COLORS[e] : 'transparent'}`,
                    background: emotion === e ? `${EMOTION_COLORS[e]}33` : 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: 12,
                    transition: 'all 0.3s'
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: EMOTION_COLORS[e],
                      display: 'inline-block',
                      marginRight: 6
                    }}
                  />
                  {EMOTION_LABELS[e]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={handleRecord}
              disabled={submitting}
              className="btn-primary"
              style={{
                flex: 0,
                padding: '10px 16px',
                background: recording ? 'rgba(255, 80, 80, 0.3)' : undefined,
                borderColor: recording ? 'rgba(255, 80, 80, 0.5)' : undefined
              }}
            >
              {recording ? '⏺️ 录音中...' : '🎤 语音'}
            </button>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-primary"
              style={{ padding: '10px 20px' }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !content.trim()}
              className="btn-primary"
              style={{
                padding: '10px 24px',
                background: `${EMOTION_COLORS[emotion]}33`,
                border: `1px solid ${EMOTION_COLORS[emotion]}66`
              }}
            >
              {submitting ? '提交中...' : '发送回响'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
