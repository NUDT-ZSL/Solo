import { useState } from 'react';
import { AVAILABLE_COLORS, type AvailableColor } from '../types';
import { createCard } from '../api';

interface CardCreatorProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CardCreator({ open, onClose, onCreated }: CardCreatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<AvailableColor>('#4ECDC4');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const reset = () => {
    setTitle('');
    setDescription('');
    setColor('#4ECDC4');
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;
    setLoading(true);
    try {
      await createCard({
        title: title.trim(),
        description: description.trim(),
        color,
      });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      console.error('创建卡片失败', err);
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">创建新点子</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">标题</label>
            <input
              className="form-input"
              type="text"
              placeholder="简短地描述你的点子..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              maxLength={80}
            />
          </div>
          <div className="form-group">
            <label className="form-label">详细描述</label>
            <textarea
              className="form-textarea"
              placeholder="展开说说这个点子的具体内容..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="form-group">
            <label className="form-label">颜色标签</label>
            <div className="color-picker">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-btn ${color === c ? 'selected' : ''}`}
                  style={{
                    background: c,
                    ['--btn-color' as any]: c,
                  }}
                  onClick={() => setColor(c)}
                  aria-label={`选择颜色 ${c}`}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="submit-btn"
            disabled={!title.trim() || loading}
          >
            {loading ? '创建中...' : '创建点子'}
          </button>
        </form>
      </div>
    </div>
  );
}
