import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TimeCapsuleEngine } from './TimeCapsuleEngine';
import { EmotionType, EMOTION_LABELS, EMOTION_ICONS, EMOTION_COLORS } from './types';

interface LetterEditorProps {
  onSubmitted: (token: string) => void;
}

const EMOTIONS: EmotionType[] = ['happy', 'sad', 'calm', 'hope', 'love', 'nostalgic'];

export const LetterEditor: React.FC<LetterEditorProps> = ({ onSubmitted }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState<EmotionType>('calm');
  const [deliverAt, setDeliverAt] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const engine = TimeCapsuleEngine.getInstance();

  useEffect(() => {
    setDeliverAt(engine.generateDefaultDeliverDate());
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('请为信件起一个标题');
      setShowValidation(true);
      return;
    }
    if (!content.trim()) {
      setError('请写下你想对未来的自己说的话');
      setShowValidation(true);
      return;
    }
    const validation = engine.validateDeliverDate(deliverAt);
    if (!validation.valid) {
      setError(validation.message);
      setShowValidation(true);
      return;
    }

    setSubmitting(true);
    setError('');
    setShowValidation(false);

    try {
      const result = await engine.createLetter(title, content, emotion, deliverAt, email);
      setSuccess(true);
      setTimeout(() => {
        setTitle('');
        setContent('');
        setEmotion('calm');
        setDeliverAt(engine.generateDefaultDeliverDate());
        setEmail('');
        setSuccess(false);
        onSubmitted(result.owner_token);
      }, 2000);
    } catch (err: any) {
      setError(err.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }, [title, content, emotion, deliverAt, email, onSubmitted]);

  return (
    <div className="letter-editor">
      <div className="editor-header">
        <h2 className="editor-title">✉️ 写给未来的信</h2>
        <p className="editor-subtitle">封存此刻的心绪，让时光为你送达</p>
      </div>

      <div className="editor-paper">
        <div className="emotion-selector">
          <label className="emotion-label">选择此刻的心情</label>
          <div className="emotion-options">
            {EMOTIONS.map((e) => (
              <button
                key={e}
                className={`emotion-btn ${emotion === e ? 'active' : ''}`}
                style={{
                  borderColor: emotion === e ? EMOTION_COLORS[e] : 'transparent',
                  backgroundColor: emotion === e ? `${EMOTION_COLORS[e]}20` : 'transparent',
                }}
                onClick={() => setEmotion(e)}
                type="button"
              >
                <span className="emotion-icon">{EMOTION_ICONS[e]}</span>
                <span className="emotion-text">{EMOTION_LABELS[e]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="editor-field">
          <label className="field-label">信件标题</label>
          <input
            type="text"
            className="title-input"
            placeholder="给这封信起个名字..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
          />
        </div>

        <div className="editor-field">
          <label className="field-label">信件内容</label>
          <textarea
            ref={editorRef}
            className="content-textarea"
            placeholder="亲爱的未来的我..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            maxLength={5000}
          />
          <div className="char-count">{content.length} / 5000</div>
        </div>

        <div className="editor-field">
          <label className="field-label">📅 投递日期（1-10年后）</label>
          <input
            type="date"
            className="date-input"
            value={deliverAt}
            onChange={(e) => setDeliverAt(e.target.value)}
            min={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            max={new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
          />
        </div>

        <div className="editor-field">
          <label className="field-label">📧 通知邮箱（可选）</label>
          <input
            type="email"
            className="email-input"
            placeholder="到期后通知你回来查看"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {showValidation && error && (
          <div className="editor-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          className="seal-btn"
          onClick={handleSubmit}
          disabled={submitting || success}
          type="button"
        >
          {submitting ? (
            <span className="btn-loading">封存中...</span>
          ) : success ? (
            <span className="btn-success">✨ 胶囊已封存！</span>
          ) : (
            <span className="btn-default">🔒 封存时光胶囊</span>
          )}
        </button>
      </div>

      {success && (
        <div className="success-overlay">
          <div className="success-card">
            <div className="success-icon">📭</div>
            <h3>时光胶囊已封存！</h3>
            <p>你的信将在 {engine.formatDate(deliverAt)} 送达</p>
            <p className="success-hint">请妥善保存你的访问令牌</p>
          </div>
        </div>
      )}
    </div>
  );
};
