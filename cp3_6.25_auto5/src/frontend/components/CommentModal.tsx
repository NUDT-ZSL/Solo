import React, { useState } from 'react';
import * as api from '../utils/api';

interface CommentModalProps {
  visible: boolean;
  programId: string;
  chapterId: string;
  chapterTitle: string;
  onClose: () => void;
  onSubmit: () => void;
}

const EMOJIS = [
  { label: '开心', emoji: '😊' },
  { label: '感动', emoji: '🥹' },
  { label: '疑惑', emoji: '🤔' },
  { label: '有趣', emoji: '😄' },
];

const CommentModal: React.FC<CommentModalProps> = ({
  visible,
  programId,
  chapterId,
  chapterTitle,
  onClose,
  onSubmit,
}) => {
  const [text, setText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!visible) return null;

  const handleSubmit = async () => {
    if (!text.trim() && !selectedEmoji) return;
    setSubmitting(true);
    try {
      await api.post(`/programs/${programId}/chapters/${chapterId}/comments`, {
        text: text.trim(),
        emoji: selectedEmoji,
      });
      setText('');
      setSelectedEmoji('');
      onSubmit();
    } catch (err) {
      console.error('Failed to submit comment', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 360,
          borderRadius: 12,
          boxShadow: '8px 8px 8px rgba(0,0,0,0.2)',
          background: '#fff',
          padding: 24,
          color: '#121212',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: '0 0 16px 0',
            fontSize: 16,
            fontWeight: 600,
            color: '#121212',
          }}
        >
          评论: {chapterTitle}
        </h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="写下你的想法..."
          style={{
            width: '100%',
            height: 80,
            borderRadius: 8,
            border: '1px solid #ddd',
            padding: 10,
            fontSize: 14,
            resize: 'none',
            outline: 'none',
            marginBottom: 12,
          }}
        />
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 16,
            justifyContent: 'center',
          }}
        >
          {EMOJIS.map((e) => (
            <button
              key={e.label}
              onClick={() => setSelectedEmoji(e.label)}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border:
                  selectedEmoji === e.label
                    ? '2px solid #42a5f5'
                    : '2px solid #ddd',
                background:
                  selectedEmoji === e.label ? '#e3f2fd' : 'transparent',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              title={e.label}
            >
              {e.emoji}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #ddd',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#42a5f5',
              color: '#fff',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {submitting ? '提交中...' : '提交'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
