import { useState, useRef } from 'react';
import type { MusicStyle } from '../types';
import { MUSIC_STYLE_LABELS, MUSIC_STYLE_GRADIENTS } from '../types';

interface Props {
  onCreated: () => void;
}

export default function CreateForm({ onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [musicStyle, setMusicStyle] = useState<MusicStyle>('calm');
  const [unlockDate, setUnlockDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = 3 - images.length;
    const filesToProcess = Array.from(files).slice(0, remaining);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setImages(prev => [...prev, result].slice(0, 3));
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('请输入胶囊标题');
      return;
    }
    if (!content.trim()) {
      setError('请输入胶囊内容');
      return;
    }
    if (!unlockDate) {
      setError('请选择解锁日期');
      return;
    }

    const unlockAt = new Date(unlockDate).getTime();
    const now = Date.now();
    const minUnlock = now + 24 * 60 * 60 * 1000;
    const maxUnlock = now + 10 * 365 * 24 * 60 * 60 * 1000;

    if (unlockAt < minUnlock || unlockAt > maxUnlock) {
      setError('解锁日期需在1天至10年之间');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          images,
          musicStyle,
          unlockAt
        })
      });

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '创建失败，请重试');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const gradient = MUSIC_STYLE_GRADIENTS[musicStyle];

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <label className="form-label">胶囊标题</label>
        <input
          type="text"
          className="form-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="给这封信起个名字..."
          maxLength={50}
        />
      </div>

      <div className="form-section">
        <label className="form-label">
          解锁日期
          <span className="label-hint">（1天至10年后）</span>
        </label>
        <input
          type="date"
          className="form-input"
          value={unlockDate}
          onChange={e => setUnlockDate(e.target.value)}
          min={minDate}
          max={maxDate}
        />
      </div>

      <div className="form-section">
        <label className="form-label">
          音乐风格
          <span
            className="style-preview"
            style={{ background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)` }}
          />
        </label>
        <select
          className="form-input"
          value={musicStyle}
          onChange={e => setMusicStyle(e.target.value as MusicStyle)}
        >
          {(Object.keys(MUSIC_STYLE_LABELS) as MusicStyle[]).map(style => (
            <option key={style} value={style}>{MUSIC_STYLE_LABELS[style]}</option>
          ))}
        </select>
      </div>

      <div className="form-section">
        <label className="form-label">
          图片（最多3张）
          <span className="label-hint">（{images.length}/3）</span>
        </label>
        <div className="image-upload-area">
          {images.map((img, i) => (
            <div key={i} className="image-preview">
              <img src={img} alt={`preview-${i}`} />
              <button type="button" className="remove-image" onClick={() => removeImage(i)}>×</button>
            </div>
          ))}
          {images.length < 3 && (
            <label className="image-upload-btn">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <span>+ 添加图片</span>
            </label>
          )}
        </div>
      </div>

      <div className="form-section">
        <label className="form-label">信件内容</label>
        <textarea
          className="form-textarea"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="写下你想对未来说的话..."
          rows={8}
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? '投递中...' : '🚀 投递时间胶囊'}
      </button>
    </form>
  );
}
