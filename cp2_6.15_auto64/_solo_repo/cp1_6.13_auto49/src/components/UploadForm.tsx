
import { useState, useRef, useEffect } from 'react';
import type { Gradient } from '../data/demoGradients';

interface UploadFormProps {
  allTags: string[];
  onSubmit: (gradient: Omit<Gradient, 'id' | 'likes' | 'liked' | 'comments'>) => void;
  onClose: () => void;
}

export default function UploadForm({ allTags, onSubmit, onClose }: UploadFormProps) {
  const [color1, setColor1] = useState('#667eea');
  const [color2, setColor2] = useState('#764ba2');
  const [angle, setAngle] = useState(135);
  const [name, setName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = allTags.filter(
    (tag) => tag.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(tag)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleAddTag = (tag?: string) => {
    const tagToAdd = (tag || tagInput).trim();
    if (tagToAdd && !tags.includes(tagToAdd) && tags.length < 5) {
      setTags([...tags, tagToAdd]);
      setTagInput('');
    }
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string } = {};
    if (!name.trim()) {
      newErrors.name = '请输入作品名称';
    }
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSubmit({
        name: name.trim(),
        color1,
        color2,
        angle,
        tags,
      });
    }
  };

  const previewGradient = `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.27)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '24px',
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          boxShadow: '0 20px 60px rgba(239, 68, 68, 0.15)',
          padding: '32px',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '32px',
            height: '32px',
            border: 'none',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(8px)',
            color: '#4b5563',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ×
        </button>

        <h2
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#1f2937',
            marginBottom: '24px',
          }}
        >
          上传渐变作品
        </h2>

        <div
          style={{
            width: '100%',
            height: '160px',
            borderRadius: '12px',
            background: previewGradient,
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          }}
        />

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#4b5563',
                marginBottom: '10px',
              }}
            >
              选择颜色
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <input
                    type="color"
                    value={color1}
                    onChange={(e) => setColor1(e.target.value)}
                    style={{
                      width: '140px',
                      height: '140px',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      margin: '-10px',
                      backgroundColor: 'transparent',
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#6b7280',
                    fontFamily: 'monospace',
                    fontWeight: 500,
                  }}
                >
                  {color1}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <input
                    type="color"
                    value={color2}
                    onChange={(e) => setColor2(e.target.value)}
                    style={{
                      width: '140px',
                      height: '140px',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      margin: '-10px',
                      backgroundColor: 'transparent',
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#6b7280',
                    fontFamily: 'monospace',
                    fontWeight: 500,
                  }}
                >
                  {color2}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#4b5563',
                marginBottom: '10px',
              }}
            >
              渐变方向 ({angle}°)
            </label>
            <select
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#4b5563',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <option key={deg} value={deg}>
                  {deg}°
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#4b5563',
                marginBottom: '10px',
              }}
            >
              作品名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="给你的作品起个名字"
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                border: `1px solid ${errors.name ? '#ef4444' : '#e5e7eb'}`,
                borderRadius: '8px',
                fontSize: '14px',
                color: '#4b5563',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                outline: 'none',
              }}
            />
            {errors.name && (
              <div
                style={{
                  marginTop: '6px',
                  fontSize: '12px',
                  color: '#ef4444',
                }}
              >
                {errors.name}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '28px', position: 'relative' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#4b5563',
                marginBottom: '10px',
              }}
            >
              标签（最多5个）
            </label>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                minHeight: '44px',
              }}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#4b5563',
                  }}
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      fontSize: '16px',
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder={tags.length === 0 ? '输入标签，回车添加' : ''}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#4b5563',
                  padding: '4px',
                  backgroundColor: 'transparent',
                }}
              />
            </div>

            {showSuggestions && filteredSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  zIndex: 10,
                  maxHeight: '150px',
                  overflowY: 'auto',
                }}
              >
                {filteredSuggestions.map((tag) => (
                  <div
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#4b5563',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    #{tag}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              height: '44px',
              border: 'none',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              cursor: 'pointer',
            }}
          >
            保存作品
          </button>
        </form>
      </div>
    </div>
  );
}
