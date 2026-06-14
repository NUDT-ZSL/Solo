import { useState, useEffect } from 'react';
import type { Beer, BeerInput } from '../types';
import { BEER_STYLES, FLAVOR_TAGS } from '../types';
import { api } from '../utils/http';

interface BeerFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingBeer: Beer | null;
  onSuccess: () => void;
}

const emptyForm: BeerInput = {
  name: '',
  brewery: '',
  style: 'IPA',
  abv: 5,
  rating: 0,
  notes: '',
  flavorTags: []
};

export default function BeerForm({ isOpen, onClose, editingBeer, onSuccess }: BeerFormProps) {
  const [formData, setFormData] = useState<BeerInput>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingBeer) {
      setFormData({
        name: editingBeer.name,
        brewery: editingBeer.brewery,
        style: editingBeer.style,
        abv: editingBeer.abv,
        rating: editingBeer.rating,
        notes: editingBeer.notes,
        flavorTags: editingBeer.flavorTags
      });
    } else {
      setFormData(emptyForm);
    }
  }, [editingBeer, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleAbvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, abv: parseFloat(e.target.value) }));
  };

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      flavorTags: prev.flavorTags.includes(tag)
        ? prev.flavorTags.filter(t => t !== tag)
        : [...prev.flavorTags, tag]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.brewery || formData.rating === 0) {
      alert('请填写完整信息并选择评分');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBeer) {
        await api.updateBeer(editingBeer.id, formData);
      } else {
        await api.createBeer(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('提交失败:', err);
      alert('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>
            {editingBeer ? '编辑啤酒' : '添加新啤酒'}
          </h2>
          <button style={styles.closeButton} onClick={onClose} className="close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>啤酒名称 *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={styles.input}
              placeholder="输入啤酒名称"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>酒厂 *</label>
            <input
              type="text"
              name="brewery"
              value={formData.brewery}
              onChange={handleChange}
              style={styles.input}
              placeholder="输入酒厂名称"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>啤酒风格 *</label>
            <select
              name="style"
              value={formData.style}
              onChange={handleChange}
              style={styles.select}
            >
              {BEER_STYLES.map(style => (
                <option key={style} value={style}>{style}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              ABV 酒精浓度: <span style={styles.abvValue}>{formData.abv.toFixed(1)}%</span>
            </label>
            <input
              type="range"
              name="abv"
              min="0"
              max="15"
              step="0.5"
              value={formData.abv}
              onChange={handleAbvChange}
              style={styles.slider}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>评分 *</label>
            <div style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  className="star-btn"
                  style={{
                    ...styles.starButton,
                    color: star <= formData.rating ? '#f59e0b' : '#4a4a6a'
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>品鉴笔记</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              style={styles.textarea}
              placeholder="记录你的品鉴感受..."
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>风味标签</label>
            <div style={styles.tagsContainer}>
              {FLAVOR_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  style={{
                    ...styles.tagButton,
                    background: formData.flavorTags.includes(tag) ? '#f59e0b' : '#0f3460',
                    color: formData.flavorTags.includes(tag) ? '#ffffff' : '#a0a0b0'
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelButton} className="cancel-btn">
              取消
            </button>
            <button type="submit" disabled={isSubmitting} style={styles.submitButton} className="submit-btn">
              {isSubmitting ? '提交中...' : editingBeer ? '保存修改' : '添加啤酒'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    animation: 'fadeIn 0.2s ease'
  },
  modal: {
    width: '480px',
    maxWidth: '100%',
    maxHeight: '90vh',
    background: '#16213e',
    borderRadius: '20px',
    padding: '32px',
    overflowY: 'auto',
    animation: 'scaleIn 0.2s ease'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: '#ffffff',
    margin: 0
  },
  closeButton: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: '#a0a0b0',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'color 0.2s ease, background 0.2s ease'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff'
  },
  input: {
    padding: '12px 16px',
    background: '#0f3460',
    border: '1px solid #2a2a5a',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  select: {
    padding: '12px 16px',
    background: '#0f3460',
    border: '1px solid #2a2a5a',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease'
  },
  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '8px',
    background: '#0f3460',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer'
  },
  abvValue: {
    color: '#f59e0b',
    fontWeight: 600
  },
  starsContainer: {
    display: 'flex',
    gap: '8px'
  },
  starButton: {
    fontSize: '32px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    transition: 'transform 0.2s ease, color 0.2s ease'
  },
  textarea: {
    padding: '12px 16px',
    background: '#0f3460',
    border: '1px solid #2a2a5a',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    height: '120px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease'
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  tagButton: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    background: '#2a2a5a',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  },
  submitButton: {
    flex: 2,
    padding: '14px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, opacity 0.2s ease'
  }
};

const css = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  input:focus, select:focus, textarea:focus {
    border-color: #f59e0b !important;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #f59e0b;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
    transition: transform 0.2s ease;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }
  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #f59e0b;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
  }
  .star-btn:hover {
    transform: scale(1.2);
  }
  .close-btn:hover {
    color: #ffffff;
    background: rgba(255,255,255,0.1);
  }
  .cancel-btn:hover {
    background: #3a3a7a;
  }
  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
  }
  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = css;
document.head.appendChild(styleSheet);
