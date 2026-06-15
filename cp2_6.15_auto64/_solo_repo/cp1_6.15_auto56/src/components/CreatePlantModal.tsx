import React, { useState } from 'react';
import { Plant } from '../types';
import { createPlant, CreatePlantRequest } from '../api';
import { useApp } from '../context/AppContext';
import RippleButton from './RippleButton';
import './components.css';

interface CreatePlantModalProps {
  activityId: string;
  onClose: () => void;
  onCreated: (plant: Plant) => void;
}

const CreatePlantModal: React.FC<CreatePlantModalProps> = ({ activityId, onClose, onCreated }) => {
  const [formData, setFormData] = useState<Omit<CreatePlantRequest, 'activityId'>>({
    name: '',
    variety: '',
    description: '',
    photoUrl: '',
    startPrice: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.variety.trim()) {
      showToast('请填写植物名称和品种', 'error');
      return;
    }
    if (formData.startPrice < 0 || formData.startPrice > 1000) {
      showToast('起拍价格必须在0至1000元之间', 'error');
      return;
    }
    setSubmitting(true);
    const res = await createPlant({
      ...formData,
      activityId,
      name: formData.name.trim(),
      variety: formData.variety.trim(),
      description: formData.description.trim(),
      photoUrl: formData.photoUrl.trim() || 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=300&h=300&fit=crop',
    });
    setSubmitting(false);
    if (res.success && res.data) {
      showToast('植物上架成功！', 'success');
      onCreated(res.data);
      onClose();
    } else {
      showToast(res.message || '上架失败', 'error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'startPrice' ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <div style={styles.backdrop} className="modal-backdrop" onClick={onClose}>
      <div
        style={styles.modal}
        className="modal-content"
        onClick={e => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h3 style={styles.title}>上架植物</h3>
          <button style={styles.closeButton} onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>植物名称 *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="请输入植物名称"
              style={styles.input}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>品种 *</label>
            <input
              type="text"
              name="variety"
              value={formData.variety}
              onChange={handleChange}
              placeholder="请输入品种"
              style={styles.input}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>描述</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="请输入植物描述"
              style={styles.textarea}
              rows={2}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>照片URL</label>
            <input
              type="url"
              name="photoUrl"
              value={formData.photoUrl}
              onChange={handleChange}
              placeholder="请输入照片链接（可选）"
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>起拍价格（0-1000元）*</label>
            <input
              type="number"
              name="startPrice"
              value={formData.startPrice}
              onChange={handleChange}
              min="0"
              max="1000"
              step="1"
              style={styles.input}
              required
            />
          </div>
          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={submitting}
            >
              取消
            </button>
            <RippleButton type="submit" disabled={submitting}>
              {submitting ? '上架中...' : '确认上架'}
            </RippleButton>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 'var(--border-radius)',
    width: '100%',
    maxWidth: '500px',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #f0f0f0',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
    transition: 'color 0.2s ease',
  },
  form: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'border-color 0.2s ease',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '10px 24px',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default CreatePlantModal;
