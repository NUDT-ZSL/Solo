import { useState, useRef, useEffect } from 'react';

interface Props {
  onSubmit: (title: string, content: string) => void;
  onCancel: () => void;
}

export default function AddCardForm({ onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      titleRef.current?.focus();
      return;
    }
    onSubmit(title.trim(), content.trim());
  };

  return (
    <form className="add-card-form" onSubmit={handleSubmit}>
      <input
        ref={titleRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="卡片标题（必填）"
        maxLength={100}
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="详细内容（可选）"
        maxLength={500}
      />
      <div className="add-card-actions">
        <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
          添加
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} style={{ padding: '8px 16px' }}>
          取消
        </button>
      </div>
    </form>
  );
}
