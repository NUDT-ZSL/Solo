import React, { useState, useRef } from 'react';
import { Sparkles } from 'lucide-react';

interface EmotionInputProps {
  onSubmit: (text: string) => void;
  loading: boolean;
  disabled?: boolean;
}

export function EmotionInput({ onSubmit, loading, disabled }: EmotionInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed && !loading && !disabled) {
      onSubmit(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          className="glass-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="今天的雨有点忧伤… 写下此刻的心情短语"
          rows={1}
          disabled={loading || disabled}
          maxLength={500}
        />
        <button
          type="submit"
          className="glass-button primary"
          disabled={loading || disabled || !text.trim()}
        >
          {loading ? (
            <div
              style={{
                width: 18,
                height: 18,
                border: '2px solid rgba(255,255,255,0.2)',
                borderTopColor: 'var(--emotion-primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          ) : (
            <>
              <Sparkles size={18} strokeWidth={2} />
              <span>织就</span>
            </>
          )}
        </button>
      </div>
      <p className="hint-text">按下 Cmd/Ctrl + Enter 快速生成 · 最多 500 字</p>
    </form>
  );
}

export default EmotionInput;
