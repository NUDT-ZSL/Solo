import { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { EmotionType, EMOTION_COLORS, EMOTION_LABELS } from '../types';
import { api } from '../utils/api';
import { useStore } from '../store/useStore';

export default function StoryForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState<EmotionType>('joy');
  const [flying, setFlying] = useState(false);
  const addStory = useStore(s => s.addStory);
  const formRef = useRef<HTMLFormElement>(null);

  const emotions: EmotionType[] = ['joy', 'sadness', 'nostalgia', 'confusion', 'surprise'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setFlying(true);

    try {
      const story = await api.createStory({
        title: title.trim(),
        content: content.trim(),
        emotion
      });

      setTimeout(() => {
        addStory(story);
        setTitle('');
        setContent('');
        setEmotion('joy');
        setFlying(false);

        confetti({
          particleCount: 50,
          spread: 60,
          startVelocity: 30,
          origin: { y: 0.3 },
          colors: Object.values(EMOTION_COLORS),
          shapes: ['star'],
          scalar: 0.6
        });
      }, 1000);
    } catch (err) {
      setFlying(false);
      console.error(err);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="glass-card"
      style={{
        padding: 24,
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <h2 style={{ fontSize: 18, marginBottom: 16, color: 'var(--text-primary)' }}>
        ✍️ 写下你的故事
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input
          type="text"
          placeholder="故事标题（最多30字）"
          value={title}
          onChange={e => setTitle(e.target.value.slice(0, 30))}
          disabled={flying}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            padding: '12px 16px',
            color: 'var(--text-primary)',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.3s',
            fontFamily: 'inherit'
          }}
        />
        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', marginTop: -8 }}>
          {title.length}/30
        </div>

        <textarea
          placeholder="分享你的故事（最多500字）..."
          value={content}
          onChange={e => setContent(e.target.value.slice(0, 500))}
          disabled={flying}
          rows={5}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            padding: '12px 16px',
            color: 'var(--text-primary)',
            fontSize: 14,
            outline: 'none',
            resize: 'vertical',
            transition: 'border-color 0.3s',
            fontFamily: 'inherit',
            minHeight: 100
          }}
        />
        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', marginTop: -8 }}>
          {content.length}/500
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {emotions.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEmotion(e)}
                disabled={flying}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: `2px solid ${emotion === e ? EMOTION_COLORS[e] : 'transparent'}`,
                  background: emotion === e ? `${EMOTION_COLORS[e]}33` : 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: EMOTION_COLORS[e],
                    display: 'inline-block'
                  }}
                />
                {EMOTION_LABELS[e]}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={flying || !title.trim() || !content.trim()}
            className="btn-primary"
            style={{
              background: `${EMOTION_COLORS[emotion]}33`,
              border: `1px solid ${EMOTION_COLORS[emotion]}66`,
              animation: flying ? 'fly-in 1s ease forwards' : undefined,
              minWidth: 100,
              fontSize: 15,
              fontWeight: 500
            }}
          >
            {flying ? '投放中...' : '🚀 投放'}
          </button>
        </div>
      </div>
    </form>
  );
}
