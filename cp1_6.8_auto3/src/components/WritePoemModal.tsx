import { useState } from 'react';
import { X, Feather } from 'lucide-react';
import { useOceanStore } from '@/store/oceanStore';

export default function WritePoemModal() {
  const { writeModalOpen, setWriteModalOpen, addPoem } = useOceanStore();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const maxLen = 140;

  if (!writeModalOpen) return null;

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    addPoem(trimmed, title.trim() || undefined);
    setContent('');
    setTitle('');
    setWriteModalOpen(false);
  };

  const handleClose = () => {
    setContent('');
    setTitle('');
    setWriteModalOpen(false);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card write-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>
          <X size={18} />
        </button>
        <h2 className="modal-title">
          <Feather size={20} />
          投一封诗笺
        </h2>
        <div className="write-field">
          <label className="write-label">诗题（选填）</label>
          <input
            className="write-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 20))}
            placeholder="给诗起个名字..."
            maxLength={20}
          />
        </div>
        <div className="write-field">
          <label className="write-label">诗意</label>
          <textarea
            className="write-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, maxLen))}
            placeholder="写下你的短诗..."
            maxLength={maxLen}
            rows={5}
          />
          <div className={`char-count ${content.length >= maxLen ? 'char-limit' : ''}`}>
            {content.length} / {maxLen}
          </div>
        </div>
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={!content.trim()}
        >
          投入海洋
        </button>
      </div>
    </div>
  );
}
