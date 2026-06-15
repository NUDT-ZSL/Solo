import React, { useState, useEffect, useRef } from 'react';
import { reverseGeocode, EMOJI_PRESETS } from '../utils/geoUtils';
import type { NodeSavePayload } from '../types';

interface ModalProps {
  lat: number;
  lng: number;
  onSave: (data: NodeSavePayload) => void;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ lat, lng, onSave, onClose }) => {
  const [photoUrl, setPhotoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('加载中...');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    reverseGeocode(lat, lng).then(setAddress);
  }, [lat, lng]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('仅支持 JPG/PNG 格式');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    reader.onload = () => {
      setUploadProgress(100);
      setTimeout(() => setUploading(false), 300);
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleEmoji = (emoji: string) => {
    setSelectedEmojis((prev) => {
      if (prev.includes(emoji)) return prev.filter((e) => e !== emoji);
      if (prev.length >= 5) return prev;
      return [...prev, emoji];
    });
  };

  const handleSave = () => {
    if (!description.trim()) {
      alert('请输入描述');
      return;
    }
    onSave({
      photoUrl,
      description: description.trim(),
      address,
      date,
      emojiTags: selectedEmojis,
    });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>添加旅行节点</h3>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.photoSection}>
            {photoUrl ? (
              <img src={photoUrl} alt="预览" style={styles.preview} />
            ) : (
              <div
                style={styles.uploadArea}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div style={styles.progressContainer}>
                    <div
                      style={{
                        ...styles.progressBar,
                        width: `${uploadProgress}%`,
                      }}
                    />
                    <span style={styles.progressText}>{uploadProgress}%</span>
                  </div>
                ) : (
                  <span style={styles.uploadHint}>
                    点击上传照片 (JPG/PNG, ≤10MB)
                  </span>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>地点</label>
            <input type="text" value={address} readOnly style={styles.input} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>描述 ({description.length}/300)</label>
            <textarea
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= 300) setDescription(e.target.value);
              }}
              style={styles.textarea}
              rows={3}
              placeholder="记录这段旅行的故事..."
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>表情标签 (最多5个)</label>
            <div style={styles.emojiGrid}>
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  style={{
                    ...styles.emojiBtn,
                    ...(selectedEmojis.includes(emoji)
                      ? styles.emojiBtnActive
                      : {}),
                  }}
                  onClick={() => toggleEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <button style={styles.saveBtn} onClick={handleSave}>
            保存节点
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
  },
  modal: {
    borderRadius: 16,
    background: 'rgba(42, 59, 76, 0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    width: 420,
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    color: '#eee',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  title: {
    margin: 0,
    color: '#f0c27a',
    fontSize: 16,
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#ccc',
    fontSize: 18,
    cursor: 'pointer',
    padding: '2px 8px',
    borderRadius: 6,
    transition: 'background 200ms, color 200ms',
  },
  body: {
    padding: 20,
  },
  photoSection: {
    marginBottom: 16,
  },
  preview: {
    width: '100%',
    height: 180,
    objectFit: 'cover',
    borderRadius: 12,
  },
  uploadArea: {
    width: '100%',
    height: 120,
    border: '2px dashed rgba(255,255,255,0.25)',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'border-color 200ms, background 200ms',
    background: 'rgba(30,30,36,0.3)',
  },
  uploadHint: {
    color: '#bbb',
    fontSize: 13,
  },
  progressContainer: {
    width: '80%',
    position: 'relative',
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    background: 'linear-gradient(90deg, #1a3a5c, #2dd4a8)',
    borderRadius: 4,
    transition: 'width 100ms linear',
  },
  progressText: {
    display: 'block',
    color: '#f0c27a',
    fontSize: 12,
    marginTop: 6,
    fontWeight: 500,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    display: 'block',
    color: '#ddd',
    fontSize: 12,
    marginBottom: 5,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(30,30,36,0.6)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#eee',
    fontSize: 13,
    boxSizing: 'border-box',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(30,30,36,0.6)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#eee',
    fontSize: 13,
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
  },
  emojiGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  emojiBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.15)',
    background: 'rgba(30,30,36,0.5)',
    cursor: 'pointer',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 200ms',
  },
  emojiBtnActive: {
    borderColor: '#f0c27a',
    background: 'rgba(240,194,122,0.25)',
    transform: 'scale(1.1)',
  },
  saveBtn: {
    width: '100%',
    padding: '10px 0',
    background: 'linear-gradient(135deg, #f0c27a, #d4a054)',
    border: 'none',
    borderRadius: 10,
    color: '#1e1e24',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    transition: 'transform 200ms, box-shadow 200ms',
    marginTop: 8,
  },
};

export default Modal;
