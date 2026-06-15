import { useState, useRef } from 'react';
import { MusicStyle, MUSIC_STYLES } from '../types';
import { useCapsuleContext } from '../context/CapsuleContext';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

const CreateForm = () => {
  const { handleCreate, setView } = useCapsuleContext();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [musicStyle, setMusicStyle] = useState<MusicStyle>('calm');
  const [unlockDate, setUnlockDate] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date();
  const minDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const maxDate = new Date(today.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (images.length + files.length > 3) {
      setError('最多只能上传3张图片');
      return;
    }

    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`不支持的文件格式 "${file.name}"，仅允许 JPG 和 PNG 格式`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`文件 "${file.name}" 超过5MB限制（当前 ${(file.size / 1024 / 1024).toFixed(1)}MB）`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      validFiles.push(file);
    }

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages((prev) => [...prev, event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError('');
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    const selectedDate = new Date(unlockDate);
    if (selectedDate < minDate || selectedDate > maxDate) {
      setError('解锁日期必须在1天到10年之间');
      return;
    }

    handleCreate({
      title: title.trim(),
      content: content.trim(),
      images,
      musicStyle,
      unlockDate: selectedDate.toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-group">
        <label className="form-label">胶囊标题 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="给这封信取个标题吧..."
          maxLength={50}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label className="form-label">解锁日期 *</label>
        <input
          type="datetime-local"
          value={unlockDate}
          onChange={(e) => setUnlockDate(e.target.value)}
          min={formatDate(minDate)}
          max={formatDate(maxDate)}
          className="form-input"
          style={{ colorScheme: 'dark' }}
        />
        <div className="form-hint">可选范围：1天后 ~ 10年后</div>
      </div>

      <div className="form-group">
        <label className="form-label">音乐风格 *</label>
        <select
          value={musicStyle}
          onChange={(e) => setMusicStyle(e.target.value as MusicStyle)}
          className="form-select"
        >
          {(Object.keys(MUSIC_STYLES) as MusicStyle[]).map((key) => (
            <option key={key} value={key}>
              {MUSIC_STYLES[key].name}
            </option>
          ))}
        </select>
        <div className="style-tags">
          {(Object.keys(MUSIC_STYLES) as MusicStyle[]).map((key) => (
            <span
              key={key}
              className={`style-tag ${musicStyle === key ? '' : 'style-tag-inactive'}`}
              style={musicStyle === key ? {
                background: MUSIC_STYLES[key].gradient,
                color: '#1A1A2E',
                fontWeight: 600,
              } : undefined}
              onClick={() => setMusicStyle(key)}
            >
              {MUSIC_STYLES[key].name}
            </span>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">信件内容 *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你想对未来说的话..."
          rows={8}
          maxLength={2000}
          className="form-textarea"
        />
        <div className="form-hint-right">{content.length}/2000</div>
      </div>

      <div className="form-group" style={{ marginBottom: 32 }}>
        <label className="form-label">图片（最多3张，仅JPG/PNG，单张不超过5MB）</label>
        <div className="image-list">
          {images.map((img, index) => (
            <div key={index} className="image-thumb">
              <img src={img} alt={`图片${index + 1}`} />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="image-thumb-remove"
              >
                ✕
              </button>
            </div>
          ))}
          {images.length < 3 && (
            <label className="image-upload-zone">
              +
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
      </div>

      <div className="button-group">
        <button
          type="button"
          onClick={() => setView('list')}
          className="btn btn-ghost"
        >
          取消
        </button>
        <button
          type="submit"
          className="btn btn-primary"
        >
          封存胶囊
        </button>
      </div>
    </form>
  );
};

export default CreateForm;
