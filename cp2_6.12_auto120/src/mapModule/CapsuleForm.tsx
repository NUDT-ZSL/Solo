import React, { useState, useRef } from 'react';
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
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={overlayStyle}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          style={panelStyle}
        >
          <div style={handleBar} />
          <h3 style={titleStyle}>埋下时间胶囊</h3>
          <div style={coordStyle}>
            坐标: {lat.toFixed(4)}, {lng.toFixed(4)}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>留言内容（{message.length}/200）</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 200))}
              placeholder="写下你想留给未来的话..."
              style={textareaStyle}
              maxLength={200}
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
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>图片（可选，JPG/PNG，≤5MB）</label>
            {imagePreview ? (
              <div style={previewWrapStyle}>
                <img src={imagePreview} alt="preview" style={previewStyle} onClick={removeImage} />
                <button onClick={removeImage} style={removeBtnStyle}>×</button>
              </div>
            ) : (
              <label style={uploadBtnStyle}>
                选择图片
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
            <button onClick={onClose} style={cancelBtnStyle} disabled={loading}>取消</button>
            <button onClick={handleSubmit} style={submitBtnStyle} disabled={loading}>
              {loading ? '提交中...' : '埋下胶囊'}
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
  backgroundColor: 'rgba(0,0,0,0.5)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'flex-end',
};

const panelStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#fff',
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  padding: '20px 24px 32px',
  boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
  maxHeight: '85vh',
  overflowY: 'auto',
};

const handleBar: React.CSSProperties = {
  width: 40,
  height: 4,
  backgroundColor: '#ddd',
  borderRadius: 2,
  margin: '0 auto 16px',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 600,
  color: '#1a1a2e',
};

const coordStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#666',
  marginTop: 4,
  marginBottom: 16,
};

const fieldStyle: React.CSSProperties = {
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 500,
  color: '#333',
  marginBottom: 6,
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 90,
  padding: 10,
  fontSize: 14,
  border: '1px solid #ddd',
  borderRadius: 8,
  resize: 'vertical',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  fontSize: 14,
  border: '1px solid #ddd',
  borderRadius: 8,
  boxSizing: 'border-box',
};

const uploadBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '10px 18px',
  backgroundColor: '#f0f0f5',
  border: '1px dashed #999',
  borderRadius: 8,
  fontSize: 14,
  color: '#555',
  cursor: 'pointer',
};

const previewWrapStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-block',
};

const previewStyle: React.CSSProperties = {
  width: 100,
  height: 100,
  objectFit: 'cover',
  borderRadius: 8,
  cursor: 'pointer',
};

const removeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: -8,
  right: -8,
  width: 24,
  height: 24,
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#ff4757',
  color: '#fff',
  fontSize: 16,
  lineHeight: '24px',
  cursor: 'pointer',
  padding: 0,
};

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  marginTop: 24,
};

const cancelBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 0',
  borderRadius: 10,
  border: '1px solid #ddd',
  backgroundColor: '#fff',
  fontSize: 15,
  color: '#555',
  cursor: 'pointer',
};

const submitBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 0',
  borderRadius: 10,
  border: 'none',
  backgroundColor: '#3742fa',
  fontSize: 15,
  color: '#fff',
  fontWeight: 500,
  cursor: 'pointer',
};

export default CapsuleForm;
