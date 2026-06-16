import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Artwork } from '../data/mockData';

interface CommissionFormProps {
  artwork: Artwork;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CommissionForm({ artwork, onClose, onSuccess }: CommissionFormProps) {
  const addCommission = useStore((state) => state.addCommission);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState(1500);
  const [deadline, setDeadline] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !deadline) return;
    addCommission({
      artworkId: artwork.id,
      artworkTitle: artwork.title,
      description,
      budget,
      deadline
    });
    onSuccess();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content commission-form" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>发起委托</h2>
        <div className="form-artwork-preview">
          <img src={artwork.thumbnail} alt={artwork.title} />
          <div>
            <p className="preview-title">{artwork.title}</p>
            <p className="preview-author">by {artwork.author.name}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>项目描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请详细描述您的创作需求、风格偏好、使用场景等..."
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>
              预算范围: <span className="budget-value">¥{budget}</span>
            </label>
            <input
              type="range"
              min={200}
              max={5000}
              step={100}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="budget-slider"
            />
            <div className="slider-labels">
              <span>¥200</span>
              <span>¥5000</span>
            </div>
          </div>
          <div className="form-group">
            <label>截止日期</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-primary">
              提交委托
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
