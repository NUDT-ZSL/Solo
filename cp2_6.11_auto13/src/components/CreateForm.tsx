import { useState, useRef } from 'react';
import { MusicStyle, MUSIC_STYLES } from '../types';

interface CreateFormProps {
  onSubmit: (data: {
    title: string;
    content: string;
    images: string[];
    musicStyle: MusicStyle;
    unlockDate: string;
  }) => void;
  onCancel: () => void;
}

const CreateForm = ({ onSubmit, onCancel }: CreateFormProps) => {
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

    Array.from(files).forEach((file) => {
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

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      images,
      musicStyle,
      unlockDate: selectedDate.toISOString(),
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: 'rgba(255, 255, 255, 0.9)',
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
      {error && (
        <div
          style={{
            background: 'rgba(239, 83, 80, 0.2)',
            border: '1px solid rgba(239, 83, 80, 0.5)',
            color: '#EF5350',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <label style={labelStyle}>胶囊标题 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="给这封信取个标题吧..."
          maxLength={50}
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(100, 200, 255, 0.5)';
            e.target.style.boxShadow = '0 0 6px rgba(100, 200, 255, 0.5)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={labelStyle}>解锁日期 *</label>
        <input
          type="datetime-local"
          value={unlockDate}
          onChange={(e) => setUnlockDate(e.target.value)}
          min={formatDate(minDate)}
          max={formatDate(maxDate)}
          style={{ ...inputStyle, colorScheme: 'dark' }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(100, 200, 255, 0.5)';
            e.target.style.boxShadow = '0 0 6px rgba(100, 200, 255, 0.5)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.target.style.boxShadow = 'none';
          }}
        />
        <div
          style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginTop: '6px',
          }}
        >
          可选范围：1天后 ~ 10年后
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={labelStyle}>音乐风格 *</label>
        <select
          value={musicStyle}
          onChange={(e) => setMusicStyle(e.target.value as MusicStyle)}
          style={{
            ...inputStyle,
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 16px center',
            paddingRight: '40px',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(100, 200, 255, 0.5)';
            e.target.style.boxShadow = '0 0 6px rgba(100, 200, 255, 0.5)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.target.style.boxShadow = 'none';
          }}
        >
          {(Object.keys(MUSIC_STYLES) as MusicStyle[]).map((key) => (
            <option key={key} value={key} style={{ background: '#1A1A2E' }}>
              {MUSIC_STYLES[key].name}
            </option>
          ))}
        </select>
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {(Object.keys(MUSIC_STYLES) as MusicStyle[]).map((key) => (
            <span
              key={key}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                background:
                  musicStyle === key
                    ? MUSIC_STYLES[key].gradient
                    : 'rgba(255, 255, 255, 0.05)',
                color: musicStyle === key ? '#1A1A2E' : 'rgba(255, 255, 255, 0.7)',
                fontWeight: musicStyle === key ? '600' : '400',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onClick={() => setMusicStyle(key)}
            >
              {MUSIC_STYLES[key].name}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={labelStyle}>信件内容 *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你想对未来说的话..."
          rows={8}
          maxLength={2000}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: '160px',
            lineHeight: '1.6',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(100, 200, 255, 0.5)';
            e.target.style.boxShadow = '0 0 6px rgba(100, 200, 255, 0.5)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.target.style.boxShadow = 'none';
          }}
        />
        <div
          style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginTop: '6px',
            textAlign: 'right',
          }}
        >
          {content.length}/2000
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <label style={labelStyle}>
          图片（最多3张）
        </label>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {images.map((img, index) => (
            <div
              key={index}
              style={{
                position: 'relative',
                width: '100px',
                height: '100px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <img
                src={img}
                alt={`图片${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          ))}
          {images.length < 3 && (
            <label
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '8px',
                border: '2px dashed rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '28px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(100, 200, 255, 0.5)';
                e.currentTarget.style.color = 'rgba(100, 200, 255, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
              }}
            >
              +
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'flex-end',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'transparent',
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          取消
        </button>
        <button
          type="submit"
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          封存胶囊
        </button>
      </div>
    </form>
  );
};

export default CreateForm;
