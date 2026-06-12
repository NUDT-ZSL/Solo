import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { capsuleApi } from '../services/api';
import { useAppContext } from '../App';

interface CapsuleFormProps {
  lat: number;
  lng: number;
  onClose: () => void;
}

const CapsuleForm: React.FC<CapsuleFormProps> = ({ lat, lng, onClose }) => {
  const { refreshCapsules } = useAppContext();
  const [message, setMessage] = useState('');
  const [unlockTime, setUnlockTime] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const minDate = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16);
  };

  const maxDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 16);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('仅支持 JPG 和 PNG 格式');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleSubmit = async () => {
    if (!message.trim()) {
      alert('请输入留言内容');
      return;
    }
    if (!unlockTime) {
      alert('请选择解锁时间');
      return;
    }
    setLoading(true);
    try {
      await capsuleApi.create({
        lat,
        lng,
        message: message.trim(),
        unlock_time: unlockTime,
        image: image || undefined,
      });
      await refreshCapsules();
      onClose();
    } catch (e) {
      console.error(e);
      alert('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="capsule-form-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={overlayStyle}
      >
        <motion.div
          key="capsule-form-panel"
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.8 }}
          transition={{
            type: 'spring',
            damping: 18,
            stiffness: 260,
            mass: 0.8,
            duration: 0.4,
          }}
          onClick={(e) => e.stopPropagation()}
          style={panelStyle}
        >
          <div style={handleBar} />
          <div style={headerRowStyle}>
            <h3 style={titleStyle}>埋下时间胶囊</h3>
            <button onClick={onClose} style={topCloseBtnStyle} aria-label="关闭">×</button>
          </div>
          <div style={coordStyle}>
            📍 坐标: {lat.toFixed(4)}, {lng.toFixed(4)}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              留言内容
              <span style={{ float: 'right', color: '#999', fontWeight: 400, fontSize: 12 }}>
                {message.length}/200
              </span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 200))}
              placeholder="写下你想留给未来的话..."
              style={textareaStyle}
              maxLength={200}
              autoFocus
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>解锁时间</label>
            <input
              type="datetime-local"
              value={unlockTime}
              onChange={(e) => setUnlockTime(e.target.value)}
              min={minDate()}
              max={maxDate()}
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              可设范围：1小时后 ~ 1年内
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>图片（可选，JPG/PNG，≤5MB）</label>
            {imagePreview ? (
              <div style={previewRowStyle}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                  style={previewWrapStyle}
                >
                  <img src={imagePreview} alt="预览" style={previewStyle} />
                  <button
                    onClick={removeImage}
                    style={removeBtnStyle}
                    title="删除图片"
                    aria-label="删除图片"
                  >
                    ×
                  </button>
                  <div style={previewNameStyle}>
                    {image?.name?.slice(0, 16)}
                    {image?.name && image.name.length > 16 ? '...' : ''}
                  </div>
                </motion.div>
                <button onClick={removeImage} style={removeAltBtnStyle}>
                  删除图片
                </button>
              </div>
            ) : (
              <label style={uploadBtnStyle}>
                <span style={{ fontSize: 18, marginRight: 8 }}>📷</span>
                选择图片上传
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          <div style={btnRowStyle}>
            <button onClick={onClose} style={cancelBtnStyle} disabled={loading}>
              取消
            </button>
            <button onClick={handleSubmit} style={submitBtnStyle} disabled={loading}>
              {loading ? (
                <>
                  <span style={spinnerStyle} />
                  提交中...
                </>
              ) : (
                <>⏳ 埋下胶囊</>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(3px)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'flex-end',
};

const panelStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#fff',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: '14px 24px 30px',
  boxShadow: '0 -8px 40px rgba(0,0,0,0.35), 0 -1px 0 rgba(255,255,255,0.6) inset',
  maxHeight: '88vh',
  overflowY: 'auto',
};

const handleBar: React.CSSProperties = {
  width: 44,
  height: 5,
  backgroundColor: '#e0e0e6',
  borderRadius: 3,
  margin: '0 auto 10px',
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 4,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 700,
  color: '#1a1a2e',
};

const topCloseBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#f0f0f5',
  color: '#888',
  fontSize: 20,
  lineHeight: '30px',
  cursor: 'pointer',
  padding: 0,
};

const coordStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#666',
  marginTop: 2,
  marginBottom: 18,
  padding: '8px 12px',
  backgroundColor: '#f5f6fa',
  borderRadius: 8,
};

const fieldStyle: React.CSSProperties = {
  marginBottom: 18,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: '#2a2a3e',
  marginBottom: 8,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 100,
  padding: 12,
  fontSize: 14,
  border: '1.5px solid #e0e0e6',
  borderRadius: 10,
  resize: 'vertical',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  lineHeight: 1.6,
  outline: 'none',
  backgroundColor: '#fafafc',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 12,
  fontSize: 14,
  border: '1.5px solid #e0e0e6',
  borderRadius: 10,
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  outline: 'none',
  backgroundColor: '#fafafc',
};

const uploadBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '14px 20px',
  backgroundColor: '#f5f6fa',
  border: '2px dashed #c0c0d0',
  borderRadius: 10,
  fontSize: 14,
  color: '#555',
  cursor: 'pointer',
  fontWeight: 500,
  transition: 'all 0.2s',
  width: '100%',
  justifyContent: 'center',
  boxSizing: 'border-box',
};

const previewRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 14,
  flexWrap: 'wrap',
};

const previewWrapStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const previewStyle: React.CSSProperties = {
  width: 108,
  height: 108,
  objectFit: 'cover',
  borderRadius: 10,
  border: '2px solid #e8e8f0',
};

const previewNameStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#777',
  marginTop: 4,
  maxWidth: 108,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const removeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: -8,
  right: -8,
  width: 26,
  height: 26,
  borderRadius: '50%',
  border: '2px solid #fff',
  backgroundColor: '#ff4757',
  color: '#fff',
  fontSize: 18,
  lineHeight: '20px',
  cursor: 'pointer',
  padding: 0,
  fontWeight: 700,
  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
};

const removeAltBtnStyle: React.CSSProperties = {
  marginTop: 40,
  padding: '8px 14px',
  border: '1px solid #ffd0d4',
  backgroundColor: '#fff5f6',
  color: '#ff4757',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
  fontWeight: 500,
};

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  marginTop: 26,
};

const cancelBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '13px 0',
  borderRadius: 10,
  border: '1.5px solid #e0e0e6',
  backgroundColor: '#fff',
  fontSize: 15,
  color: '#555',
  cursor: 'pointer',
  fontWeight: 500,
  transition: 'all 0.15s',
};

const submitBtnStyle: React.CSSProperties = {
  flex: 1.2,
  padding: '13px 0',
  borderRadius: 10,
  border: 'none',
  backgroundColor: '#3742fa',
  fontSize: 15,
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  transition: 'all 0.15s',
  boxShadow: '0 4px 14px rgba(55,66,250,0.35)',
};

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 16,
  height: 16,
  border: '2px solid rgba(255,255,255,0.35)',
  borderTopColor: '#fff',
  borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
};

export default CapsuleForm;
