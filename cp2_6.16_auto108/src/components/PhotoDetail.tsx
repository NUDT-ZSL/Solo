import { useState, useEffect } from 'react';
import { X, Pencil } from 'lucide-react';
import type { Photo } from '../types';
import { SmellWaveCanvas } from './SmellWaveCanvas';
import { usePhotoData } from '../hooks/usePhotoData';

const PRESET_TAGS = ['花香', '木香', '甜香', '辛香', '草香'];
const MAX_DESC_LENGTH = 60;

interface PhotoDetailProps {
  photo: Photo;
  onClose: () => void;
  onUpdated?: (photo: Photo) => void;
}

export function PhotoDetail({ photo, onClose, onUpdated }: PhotoDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(photo.smellDescription);
  const [selectedTags, setSelectedTags] = useState<string[]>(photo.smellTags);
  const { updatePhotoSmell } = usePhotoData();

  useEffect(() => {
    setDescription(photo.smellDescription);
    setSelectedTags(photo.smellTags);
  }, [photo]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_DESC_LENGTH) {
      setDescription(value);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;

    const updated = await updatePhotoSmell(photo.id, {
      smellDescription: description.trim(),
      smellTags: selectedTags,
    });

    if (updated) {
      onUpdated?.(updated);
      setIsEditing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            maxHeight: 'calc(85vh - 60px)',
            overflow: 'hidden',
          }}
          className="detail-layout"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fffaf0',
              padding: '24px',
              overflow: 'hidden',
            }}
          >
            <img
              src={photo.imageUrl}
              alt={photo.title}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              }}
            />
          </div>

          <div
            style={{
              padding: '28px 32px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  marginBottom: '12px',
                  fontSize: '24px',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                }}
              >
                {photo.title}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedTags.map((tag, idx) => (
                  <span key={idx} className="smell-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--color-form-bg)',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-light)',
                  marginBottom: '8px',
                  fontWeight: 500,
                }}
              >
                气味描述
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '15px',
                  lineHeight: 1.7,
                  color: 'var(--color-text)',
                }}
              >
                {description}
              </p>
            </div>

            <div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-light)',
                  marginBottom: '10px',
                  fontWeight: 500,
                }}
              >
                气味波动 · 移动鼠标试试
              </div>
              <SmellWaveCanvas />
            </div>

            <button
              className="btn-primary"
              onClick={() => setIsEditing(true)}
              style={{ alignSelf: 'flex-start', gap: '8px' }}
            >
              <Pencil size={16} />
              编辑气味
            </button>
          </div>
        </div>

        {isEditing && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsEditing(false);
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(26, 26, 46, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div
              style={{
                width: '90%',
                maxWidth: '480px',
                backgroundColor: 'var(--color-form-bg)',
                borderRadius: '16px',
                padding: '28px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  marginBottom: '20px',
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                }}
              >
                编辑气味
              </h3>

              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    marginBottom: '8px',
                  }}
                >
                  气味描述
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="输入气味描述..."
                  value={description}
                  onChange={handleDescriptionChange}
                  style={{ fontFamily: 'inherit' }}
                />
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '12px',
                    color:
                      description.length >= MAX_DESC_LENGTH
                        ? '#dc2626'
                        : 'var(--color-text-light)',
                    marginTop: '6px',
                  }}
                >
                  {description.length}/{MAX_DESC_LENGTH}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    marginBottom: '10px',
                  }}
                >
                  预设标签
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {PRESET_TAGS.map((tag) => (
                    <button
                      key={tag}
                      className={`preset-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setIsEditing(false)}>
                  取消
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={!description.trim()}
                  style={
                    !description.trim()
                      ? { opacity: 0.5, cursor: 'not-allowed' }
                      : undefined
                  }
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @media (max-width: 768px) {
            .detail-layout {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
